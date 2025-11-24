<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as topojson from 'topojson-client';
  
  // 假设这是你的数据路径，请确保路径正确
  import fundingData from '../data/state_funding.json';
  import miCountyData from '../data/county_funding.json';
  
  let { step = 0 } = $props();

  // === 1. 定义固定画布尺寸 ===
  // 为了保证投影和缩放的绝对对齐，我们固定 SVG 内部坐标系
  const width = 1000;
  const height = 600;

  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  let simulation;

  // === 缩放相关的状态 ===
  let transformString = $state("translate(0,0) scale(1)");
  let currentScale = $state(1); // 用于反向缩小圆点半径
  let miTarget = $state(null);  // 存储密歇根的中心和缩放比例

  // 投影设置
  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  onMount(async () => {
    // 1. 加载地图
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = topojson.feature(us, us.objects.states).features;

    // 2. 处理节点数据 (保留你的原有逻辑)
    let allNodes = [];
    const processedArcs = [];

    // --- 处理 Out-State (红点) ---
    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);

      if (source && target) {
        allNodes.push({
          ...d,
          type: 'out-state',
          // 地图位置
          homeX: source[0],
          homeY: source[1],
          mapTargetX: target[0],
          mapTargetY: target[1],
          // 初始位置
          x: source[0],
          y: source[1],
          // 稍微调整一下半径计算，避免点太大
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

    // --- 处理 In-State (密歇根内部, 蓝点) ---
    miCountyData.forEach(d => {
      const coords = projection([d.lon, d.lat]);
      
      if (coords) {
        allNodes.push({
          ...d,
          type: 'in-state',
          // *** 关键：homeX 就是它在地图上的真实位置 ***
          homeX: coords[0], 
          homeY: coords[1],
          mapTargetX: coords[0],
          mapTargetY: coords[1],
          x: coords[0],
          y: coords[1],
          r: Math.sqrt(d.total_amount) / 800 + 1.5
        });
      }
    });

    // 3. 计算柱状图位置 (保留你的 Grid Layout)
    const calculatePillarPositions = (nodes, centerX, bottomY, colCount) => {
      nodes.sort((a, b) => b.amount - a.amount);
      const spacing = 14;
      nodes.forEach((node, i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const xOffset = (col - (colCount - 1) / 2) * spacing;
        node.pillarX = centerX + xOffset;
        node.pillarY = bottomY - row * spacing;
      });
    };

    const outStateNodes = allNodes.filter(d => d.type === 'out-state');
    const inStateNodes = allNodes.filter(d => d.type === 'in-state');

    calculatePillarPositions(outStateNodes, 350, 550, 6);
    calculatePillarPositions(inStateNodes, 650, 550, 6);

    nodes = allNodes;
    arcs = processedArcs;

    // 4. 启动模拟器
    simulation = d3.forceSimulation(nodes)
      .on("tick", () => { nodes = [...nodes]; });
  });

  // === 5. 计算密歇根的缩放参数 (Zoom Logic) ===
  $effect(() => {
    if (usFeatures.length > 0 && !miTarget) {
      // 找到密歇根 (ID 26)
      const michigan = usFeatures.find(f => f.id === "26");
      if (michigan) {
        const bounds = pathGenerator.bounds(michigan);
        const x0 = bounds[0][0], x1 = bounds[1][0];
        const y0 = bounds[0][1], y1 = bounds[1][1];
        
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        
        // 计算缩放倍数 (0.85 是留白系数)
        const scale = 0.85 / Math.max((x1 - x0) / width, (y1 - y0) / height);
        
        miTarget = { x: cx, y: cy, k: scale };
      }
    }
  });

  // === 6. 应用缩放变换 (Transform Logic) ===
  $effect(() => {
    if (step === 3 && miTarget) {
      // 公式：移到中心 -> 放大 -> 移回屏幕中心
      const tx = width / 2 - miTarget.k * miTarget.x;
      const ty = height / 2 - miTarget.k * miTarget.y;
      
      transformString = `translate(${tx}px, ${ty}px) scale(${miTarget.k})`;
      currentScale = miTarget.k;
    } else {
      transformString = "translate(0,0) scale(1)";
      currentScale = 1;
    }
  });

  // === 7. 力导向控制 ===
  $effect(() => {
    if (!simulation) return;
    
    simulation.alpha(1).restart();

    // 定义碰撞力 (防止点重叠)
    const collideForce = d3.forceCollide().radius(d => d.r + 1).strength(0.5);

    if (step === 0) {
      // Step 0: 初始状态
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1))
        .force("collide", collideForce);
        
    } else if (step === 1) {
      // Step 1: 连线显示
      simulation
        .force("x", d3.forceX(d => d.mapTargetX).strength(0.1))
        .force("y", d3.forceY(d => d.mapTargetY).strength(0.1))
        .force("collide", collideForce);

    } else if (step === 2) {
      // Step 2: 柱状图
      simulation
        .force("x", d3.forceX(d => d.pillarX).strength(0.1))
        .force("y", d3.forceY(d => d.pillarY).strength(0.1))
        .force("collide", collideForce); // 柱状图需要防重叠

    } else if (step === 3) {
      // === Step 3: 聚焦密歇根 ===
      // 1. 蓝点(In-state) 回到 homeX (真实地理位置)
      // 2. 红点(Out-state) 其实无所谓，因为会被隐藏，但也让它们回 homeX 好了
      // 3. ***关键***：strength(1) 强力吸附，并且移除 collide，允许重叠以保证位置精准
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1))
        .force("collide", null); 
    }
  });

