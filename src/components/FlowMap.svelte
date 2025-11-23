<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { feature } from 'topojson-client';
  import fundingData from '../data/state_funding.json';
  
  let { step = 0 } = $props();

  let width = $state(1000);
  let height = $state(600);
  let usFeatures = $state([]); 
  let nodes = $state([]);      
  let arcs = $state([]);       
  let simulation;

  // 投影设置：稍微放大一点 scale 以利用更多空间
  const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
  const pathGenerator = d3.geoPath().projection(projection);

  onMount(async () => {
    const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    usFeatures = feature(us, us.objects.states).features;

    const processedNodes = [];
    const processedArcs = [];

    fundingData.forEach(d => {
      const source = projection([d.lon, d.lat]);
      const target = projection([d.dest_lon, d.dest_lat]);

      if (source && target) {
        processedNodes.push({
          ...d,
          x: source[0], 
          y: source[1],
          homeX: source[0],
          homeY: source[1],
          targetX: target[0],
          targetY: target[1],
          r: Math.sqrt(d.amount) / 40 + 2 
        });

        // 弧线计算
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

    nodes = processedNodes;
    arcs = processedArcs;

    // === 修改 1: 移除碰撞力，允许重叠 ===
    simulation = d3.forceSimulation(nodes)
      // 移除 charge (排斥力) 和 collide (碰撞力)
      // 这样节点就会完全服从 x 和 y 的定位
      .on("tick", () => {
        nodes = [...nodes];
      });
  });

  $effect(() => {
    if (!simulation) return;
    
    simulation.alpha(1).restart();

    if (step === 0) {
      // === 状态 0: 严格归位 ===
      // strength(1) 是最大值，意味着"立刻去那里，不要犹豫"
      simulation
        .force("x", d3.forceX(d => d.homeX).strength(1))
        .force("y", d3.forceY(d => d.homeY).strength(1));
    } else {
      // === 状态 1: 流向目标 ===
      // 稍微降低一点 strength，让运动看起来平滑一点，而不是瞬移
      simulation
        .force("x", d3.forceX(d => d.targetX).strength(0.1))
        .force("y", d3.forceY(d => d.targetY).strength(0.1));
    }
  });

</script>

<div class="map-container" bind:clientWidth={width}>
  <svg {width} {height} viewBox="0 0 960 600">
    
    <!-- 地图底图 -->
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

    <!-- 连线层 -->
    <g class="arc-layer">
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
          class:animate={step >= 1}
        />
      {/each}
    </g>

    <!-- 粒子层 -->
    <g class="particle-layer">
      {#each nodes as node}
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={step === 0 ? "#377eb8" : "#D62728"}
          fill-opacity="0.9" 
          stroke="white"
          stroke-width="0.5"
          style="transition: fill 0.5s;"
          style:mix-blend-mode="multiply" 
        >
          <!-- mix-blend-mode: multiply 让重叠部分变深，更有数据感 -->
          <title>{node.contributor_state}: ${Math.round(node.amount).toLocaleString()}</title>
        </circle>
      {/each}
    </g>

    <!-- === 修改 3: 已移除 Michigan 黑色圆圈标记 === -->

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
