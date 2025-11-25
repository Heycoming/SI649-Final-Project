<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';
  
  // 接收 Props
  let { data, step = 0 } = $props();

  // 解构数据 ($derived 保证响应性)
  let fundingData = $derived(data.fundingData);
  let miCountyData = $derived(data.miCountyData);
  let usAtlas = $derived(data.usAtlas);

  // === 1. 基础设置 ===
  const baseWidth = 960, baseHeight = 600;
  let containerWidth = $state(960), containerHeight = $state(600);
  
  // === 2. 比例尺 ===
  let rScale = d3.scaleSqrt().range([4, 50]); 
  let wScale = d3.scaleSqrt().range([5, 30]); 
  let cScaleRed = d3.scaleSqrt().range(["#ED9C9C", "#D62728"]);
  let cScaleBlue = d3.scaleSqrt().range(["#C6DBEF", "#08519C"]);

  // === 3. 内部状态 ===
  let usFeatures = $state([]); 
  let nodes = $state([]), arcs = $state([]);       
  let isReady = $state(false);
  let simulation;
  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1);
  let miTarget = $state(null);
  let hoveredNode = $state(null), tooltipPos = $state({ x: 0, y: 0 });

  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);
  const centerLeft = { x: 300, y: 320 }, centerRight = { x: 700, y: 320 };

  // === 4. 初始化处理 ===
  onMount(() => {
    if (!usAtlas || !fundingData || !miCountyData) return;

    usFeatures = topojson.feature(usAtlas, usAtlas.objects.states).features;

    // 设置 Domains
    const maxFunding = d3.max(fundingData, d => d.amount) || 0;
    const maxCounty = d3.max(miCountyData, d => d.total_amount) || 0;
    rScale.domain([0, Math.max(maxFunding, maxCounty)]);
    wScale.domain([0, maxFunding]); 
    cScaleRed.domain([0, maxFunding]); 
    cScaleBlue.domain([0, maxCounty]); 

    let allNodes = [], processedArcs = [];

    // 处理 Out-State
    fundingData.forEach(d => {
      const s = projection([d.lon, d.lat]);
      const t = projection([d.dest_lon, d.dest_lat]);
      if (s && t) {
        const r = rScale(d.amount);
        allNodes.push({
          ...d, type: 'out-state',
          homeX: s[0], homeY: s[1], x: s[0], y: s[1],
          r: Math.max(3, r * 0.7), r_compare: r,
          formattedAmount: d3.format("$,.0f")(d.amount),
          color: cScaleRed(d.amount)
        });
        
        const midX = (s[0] + t[0]) / 2;
        const dx = t[0] - s[0], dy = t[1] - s[1];
        const midY = (s[1] + t[1]) / 2 - Math.sqrt(dx*dx + dy*dy) * 0.2;
        processedArcs.push({
          path: `M${s[0]},${s[1]} Q${midX},${midY} ${t[0]},${t[1]}`,
          color: cScaleRed(d.amount), strokeWidth: wScale(d.amount)
        });
      }
    });

    // 处理 In-State
    miCountyData.forEach(d => {
      const c = projection([d.lon, d.lat]);
      if (c) {
        const r = rScale(d.total_amount);
        allNodes.push({
          ...d, type: 'in-state',
          homeX: c[0], homeY: c[1], x: c[0], y: c[1],
          r_map: Math.max(2, r * 0.15), r_compare: r,
          formattedAmount: d3.format("$,.0f")(d.total_amount),
          color: cScaleBlue(d.total_amount)
        });
      }
    });

    nodes = allNodes;
    arcs = processedArcs;

    simulation = d3.forceSimulation(nodes)
      .alphaDecay(0.02)
      .on("tick", () => { nodes = [...nodes]; });

    isReady = true; 
  });

  // === 5. 缩放逻辑 ===
  $effect(() => {
    if (usFeatures.length > 0 && !miTarget) {
      const mi = usFeatures.find(f => f.id === "26");
      if (mi) {
        const b = pathGenerator.bounds(mi);
        const k = 0.85 / Math.max((b[1][0]-b[0][0])/baseWidth, (b[1][1]-b[0][1])/baseHeight);
        miTarget = { x: (b[0][0]+b[1][0])/2, y: (b[0][1]+b[1][1])/2, k };
      }
    }
  });

  $effect(() => {
    if (step === 3 && miTarget) {
      transformString = `translate(${baseWidth/2 - miTarget.k*miTarget.x}px, ${baseHeight/2 - miTarget.k*miTarget.y}px) scale(${miTarget.k})`;
      currentScale = miTarget.k;
    } else {
      transformString = "translate(0,0) scale(1)";
      currentScale = 1;
    }
  });

  // === 6. 物理引擎 ===
  $effect(() => {
    if (!isReady || !simulation) return;
    simulation.alpha(1).restart();
    
    const collide = d3.forceCollide().radius(d => getCurrentRadius(d, step) + 1.5).strength(0.8);
    simulation.force("x", null).force("y", null).force("collide", null);

    if (step === 0 || step === 1) {
      simulation.force("x", d3.forceX(d => d.homeX).strength(1)).force("y", d3.forceY(d => d.homeY).strength(1));
    } else if (step === 2) {
      simulation.force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : centerRight.x).strength(0.08))
                .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : centerRight.y).strength(0.08))
                .force("collide", collide);
    } else if (step === 3) {
      simulation.force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : d.homeX).strength(d => d.type === 'out-state' ? 0.08 : 0.8))
                .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : d.homeY).strength(d => d.type === 'out-state' ? 0.08 : 0.8));
    }
  });

  // === 辅助函数 ===
  function getCurrentRadius(n, s) { return (n.type === 'out-state' || s === 2) ? n.r_compare : n.r_map; }
  function getNodeOpacity(n, s) {
    if (s <= 1) return n.type === 'out-state' ? 0.95 : 0;
    if (s === 2) return 0.95;
    return n.type === 'in-state' ? 0.95 : 0;
  }
  function handleHover(e, n) { if (step !== 1) { hoveredNode = n; tooltipPos = { x: e.clientX+15, y: e.clientY+15 }; } }
