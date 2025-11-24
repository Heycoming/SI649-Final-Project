<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { feature } from 'topojson-client';
  import fundingData from '../data/state_funding.json';
  import miCountyData from '../data/county_funding.json';
  
  let { step = 0 } = $props();

  let width = $state(1000);
  let height = $state(600);
  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  let simulation;

  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  onMount(async () => {
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = feature(us, us.objects.states).features;

    let allNodes = [];
    const processedArcs = [];

    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);

      if (source && target) {
        allNodes.push({
          ...d,
          type: 'out-state',
          // 地图模式坐标
          homeX: source[0],
          homeY: source[1],
          mapTargetX: target[0],
          mapTargetY: target[1],
          // 初始位置
          x: source[0],
          y: source[1],
          r: Math.sqrt(d.amount) / 80 + 1.5
        });

        // 连线
        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const dr = Math.sqrt(dx * dx + dy * dy);
        const midX = (source[0] + target[0]) / 2;
        const midY = (source[1] + target[1]) / 2 - dr * 0.15; 

        processedArcs.push({
          id: d.contributor_state,
          path: `M${source[0]},${source[1]} Q${midX},${midY} ${target[0]},${target[1]}`,
          color: d.amount > 100000 ? '#D62728' : '#F4A582',
          strokeWidth: Math.max(1, Math.sqrt(d.amount) / 150)
        });
      }
    });

    // --- 处理 In-State (密歇根内部, 蓝色/紫色) ---
    // 初始位置设在密歇根中心，但在 Step 0-1 隐藏
    const miCenter = projection([-84.6, 44.3]); // 大致密歇根中心
    
miCountyData.forEach(d => {
      // 计算该县的投影坐标
      const coords = projection([d.lon, d.lat]);
      
      // 只有当坐标在投影范围内时才添加
      if (coords) {
        allNodes.push({
          ...d,
          type: 'in-state',
          // 使用实际地理坐标
          homeX: coords[0], 
          homeY: coords[1],
          mapTargetX: coords[0],
          mapTargetY: coords[1],
          // 初始位置也设为实际坐标
          x: coords[0],
          y: coords[1],
          r: Math.sqrt(d.total_amount) / 800 + 1.5
        });
      }
    });

    // === 2. 计算 Step 3 的柱状图位置 (Grid Layout) ===
    // 我们需要把节点分成两组，计算它们在柱子里的 x, y
    
    const calculatePillarPositions = (nodes, centerX, bottomY, colCount) => {
      // 按金额排序，大的在下面
      nodes.sort((a, b) => b.amount - a.amount);
      
      const spacing = 14; // 圆圈间距
      
      nodes.forEach((node, i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        
        // 计算偏移量，让柱子居中
        const xOffset = (col - (colCount - 1) / 2) * spacing;
        
        node.pillarX = centerX + xOffset;
        node.pillarY = bottomY - row * spacing;
      });
    };

    const outStateNodes = allNodes.filter(d => d.type === 'out-state');
    const inStateNodes = allNodes.filter(d => d.type === 'in-state');

    // 左柱子 (Out-state): x=350, 底部=550, 5列宽
    calculatePillarPositions(outStateNodes, 350, 550, 6);
    
    // 右柱子 (In-state): x=650, 底部=550, 5列宽
    calculatePillarPositions(inStateNodes, 650, 550, 6);

    nodes = allNodes;
    arcs = processedArcs;

    // === 3. 模拟器设置 ===
    simulation = d3.forceSimulation(nodes)
      .on("tick", () => {
        nodes = [...nodes];
      });
  });

  // === 4. 核心动画逻辑 ===
  $effect(() => {
    if (!simulation) return;
    
    simulation.alpha(1).restart();

    if (step === 0) {
      // Step 0: 地图 - 回到原点
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));
        
    } else if (step === 1) {

      simulation
        .force("x", d3.forceX(d => d.mapTargetX).strength(0.1))
        .force("y", d3.forceY(d => d.mapTargetY).strength(0.1));

    } else if (step === 2) {
      // Step 2 (即文案的第3步): 柱状图对比
      // 强制移动到 pillarX / pillarY
      simulation
        .force("x", d3.forceX(d => d.pillarX).strength(0.08))
        .force("y", d3.forceY(d => d.pillarY).strength(0.08));
    } else if (step === 3) {
  // === 4. 核心动画逻辑 ===
  $effect(() => {
    if (!simulation) return;
    
    simulation.alpha(1).restart();

    if (step === 0) {
      // Step 0: 初始状态
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));
        
    } else if (step === 1) {
      // Step 1: 地图模式 (红点飞入，蓝点显现)
      simulation
        .force("x", d3.forceX(d => d.mapTargetX).strength(0.1))
        .force("y", d3.forceY(d => d.mapTargetY).strength(0.1));

    } else if (step === 2) {
      // Step 2: 柱状图对比 (所有点去柱子)
      simulation
        .force("x", d3.forceX(d => d.pillarX).strength(0.08))
        .force("y", d3.forceY(d => d.pillarY).strength(0.08));

    } else if (step === 3) {
      // === 新增 Step 3: 回归密歇根 ===
      // 蓝点回到地图位置，红点位置无所谓（因为会被隐藏）
      simulation
        .force("x", d3.forceX(d => d.type === 'in-state' ? d.mapTargetX : d.pillarX).strength(0.1))
        .force("y", d3.forceY(d => d.type === 'in-state' ? d.mapTargetY : d.pillarY).strength(0.1));
    }
  });

    }
  });

