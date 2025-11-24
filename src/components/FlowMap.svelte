<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';
  
  import fundingData from '../data/state_funding.json';
  import miCountyData from '../data/county_funding.json';
  
  let { step = 0 } = $props();

  // === 1. 响应式设置 ===
  const baseWidth = 960;
  const baseHeight = 600;
  
  let containerWidth = $state(960);
  let containerHeight = $state(600);

  // === 2. D3 Scales 定义 ===
  
  // A. 气泡半径
  let rScale = d3.scaleSqrt().range([4, 50]); 
  
  // B. 线条宽度
  let wScale = d3.scaleSqrt().range([5, 30]); 

  // C. 红色比例尺 (Out-State: Amount 越高，颜色越深)
  // 从 "浅粉色" 到 "深红色"
  let cScaleRed = d3.scaleSqrt().range(["#ED9C9C", "#D62728"]);

  // D. 蓝色比例尺 (In-State: Amount 越高，颜色越深)
  // 从 "浅蓝色" 到 "深蓝色"
  // 之前的固定色是 #2b8cbe，我们把它作为中间或较深的值
  let cScaleBlue = d3.scaleSqrt().range(["#C6DBEF", "#08519C"]);

  // 状态变量
  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  let isReady = $state(false);
  let simulation;

  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1);
  let miTarget = $state(null);

  let hoveredNode = $state(null);
  let tooltipPos = $state({ x: 0, y: 0 });

  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  const centerLeft = { x: 300, y: 320 };
  const centerRight = { x: 700, y: 320 };

  onMount(async () => {
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = topojson.feature(us, us.objects.states).features;

    const maxFunding = d3.max(fundingData, d => d.amount) || 0;
    const maxCounty = d3.max(miCountyData, d => d.total_amount) || 0;
    const globalMax = Math.max(maxFunding, maxCounty);

    // === 更新所有比例尺的 Domain ===
    rScale.domain([0, globalMax]);
    wScale.domain([0, maxFunding]); 
    
    // 分别设置颜色 Domain，确保各自内部对比度最大化
    cScaleRed.domain([0, maxFunding]); 
    cScaleBlue.domain([0, maxCounty]); 

    let allNodes = [];
    const processedArcs = [];

    // 1. Out-State (红点 - 动态颜色)
    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);
      
      if (source && target) {
        const radius = rScale(d.amount); 
        // 计算红色动态颜色
        const dynamicColor = cScaleRed(d.amount);

        allNodes.push({
          ...d,
          type: 'out-state',
          homeX: source[0], homeY: source[1],
          x: source[0], y: source[1], 
          r: Math.max(3, radius * 0.7), 
          r_compare: radius,            
          formattedAmount: d3.format("$,.0f")(d.amount),
          color: dynamicColor // <--- 红色
        });
        
        // 曲线路径
        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const dr = Math.sqrt(dx * dx + dy * dy);
        const midX = (source[0] + target[0]) / 2;
        const midY = (source[1] + target[1]) / 2 - dr * 0.2; 
        
        processedArcs.push({
          path: `M${source[0]},${source[1]} Q${midX},${midY} ${target[0]},${target[1]}`,
          color: dynamicColor, 
          strokeWidth: wScale(d.amount)
        });
      }
    });

    // 2. In-State (蓝点 - 动态颜色)
    miCountyData.forEach(d => {
      const coords = projection([d.lon, d.lat]);
      if (coords) {
        const radius = rScale(d.total_amount);
        // 计算蓝色动态颜色
        const dynamicColor = cScaleBlue(d.total_amount);

        allNodes.push({
          ...d,
          type: 'in-state',
          homeX: coords[0], homeY: coords[1],
          x: coords[0], y: coords[1],
          r_map: Math.max(2, radius * 0.15), 
          r_compare: radius,                 
          formattedAmount: d3.format("$,.0f")(d.total_amount),
          color: dynamicColor // <--- 蓝色 (现在也是动态的了)
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

  // === 缩放计算 ===
  $effect(() => {
    if (usFeatures.length > 0 && !miTarget) {
      const michigan = usFeatures.find(f => f.id === "26");
      if (michigan) {
        const bounds = pathGenerator.bounds(michigan);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = 0.85 / Math.max(dx / baseWidth, dy / baseHeight);
        miTarget = { x, y, k: scale };
      }
    }
  });

  $effect(() => {
    if (step === 3 && miTarget) {
      const tx = baseWidth / 2 - miTarget.k * miTarget.x;
      const ty = baseHeight / 2 - miTarget.k * miTarget.y;
      transformString = `translate(${tx}px, ${ty}px) scale(${miTarget.k})`;
      currentScale = miTarget.k;
    } else {
      transformString = "translate(0,0) scale(1)";
      currentScale = 1;
    }
  });

  // === 物理引擎 ===
  $effect(() => {
    if (!isReady || !simulation) return;
    
    simulation.alpha(1).restart();

    const collide = d3.forceCollide()
      .radius(d => {
        const r = getCurrentRadius(d, step);
        return r + 1.5; 
      })
      .strength(0.8);

    simulation.force("x", null).force("y", null).force("collide", null);

    if (step === 0 || step === 1) {
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));

    } else if (step === 2) {
      simulation
        .force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : centerRight.x).strength(0.08))
        .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : centerRight.y).strength(0.08))
        .force("collide", collide);

    } else if (step === 3) {
      simulation
        .force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : d.homeX).strength(d => d.type === 'out-state' ? 0.08 : 0.8))
        .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : d.homeY).strength(d => d.type === 'out-state' ? 0.08 : 0.8));
    }
  });

  function getCurrentRadius(node, currentStep) {
    if (node.type === 'out-state') return node.r_compare; 
    if (currentStep === 2) return node.r_compare;         
    return node.r_map;                                    
  }

  function getNodeOpacity(node, currentStep) {
    if (currentStep === 0 || currentStep === 1) return node.type === 'out-state' ? 0.95 : 0;
    if (currentStep === 2) return 0.95;
    if (currentStep === 3) return node.type === 'in-state' ? 0.95 : 0;
    return 0;
  }

  function handleMouseEnter(event, node) {
    if (step === 1) return; 
    hoveredNode = node;
    updateTooltipPos(event);
  }

  function handleMouseMove(event) {
    if (hoveredNode) updateTooltipPos(event);
  }

  function handleMouseLeave() {
    hoveredNode = null;
  }

  function updateTooltipPos(event) {
    tooltipPos = { x: event.clientX + 15, y: event.clientY + 15 };
  }

