<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';

  let { data, step } = $props();

  let miCountyData = $derived(data.miCountyData || []);
  let expenditureData = $derived(data.expenditureData || []);
  let usAtlas = $derived(data.usAtlas);

  let width = $state(960);
  let height = $state(600);
  
  let miFeatures = $state([]);
  let fundingNodes = $state([]);
  let expendNodes = $state([]);

  let colorFunding = d3.scaleSequential(d3.interpolateBlues);
  let colorExpend = d3.scaleSequential(d3.interpolateOranges);
  let rScale = d3.scaleSqrt().range([2, 25]);

  // 1. 定义投影（先不设置 translate，靠代码自动算）
  const projection = d3.geoAlbersUsa(); 
  const pathGenerator = d3.geoPath().projection(projection);

  onMount(() => {
    if (!usAtlas) return;

    // 2. 提取地图数据
    if (usAtlas.objects.counties) {
      const allCounties = topojson.feature(usAtlas, usAtlas.objects.counties).features;
      miFeatures = allCounties.filter(f => f.id.startsWith("26"));
    } else {
      console.error("❌ 依然报错？请确认 +page.js 加载的是 counties-10m.json");
      return;
    }

    // 3. 自动聚焦密歇根 (关键修复)
    // 创建一个临时的 GeoJSON 集合，让 D3 自动计算缩放和平移
    const miCollection = { type: "FeatureCollection", features: miFeatures };
    // fitExtent([[左上x, 左上y], [右下x, 右下y]], 地理数据)
    projection.fitExtent([[50, 50], [width - 50, height - 50]], miCollection);

    // 4. 设置比例尺
    const maxFund = d3.max(miCountyData, d => d.total_amount) || 0;
    // 注意：这里用你的 expenditureData
    const maxExp = d3.max(expenditureData, d => d.amount) || 0; 
    
    rScale.domain([0, Math.max(maxFund, maxExp)]);
    colorFunding.domain([0, maxFund]);
    colorExpend.domain([0, maxExp]);

    // 5. 生成节点
    const getPos = (d) => {
      if (d.lon && d.lat) {
        const p = projection([d.lon, d.lat]);
        if (p) return p;
      }
      // 如果没有经纬度，尝试用 ID 匹配地图中心
      const idStr = String(d.county_id || d.id); // 强转字符串匹配
      const feature = miFeatures.find(f => String(f.id) === idStr);
      if (feature) return pathGenerator.centroid(feature);
      return null;
    };

    fundingNodes = miCountyData.map(d => {
      const pos = getPos(d);
      if (!pos) return null;
      return { ...d, x: pos[0], y: pos[1], r: rScale(d.total_amount), color: colorFunding(d.total_amount) };
    }).filter(d => d);

    expendNodes = expenditureData.map(d => {
      const pos = getPos(d);
      if (!pos) return null;
      return { ...d, x: pos[0], y: pos[1], r: rScale(d.amount), color: colorExpend(d.amount) };
    }).filter(d => d);
  });

  // === 样式逻辑 ===
  let leftTransform = $derived(step >= 4 ? `translate(${-width * 0.22}, 0)` : `translate(0,0)`);
  let rightTransform = $derived(step >= 4 ? `translate(${width * 0.22}, 0)` : `translate(0,0)`);
  let rightOpacity = $derived(step >= 4 ? 1 : 0);
  let circleOpacity = $derived(step === 5 ? 0 : 0.8);
  let mapStrokeColor = $derived(step === 5 ? "white" : "#ddd");

  // 填充颜色逻辑 (Step 5)
  function getFill(feature, type) {
    if (step < 5) return "#f9f9f9"; 

    const fips = String(feature.id);
    let val = 0;
    let scale;

    if (type === 'funding') {
      const d = miCountyData.find(i => String(i.county_id || i.id) === fips);
      val = d ? d.total_amount : 0;
      scale = colorFunding;
    } else {
      const d = expenditureData.find(i => String(i.county_id || i.id) === fips);
      val = d ? d.amount : 0;
      scale = colorExpend;
    }
    return val > 0 ? scale(val) : "#eee";
  }
</script>

<div class="dual-container" bind:clientWidth={width} bind:clientHeight={height}>
  <svg width="100%" height="100%" viewBox="0 0 {width} {height}">
    
    <!-- 左侧图 -->
    <g style="transform: translate({width/2}px, {height/2}px) {leftTransform}; transition: transform 1s;">
      <g>
        {#each miFeatures as f}
          <path d={pathGenerator(f)} 
                fill={getFill(f, 'funding')} 
                stroke={mapStrokeColor} 
                stroke-width="0.5" 
                style="transition: fill 1s;" />
        {/each}
      </g>
      <g style="opacity: {circleOpacity}; transition: opacity 1s;">
        {#each fundingNodes as n}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} stroke="white" stroke-width="0.5" />
        {/each}
      </g>
      <text y={-height/2 + 40} text-anchor="middle" font-weight="bold" fill="#08519C">Funding Inflow</text>
    </g>

    <!-- 右侧图 -->
    <g style="transform: translate({width/2}px, {height/2}px) {rightTransform}; opacity: {rightOpacity}; transition: transform 1s, opacity 1s;">
      <g>
        {#each miFeatures as f}
          <path d={pathGenerator(f)} 
                fill={getFill(f, 'expenditure')} 
                stroke={mapStrokeColor} 
                stroke-width="0.5" 
                style="transition: fill 1s;" />
        {/each}
      </g>
      <g style="opacity: {circleOpacity}; transition: opacity 1s;">
        {#each expendNodes as n}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} stroke="white" stroke-width="0.5" />
        {/each}
      </g>
      <text y={-height/2 + 40} text-anchor="middle" font-weight="bold" fill="#E6550D">Expenditure</text>
    </g>

  </svg>
</div>

<style>
  .dual-container { width: 100%; height: 100vh; background: white; overflow: hidden; }
  circle { transition: r 0.5s; mix-blend-mode: multiply; pointer-events: none; }
  text { font-size: 1.2rem; font-family: sans-serif; }
</style>