</script>

<div class="map-container" bind:clientWidth={width}>
  <svg {width} {height} viewBox="0 0 960 600">
    
    <!-- 1. 地图层: Step 2 淡出，Step 3 回归(但只高亮密歇根) -->
    <g class="map-layer" style="opacity: {step === 2 ? 0 : 1}; transition: opacity 1s;">
      {#each usFeatures as feature}
        <!-- 
           Michigan 的 FIPS ID 是 "26"。
           逻辑：在 Step 3 时，如果不是密歇根，透明度设为 0.1 (淡化)，否则为 1。
           在其他 Step (0,1) 保持为 1。
        -->
        <path 
          d={pathGenerator(feature)} 
          fill="none" 
          stroke="#e0e0e0" 
          stroke-width="1.5"
          style="transition: opacity 1s;"
          opacity={step === 3 && feature.id !== '26' ? 0.1 : 1}
        />
      {/each}
    </g>

    <!-- 2. 连线层: 仅在 Step 1 显示 -->
    <g class="arc-layer" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 1s;">
      {#each arcs as arc}
        <path 
          d={arc.path}
          fill="none"
          stroke={arc.color}
          stroke-width={arc.strokeWidth}
          stroke-linecap="round"
          opacity="0.5"
          pathLength="1"
          class="flow-line"
          class:animate={step === 1}
        />
      {/each}
    </g>

    <!-- 3. 柱状图标签: 仅在 Step 2 显示 -->
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s;">
      <text x="350" y="580" text-anchor="middle" font-weight="bold" fill="#D62728">Out-of-State</text>
      <text x="350" y="600" text-anchor="middle" font-size="12" fill="#666">External Contributions</text>
      <text x="500" y="400" text-anchor="middle" font-size="20" font-weight="bold" fill="#ccc">VS</text>
      <text x="650" y="580" text-anchor="middle" font-weight="bold" fill="#2b8cbe">In-State (Michigan)</text>
      <text x="650" y="600" text-anchor="middle" font-size="12" fill="#666">Local Counties</text>
    </g>

    <!-- 4. 粒子层 -->
    <g class="particle-layer">
      {#each nodes as node}
        <!-- 
           透明度逻辑更新：
           1. 如果是 out-state (红点)：在 Step 3 隐藏 (opacity 0)。
           2. 如果是 in-state (蓝点)：在 Step 0 隐藏 (opacity 0)。
           3. 其他情况显示 (opacity 0.9)。
        -->
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={node.type === 'out-state' ? "#D62728" : "#2b8cbe"}
          stroke="white"
          stroke-width="0.5"
          style="transition: fill 0.5s, opacity 1s;"
          
          opacity={
            (node.type === 'out-state' && step === 3) ? 0 : 
            (node.type === 'in-state' && step < 1) ? 0 : 0.9
          }

          style:mix-blend-mode="multiply" 
        >
          <title>{node.name || node.contributor_state}: ${Math.round(node.amount || node.total_amount).toLocaleString()}</title>
        </circle>
      {/each}
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
  }

  .flow-line {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 1.5s ease-in-out;
  }

  .flow-line.animate {
    stroke-dashoffset: 0;
  }
</style>
