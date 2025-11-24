<script>
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import * as topojson from "topojson-client";

  let { step } = $props();

  const width = 960;
  const height = 600;
  
  let usFeatures = $state([]); // 州数据
  let miCounties = $state([]); // 密歇根县数据
  let nodes = $state([]);
  let arcs = $state([]);
  let simulation;

  // 缩放相关状态
  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1);
  let miTarget = $state(null);

  const projection = d3.geoAlbersUsa().scale(1200).translate([width / 2, height / 2]);
  const pathGenerator = d3.geoPath().projection(projection);

  onMount(async () => {
    // 1. 加载地图数据 (包含 Counties)
    const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json");
    
    // 提取州用于背景
    usFeatures = topojson.feature(us, us.objects.states).features;
    
    // 提取所有县，并筛选出密歇根的县 (FIPS code 以 '26' 开头)
    const allCounties = topojson.feature(us, us.objects.counties).features;
    miCounties = allCounties.filter(d => d.id.startsWith("26"));

    // 2. 生成节点数据
    const rawNodes = [];

    // A. Out-of-state (红点) - 依旧随机分布在全美
    for(let i=0; i<150; i++) {
      rawNodes.push({
        id: `out-${i}`, type: 'out-state', amount: Math.random() * 5000 + 1000,
        lon: -120 + Math.random() * 40, lat: 30 + Math.random() * 15
      });
    }

    // B. In-state (蓝点) - ***关键修改：绑定到具体的县***
    // 我们遍历密歇根的 83 个县，每个县生成 1-3 个点
    miCounties.forEach((county, index) => {
      // 计算该县的几何中心像素坐标 [x, y]
      const centroid = pathGenerator.centroid(county);
      
      // 如果地图数据有问题导致算不出中心，跳过
      if (!centroid || isNaN(centroid[0])) return;

      // 每个县生成 1 到 3 个点
      const count = 1 + Math.floor(Math.random() * 2); 
      
      for (let k = 0; k < count; k++) {
        rawNodes.push({
          id: `in-${county.id}-${k}`,
          type: 'in-state',
          amount: Math.random() * 3000 + 500,
          // 直接存储像素坐标，不再需要经纬度转换
          fixedX: centroid[0], 
          fixedY: centroid[1],
          // 添加一点点微小的随机抖动(Jitter)，否则所有点会完全重叠成一个点
          jitterX: (Math.random() - 0.5) * 5, 
          jitterY: (Math.random() - 0.5) * 5
        });
      }
    });

    // 3. 初始化节点对象
    nodes = rawNodes.map(d => {
      // 如果是红点，还需要算一下投影；如果是蓝点，已经有 fixedX 了
      let startX, startY;
      
      if (d.type === 'out-state') {
        const coords = projection([d.lon, d.lat]) || [width/2, height/2];
        startX = coords[0];
        startY = coords[1];
      } else {
        startX = d.fixedX + d.jitterX;
        startY = d.fixedY + d.jitterY;
      }

      return {
        ...d,
        // 地图上的归宿位置
        homeX: startX,
        homeY: startY,
        
        // 柱状图位置
        pillarX: d.type === 'out-state' ? 300 : 660,
        pillarY: 550 - Math.random() * 200,

        // 初始位置
        x: startX, y: startY,
        r: Math.sqrt(d.amount) / 10
      };
    });

    // 4. 生成连线
    const miCenter = projection([-84.5, 44.3]); 
    arcs = nodes.filter(d => d.type === 'out-state').map(d => {
      const source = [d.homeX, d.homeY];
      const dx = miCenter[0] - source[0], dy = miCenter[1] - source[1];
      const dr = Math.sqrt(dx * dx + dy * dy);
      return { path: `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${miCenter[0]},${miCenter[1]}`, color: "#D62728", strokeWidth: d.r / 2 };
    });

    // 5. 启动模拟
    simulation = d3.forceSimulation(nodes)
      .on("tick", () => { nodes = [...nodes]; });
  });

  // 计算密歇根缩放参数 (保持不变，因为逻辑是对的)
  $effect(() => {
    if (usFeatures.length > 0 && !miTarget) {
      const michigan = usFeatures.find(f => f.id === "26");
      if (michigan) {
        const bounds = pathGenerator.bounds(michigan);
        const cx = (bounds[0][0] + bounds[1][0]) / 2;
        const cy = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = 0.85 / Math.max((bounds[1][0] - bounds[0][0]) / width, (bounds[1][1] - bounds[0][1]) / height);
        miTarget = { x: cx, y: cy, k: scale };
      }
    }
  });

  // 更新 Transform (保持不变)
  $effect(() => {
    if (step === 3 && miTarget) {
      const tx = width / 2 - miTarget.k * miTarget.x;
      const ty = height / 2 - miTarget.k * miTarget.y;
      transformString = `translate(${tx}px, ${ty}px) scale(${miTarget.k})`;
      currentScale = miTarget.k;
    } else {
      transformString = "translate(0,0) scale(1)";
      currentScale = 1;
    }
  });

  // === 关键修改：力导向逻辑 ===
  $effect(() => {
    if (!simulation) return;
    
    // 每次状态改变都“加热”模拟器
    simulation.alpha(1).restart();

    // 定义碰撞力 (只在 Step 0,1,2 启用，Step 3 禁用)
    const collideForce = d3.forceCollide().radius(d => d.r + 1).strength(0.5);

    if (step === 2) {
      // 柱状图
      simulation
        .force("x", d3.forceX(d => d.pillarX).strength(0.15))
        .force("y", d3.forceY(d => d.pillarY).strength(0.15))
        .force("collide", collideForce); // 柱状图需要防重叠
    } 
    else if (step === 3) {
      // *** Step 3: 聚焦密歇根 ***
      simulation
        // 1. 强力吸附：strength(1) 意味着“立刻去那里，不要犹豫”
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1))
        
        // 2. ***移除碰撞力***：允许点重叠。
        // 如果不移除，Wayne County (底特律) 的点会因为太挤而被弹到旁边的县去。
        .force("collide", null); 
    } 
    else {
      // Step 0 & 1: 普通地图模式
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(0.3)) // 稍微弱一点，允许一点漂浮感
        .force("y", d3.forceY(d => d.homeY).strength(0.3))
        .force("collide", collideForce); // 避免太挤
    }
  });
