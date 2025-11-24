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
  let simulation;

  // 缩放相关
  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1);
  let miTarget = $state(null);

  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  // 定义 Step 2 的两个引力中心
  const centerLeft = { x: 300, y: 320 };
  const centerRight = { x: 700, y: 320 };

  onMount(async () => {
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = topojson.feature(us, us.objects.states).features;

    let allNodes = [];
    const processedArcs = [];

    // 1. Out-State
    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);
      if (source && target) {
        allNodes.push({
          ...d,
          type: 'out-state',
          homeX: source[0], homeY: source[1],
          mapTargetX: target[0], mapTargetY: target[1],
          x: source[0], y: source[1], // 初始位置
          r: Math.sqrt(d.amount) / 80 + 1.5
        });
        // 连线逻辑...
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

    // 2. In-State
    miCountyData.forEach(d => {
      const coords = projection([d.lon, d.lat]);
      if (coords) {
        allNodes.push({
          ...d,
          type: 'in-state',
          homeX: coords[0], homeY: coords[1],
          mapTargetX: coords[0], mapTargetY: coords[1],
          x: coords[0], y: coords[1],
          r: Math.sqrt(d.total_amount) / 800 + 1.5
        });
      }
    });

    nodes = allNodes;
    arcs = processedArcs;

    // 初始化模拟器，但先不设置具体的力，在 $effect 中动态设置
    simulation = d3.forceSimulation(nodes)
      .on("tick", () => { nodes = [...nodes]; });
  });

  // 缩放计算 (保持不变)
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

  // === 核心修改：Step 2 的物理模拟 ===
  $effect(() => {
    if (!simulation) return;
    
    // 每次状态改变，必须重启 alpha，否则模拟器是“冷”的，点不会动
    simulation.alpha(1).restart();

    // 基础碰撞力：保证点不重叠
    const collide = d3.forceCollide().radius(d => d.r + 1).strength(0.9);

    if (step === 0) {
      // Step 0: 回家
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1))
        .force("collide", collide)
        .force("charge", null); // 移除电荷力

    } else if (step === 1) {
      // Step 1: 连线
      simulation
        .force("x", d3.forceX(d => d.mapTargetX).strength(0.1))
        .force("y", d3.forceY(d => d.mapTargetY).strength(0.1))
        .force("collide", collide)
        .force("charge", null);

    } else if (step === 2) {
      // === Step 2: 动态气泡聚类 ===
      // 关键点：
      // 1. strength(0.06) 很小 -> 这是一个柔和的引力，允许点在中心附近晃动，而不是死死钉住
      // 2. charge(-3) -> 这是一个微弱的斥力，让点之间保持一点“呼吸感”，防止挤得太死
      // 3. collide -> 强力碰撞，这是形成圆球形状的关键
      
      simulation
        .force("x", d3.forceX(d => d.type === 'out-state' ? centerLeft.x : centerRight.x).strength(0.06))
        .force("y", d3.forceY(d => d.type === 'out-state' ? centerLeft.y : centerRight.y).strength(0.06))
        .force("collide", collide)
        .force("charge", d3.forceManyBody().strength(-3)); 

    } else if (step === 3) {
      // Step 3: 聚焦密歇根
      // 蓝点强力回归，红点去左边待着(反正看不见)
      simulation
        .force("x", d3.forceX(d => d.type === 'in-state' ? d.homeX : centerLeft.x).strength(1))
        .force("y", d3.forceY(d => d.type === 'in-state' ? d.homeY : centerLeft.y).strength(1))
        .force("collide", null) // 必须移除碰撞，否则地图上的点对不准
        .force("charge", null);
    }
  });

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
            r={node.r / (step === 3 ? currentScale * 0.6 : 1)}
            fill={node.type === 'out-state' ? "#D62728" : "#2b8cbe"}
            stroke="white"
            stroke-width={0.5 / (step === 3 ? currentScale : 1)}
            style="transition: fill 0.5s, opacity 1s, r 1s;"
            opacity={
              (node.type === 'out-state' && step === 3) ? 0 : 
              (node.type === 'in-state' && step < 1) ? 0 : 0.9
            }
            style:mix-blend-mode="multiply" 
          />
        {/each}
      </g>
    </g>

    <!-- 标签层 (Step 2 显示) -->
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
      <text x={centerLeft.x} y="480" text-anchor="middle" font-weight="bold" fill="#D62728" font-size="16">Out-of-State</text>
      <text x={centerLeft.x} y="500" text-anchor="middle" font-size="12" fill="#666">External Contributions</text>
      
      <text x="500" y="320" text-anchor="middle" font-size="24" font-weight="bold" fill="#ddd" dy=".3em">VS</text>
      
      <text x={centerRight.x} y="480" text-anchor="middle" font-weight="bold" fill="#2b8cbe" font-size="16">In-State (Michigan)</text>
      <text x={centerRight.x} y="500" text-anchor="middle" font-size="12" fill="#666">Local Counties</text>
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