</script>

<div class="map-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <svg width="100%" height="100%" viewBox="0 0 {baseWidth} {baseHeight}" preserveAspectRatio="xMidYMid meet">
    <g class="zoom-group" style="transform: {transformString};">
      <g class="map-layer">
        {#each usFeatures as f}
          <path d={pathGenerator(f)} fill="none" stroke="#e0e0e0" stroke-width="1.5" vector-effect="non-scaling-stroke" style="transition: opacity 1s;" opacity={step === 2 ? 0 : (step === 3 && f.id !== '26' ? 0.05 : 1)} />
        {/each}
      </g>
      <g class="arc-layer" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 1s;">
        {#each arcs as arc}
          <path d={arc.path} fill="none" stroke={arc.color} stroke-width={arc.strokeWidth} stroke-linecap="round" opacity="0.9" class="flow-line" class:animate={step === 1} vector-effect="non-scaling-stroke" />
        {/each}
      </g>
      <g class="particle-layer">
        {#each nodes as n}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <circle cx={n.x} cy={n.y} r={getCurrentRadius(n, step) / (step === 3 ? currentScale * 0.8 : 1)} fill={n.color} stroke="white" stroke-width={1.5 / (step === 3 ? currentScale : 1)} style="transition: fill 0.5s, opacity 1s, r 1s; cursor: pointer;" opacity={getNodeOpacity(n, step)} onmouseenter={(e) => handleHover(e, n)} onmousemove={(e) => handleHover(e, hoveredNode)} onmouseleave={() => hoveredNode = null} />
        {/each}
      </g>
    </g>
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
      <text x={centerLeft.x} y="520" text-anchor="middle" font-weight="bold" fill="#D62728" font-size="16">Out-of-State</text>
      <text x={centerRight.x} y="520" text-anchor="middle" font-weight="bold" fill="#08519C" font-size="16">In-State</text>
    </g>
  </svg>
  {#if hoveredNode}
    <div class="tooltip" style="top: {tooltipPos.y}px; left: {tooltipPos.x}px;">
      <strong>{hoveredNode.type === 'out-state' ? hoveredNode.contributor_state : hoveredNode.county}</strong><br/>{hoveredNode.formattedAmount}
    </div>
  {/if}
</div>

<style>
  .map-container { width: 100%; height: 100vh; position: relative; background: white; overflow: hidden; }
  .zoom-group { transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1); transform-origin: 0 0; will-change: transform; }
  .flow-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; transition: stroke-dashoffset 1.5s ease-in-out; }
  .flow-line.animate { stroke-dashoffset: 0; }
  .tooltip { position: fixed; background: rgba(255, 255, 255, 0.98); padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: none; font-size: 13px; color: #333; z-index: 100; transform: translate(0, -100%); }
</style>
