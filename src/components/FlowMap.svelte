<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';
  
  import fundingData from '../data/state_funding.json';
  import miCountyData from '../data/county_funding.json';
  
  let { step = 0 } = $props();

  const width = 1000;
  const height = 600;

  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  
  let isReady = $state(false);
  let simulation;

  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1);
  let miTarget = $state(null);

  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  const centerLeft = { x: 300, y: 320 };
  const centerRight = { x: 700, y: 320 };

  onMount(async () => {
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = topojson.feature(us, us.objects.states).features;

    let allNodes = [];
    const processedArcs = [];

    // 1. Out-State (红点)
    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);
      if (source && target) {
        allNodes.push({
          ...d,
          type: 'out-state',
          homeX: source[0], homeY: source[1],
          mapTargetX: target[0], mapTargetY: target[1],
          x: source[0], y: source[1], 
          r: Math.sqrt(d.amount) / 80 + 1.5 
        });
        
        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const dr = Math.sqrt(dx * dx + dy * dy);
        const midX = (source[0] + target[0]) / 2;
        const midY = (source[1] + target[1]) / 2 - dr * 0.15; 
        processedArcs.push({
          path: `M${source[0]},${source[1]} Q${midX},${midY} ${target[0]},${target[1]}`,
          color: d.amount > 100000 ? '#D62728' : '#F4A582',
          strokeWidth: Math.max(1, Math.sqrt(d.amount) / 150)
        });
      }
    });

    // 2. In-State (蓝点)
    miCountyData.forEach(d => {
      const coords = projection([d.lon, d.lat]);
      if (coords) {
        allNodes.push({
          ...d,
          type: 'in-state',
          homeX: coords[0], homeY: coords[1],
          mapTargetX: coords[0], mapTargetY: coords[1],
          x: coords[0], y: coords[1],
          r_map: Math.sqrt(d.total_amount) / 800 + 1.5,
          r_compare: Math.sqrt(d.total_amount) / 60 + 1.5
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

  // 缩放计算
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

  // === 物理引擎 ===
  $effect(() => {
    if (!isReady || !simulation) return;
    
    simulation.alpha(1).restart();

    // 【修改】动态计算碰撞半径
    // 在 Step 2 时，蓝点变大了，所以碰撞半径也要变大，否则会重叠
    const collide = d3.forceCollide()
      .radius(d => {
        if (d.type === 'in-state' && step === 2) return d.r_compare + 1; // Step 2 用大尺寸
        if (d.type === 'in-state') return d.r_map + 1; // 其他时候用小尺寸
        return d.r + 1; // 红点尺寸不变
      })
      .strength(0.8);

    // 清除旧力
    simulation.force("x", null).force("y", null).force("collide", null).force("charge", null);

    if (step === 0) {
      // Step 0: 红点在老家
      // 【修改】移除 collide，让红点自然重叠在经纬度中心
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));

    } else if (step === 1) {
      // Step 1: 连线展示，点不动
      // 【修改】同样移除 collide
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));

    } else if (step === 2) {
      // Step 2: 气泡聚类 (红蓝对比)
      // 【保留】这里需要 collide，否则球会缩成一个点
      simulation
        .force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : centerRight.x).strength(0.08))
        .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : centerRight.y).strength(0.08))
        .force("collide", collide);

    } else if (step === 3) {
      // Step 3: 聚焦密歇根
      
      // 红点：原地淡出 (保持 Step 2 的力)
      // 蓝点：弹射回 homeX
      
      // 【修改】这里也移除 collide，让蓝点回到县中心时也能自然重叠，不互相挤
      simulation
        .force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : d.homeX).strength(d => d.type === 'out-state' ? 0.08 : 0.8))
        .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : d.homeY).strength(d => d.type === 'out-state' ? 0.08 : 0.8));
    }
  });

  // === 辅助函数：获取当前应该显示的半径 ===
  function getCurrentRadius(node, currentStep) {
    if (node.type === 'out-state') {
      return node.r; // 红点始终如一
    }
    // 蓝点逻辑
    if (currentStep === 2) {
      return node.r_compare; // Step 2 变大
    }
    return node.r_map; // 其他时候 (Step 0, 1, 3) 变小
  }

  // === 透明度控制 ===
  function getNodeOpacity(node, currentStep) {
    if (currentStep === 0) return node.type === 'out-state' ? 0.9 : 0;
    if (currentStep === 1) return node.type === 'out-state' ? 0.9 : 0;
    if (currentStep === 2) return 0.9;
    if (currentStep === 3) return node.type === 'in-state' ? 0.9 : 0;
    return 0;
  }

</script>

<div class="map-container">
  <svg {width} {height} viewBox="0 0 {width} {height}">
    
    <g class="zoom-group" style="transform: {transformString};">
      <!-- 地图层 -->
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

      <!-- 连线层 -->
      <g class="arc-layer" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 1s;">
        {#each arcs as arc}
          <path 
            d={arc.path}
            fill="none"
            stroke={arc.color}
            stroke-width={arc.strokeWidth}
            stroke-linecap="round"
            opacity="0.5"
            class="flow-line"
            class:animate={step === 1}
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </g>

      <!-- 粒子层 -->
      <g class="particle-layer">
        {#each nodes as node}
          <circle
            cx={node.x}
            cy={node.y}
            
            r={getCurrentRadius(node, step) / (step === 3 ? currentScale * 0.6 : 1)}
            
            fill={node.type === 'out-state' ? "#D62728" : "#2b8cbe"}
            stroke="white"
            stroke-width={0.5 / (step === 3 ? currentScale : 1)}
            
            style="transition: fill 0.5s, opacity 1s, r 1s;"
            
            opacity={getNodeOpacity(node, step)}
            
            style:mix-blend-mode="multiply" 
          />
        {/each}
      </g>
    </g>

    <!-- 标签层 -->
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
      <text x={centerLeft.x} y="520" text-anchor="middle" font-weight="bold" fill="#D62728" font-size="16">Out-of-State</text>
      <text x={centerLeft.x} y="540" text-anchor="middle" font-size="14" fill="#666">External Contributions</text>
      
      <text x="480" y="320" text-anchor="middle" font-size="24" font-weight="bold" fill="#000" dy=".3em">VS</text>
      
      <text x={centerRight.x} y="520" text-anchor="middle" font-weight="bold" fill="#2b8cbe" font-size="16">In-State (Michigan)</text>
      <text x={centerRight.x} y="540" text-anchor="middle" font-size="14" fill="#666">Local Counties</text>
    </g>

  </svg>
</div>

<style>
  .map-container {
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
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
</style>