</script>

<div class="map-container">
  <svg {width} {height} viewBox="0 0 {width} {height}">
    <g class="zoom-group" style="transform: {transformString};">
      
      <g class="layer-map">
        {#each usFeatures as feature}
          <path 
            d={pathGenerator(feature)} 
            fill="#f9f9f9" 
            stroke="#ccc" 
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            style="transition: opacity 1s; opacity: {step === 3 && feature.id !== '26' ? 0.1 : 1}"
          />
        {/each}
        
        <!-- 
           可选：在 Step 3 显示密歇根的县界线，增加细节感
           只有放大时才显示
        -->
        <g class="mi-counties" style="opacity: {step === 3 ? 1 : 0}; transition: opacity 1s;">
           {#each miCounties as county}
             <path 
               d={pathGenerator(county)}
               fill="none"
               stroke="#ddd"
               stroke-width="0.5"
               vector-effect="non-scaling-stroke"
             />
           {/each}
        </g>
      </g>

      <g class="layer-arcs" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 0.5s;">
        {#each arcs as arc}
          <path d={arc.path} fill="none" stroke={arc.color} stroke-width={arc.strokeWidth} opacity="0.3" vector-effect="non-scaling-stroke" />
        {/each}
      </g>

      <g class="layer-nodes">
        {#each nodes as node}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r / (step === 3 ? currentScale * 0.5 : 1)}
            fill={node.type === 'out-state' ? "#D62728" : "#2b8cbe"}
            stroke="white"
            stroke-width={1 / (step === 3 ? currentScale : 1)}
            style="transition: opacity 0.5s, r 1s;"
            opacity={
              (step === 3 && node.type === 'out-state') ? 0 : 
              (step === 0 && node.type === 'in-state') ? 0 : 0.8
            }
          />
        {/each}
      </g>
    </g>
    
    <g class="layer-labels" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 0.5s; pointer-events: none;">
      <text x="300" y="580" text-anchor="middle" fill="#D62728" font-weight="bold">Out-of-State</text>
      <text x="660" y="580" text-anchor="middle" fill="#2b8cbe" font-weight="bold">In-State</text>
    </g>
  </svg>
</div>

<style>
  .map-container {
    width: 100%;
    height: 100vh;
    background: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }
  .zoom-group {
    transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    transform-origin: 0 0;
    will-change: transform;
  }
</style>