</script>

<div class="map-container">
  <!-- viewBox 锁定为 1000x600，确保与 projection 一致 -->
  <svg {width} {height} viewBox="0 0 {width} {height}">
    
    <!-- 
      === Zoom Group === 
      包含所有需要一起缩放的元素：地图、连线、点。
      Labels 不需要缩放，所以放在外面。
    -->
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
            opacity="0.5"
            class="flow-line"
            class:animate={step === 1}
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </g>

      <!-- 4. 粒子层 -->
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
              (node.type === 'out-state' && step === 3) ? 0 : // Step 3 隐藏红点
              (node.type === 'in-state' && step < 1) ? 0 :   // Step 0 隐藏蓝点
              0.9
            }
            style:mix-blend-mode="multiply" 
          >
            <title>{node.contributor_state || 'Michigan'}: ${Math.round(node.amount || node.total_amount).toLocaleString()}</title>
          </circle>
        {/each}
      </g>

    </g> <!-- End Zoom Group -->

    <!-- 3. 柱状图标签 (放在 Zoom Group 外面，保持静止) -->
    <g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
      <text x="350" y="580" text-anchor="middle" font-weight="bold" fill="#D62728">Out-of-State</text>
      <text x="350" y="600" text-anchor="middle" font-size="12" fill="#666">External Contributions</text>
      <text x="500" y="400" text-anchor="middle" font-size="20" font-weight="bold" fill="#ccc">VS</text>
      <text x="650" y="580" text-anchor="middle" font-weight="bold" fill="#2b8cbe">In-State (Michigan)</text>
      <text x="650" y="600" text-anchor="middle" font-size="12" fill="#666">Local Counties</text>
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
    overflow: hidden; /* 防止放大时溢出 */
  }

  .zoom-group {
    /* 核心动画：平滑缩放 */
    transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    transform-origin: 0 0; /* 配合我们的 translate 计算 */
    will-change: transform;
  }

  .flow-line {
    stroke-dasharray: 1000; /* 稍微加大一点确保覆盖全长 */
    stroke-dashoffset: 1000;
    transition: stroke-dashoffset 1.5s ease-in-out;
  }

  .flow-line.animate {
    stroke-dashoffset: 0;
  }
</style>
