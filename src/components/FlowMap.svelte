<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { feature } from 'topojson-client';
  
  // 1. 导入数据
  import fundingData from '../data/state_funding.json';
  
  // 2. Props
  let { step = 0 } = $props();

  // 3. 状态
  let width = $state(1000);
  let height = $state(600);
  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  let simulation;

  // 4. 投影设置
  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  // 5. 初始化
  onMount(async () => {
    // 加载地图
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = feature(us, us.objects.states).features;

    // 处理数据
    const processedNodes = [];
    const processedArcs = [];

    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);

      if (source && target) {
        // --- 节点数据 ---
        processedNodes.push({
          ...d,
          // 初始位置严格等于投影坐标
          x: source[0], 
          y: source[1],
          homeX: source[0],
          homeY: source[1],
          targetX: target[0],
          targetY: target[1],
          // 调整半径大小，确保能盖住线头
          r: Math.sqrt(d.amount) / 40 + 2 
        });

        // --- 连线数据 (二次贝塞尔曲线) ---
        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // 控制点：让弧线稍微拱起
        const midX = (source[0] + target[0]) / 2;
        const midY = (source[1] + target[1]) / 2 - dr * 0.15; 

        processedArcs.push({
          id: d.contributor_state, // 用于唯一标识
          // 路径指令
          path: `M${source[0]},${source[1]} Q${midX},${midY} ${target[0]},${target[1]}`,
          color: d.amount > 100000 ? '#D62728' : '#F4A582',
          strokeWidth: Math.max(1, Math.sqrt(d.amount) / 150)
        });
      }
    });

    nodes = processedNodes;
    arcs = processedArcs;

    // 启动模拟器
    simulation = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-1)) // 减弱排斥力，防止初始散开
      .force("collide", d3.forceCollide().radius(d => d.r + 0.5).strength(0.5))
      .on("tick", () => {
        nodes = [...nodes];
      });
  });

  // 6. 动画逻辑控制
  $effect(() => {
    if (!simulation) return;
    
    simulation.alpha(1).restart();

    if (step === 0) {
      // === 状态 0: 锁定在原点 ===
      // 使用极强的 strength(1) 强制归位，解决“对不齐”的问题
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));
    } else {
      // === 状态 1: 流向密歇根 ===
      // 放松归位力，开启目标引力
      simulation
        .force("x", d3.forceX(d => d.targetX).strength(0.08))
        .force("y", d3.forceY(d => d.targetY).strength(0.08));
    }
  });

</script>

<div class="map-container" bind:clientWidth={width}>
  <svg {width} {height} viewBox="0 0 960 600">
    
    <!-- 层级 1: 地图底图 -->
    <g class="map-layer">
      {#each usFeatures as feature}
        <path 
          d={pathGenerator(feature)} 
          fill="none" 
          stroke="#e0e0e0" 
          stroke-width="1.5"
        />
      {/each}
    </g>

    <!-- 层级 2: 连线 (Arcs) -->
    <!-- 放在圆圈下面，这样圆圈就能盖住线头 -->
    <g class="arc-layer">
      {#each arcs as arc}
        <!-- 
          pathLength="1" 是关键：
          它允许我们将 stroke-dasharray 设为 1 就代表全长，
          无需用 JS 计算像素长度。
        -->
        <path 
          d={arc.path}
          fill="none"
          stroke={arc.color}
          stroke-width={arc.strokeWidth}
          stroke-linecap="round"
          opacity="0.6"
          pathLength="1"
          class="flow-line"
          class:animate={step >= 1}
        />
      {/each}
    </g>

    <!-- 层级 3: 粒子 (Particles) -->
    <!-- 放在最后渲染，确保覆盖在连线之上 -->
    <g class="particle-layer">
      {#each nodes as node}
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={step === 0 ? "#377eb8" : "#D62728"}
          fill-opacity="1" 
          stroke="white"
          stroke-width="1"
          style="transition: fill 0.5s;"
        >
          <title>{node.contributor_state}: ${Math.round(node.amount).toLocaleString()}</title>
        </circle>
      {/each}
    </g>

    <!-- 标注: 密歇根 -->
    <circle cx={585} cy={190} r={4} fill="black" />
    <text x={600} y={195} font-size="14" font-weight="bold" fill="#333" stroke="white" stroke-width="3" paint-order="stroke">Michigan</text>

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

  /* === 线条生长动画 === */
  .flow-line {
    stroke-dasharray: 1; /* 全长为 1 */
    stroke-dashoffset: 1; /* 初始偏移 1，即完全隐藏 */
    transition: stroke-dashoffset 1.5s ease-in-out; /* 动画时间 */
  }

  /* 当添加 .animate 类时，偏移归零，线条画出 */
  .flow-line.animate {
    stroke-dashoffset: 0;
  }
</style>