</script>

<div 
  class="map-container" 
  bind:clientWidth={containerWidth} 
  bind:clientHeight={containerHeight}
>
  <svg 
    width="100%" 
    height="100%" 
    viewBox="0 0 {baseWidth} {baseHeight}"
    preserveAspectRatio="xMidYMid meet"
  >
    <g class="zoom-group" style="transform: {transformString};">
      
      <!-- 1. 地图层 -->
      <g class="map-layer">
        {#each usFeatures as feature}
          <path 
            d={pathGenerator(feature)} 
            fill="none" 
            stroke="#e0e0e0" 
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
            style="transition: opacity 1s;"
            opacity={step === 2 ? 0 : (step === 3 && feature.id !== '26' ? 0.05 : 1)}
          />
        {/each}
      </g>

      <!-- 2. 连线层 -->
      <g class="arc-layer" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 1s;">
        {#each arcs as arc}
          <path 
            d={arc.path}
            fill="none"
            stroke={arc.color}
            stroke-width={arc.strokeWidth}
            stroke-linecap="round"
            opacity="0.9" 
            class="flow-line"
            class:animate={step === 1}
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </g>

      <!-- 3. 粒子层 -->
      <g class="particle-layer">
        {#each nodes as node}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <circle
            cx={node.x}
            cy={node.y}
            
            r={getCurrentRadius(node, step) / (step === 3 ? currentScale * 0.8 : 1)}
            
            fill={node.color} 
            
            stroke="white"
            stroke-width={1.5 / (step === 3 ? currentScale : 1)} 
            
            style="transition: fill 0.5s, opacity 1s, r 1s; cursor: pointer;"
            
            opacity={getNodeOpacity(node, step)}
            
            onmouseenter={(e) => handleMouseEnter(e, node)}
            onmousemove={handleMouseMove}
            onmouseleave={handleMouseLeave}
          />
        {/each}
      </g>
    </g>

    <!-- 标签层 -->
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
      <text x={centerLeft.x} y="520" text-anchor="middle" font-weight="bold" fill="#D62728" font-size="16">Out-of-State</text>
      <text x={centerLeft.x} y="540" text-anchor="middle" font-size="14" fill="#666">External Contributions</text>
      <text x="480" y="320" text-anchor="middle" font-size="24" font-weight="bold" fill="#000" dy=".3em">VS</text>
      <text x={centerRight.x} y="520" text-anchor="middle" font-weight="bold" fill="#08519C" font-size="16">In-State (Michigan)</text>
      <text x={centerRight.x} y="540" text-anchor="middle" font-size="14" fill="#666">Local Counties</text>
    </g>
  </svg>

  {#if hoveredNode}
    <div 
      class="tooltip" 
      style="top: {tooltipPos.y}px; left: {tooltipPos.x}px;"
    >
      <strong>{hoveredNode.type === 'out-state' ? hoveredNode.contributor_state : hoveredNode.county}</strong>
      <br/>
      Amount: {hoveredNode.formattedAmount}
    </div>
  {/if}
</div>

<style>
  .map-container {
    width: 100%;
    height: 100vh;
    position: relative;
    background: white;
    overflow: hidden;
  }
  .zoom-group {
    transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    transform-origin: 0 0;
    will-change: transform;
  }
  .flow-line {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    transition: stroke-dashoffset 1.5s ease-in-out;
  }
  .flow-line.animate {
    stroke-dashoffset: 0;
  }
  .tooltip {
    position: fixed;
    background: rgba(255, 255, 255, 0.98);
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    pointer-events: none;
    font-size: 13px;
    color: #333;
    z-index: 100;
    transform: translate(0, -100%);
  }
</style>
