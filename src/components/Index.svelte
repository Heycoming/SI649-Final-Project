<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

  // 接收来自 +page.svelte 的数据
  let { data } = $props();
  
  // 管理当前滚动步骤
  let currentStep = $state(0);
</script>

<section class="layout-grid">
  <!-- 左侧：滚动叙事 -->
  <div class="scrolly-column">
    <Scrolly bind:value={currentStep}>
      <div class="step"><div class="card"><h2>1. 资金源头</h2><p>各州中心...</p></div></div>
      <div class="step"><div class="card"><h2>2. 资金注入</h2><p>流向密歇根...</p></div></div>
      <div class="step"><div class="card"><h2>3. 最终汇聚</h2><p>对比视图...</p></div></div>
      <div class="step"><div class="card"><h2>4. 聚焦密歇根</h2><p>县级分布...</p></div></div>
    </Scrolly>
  </div>

  <!-- 右侧：可视化组件 -->
  <div class="chart-column">
    <div class="sticky-wrapper">
      <!-- 将数据和 step 传给绘图组件 -->
      <FlowMap {data} step={currentStep} />
    </div>
  </div>
</section>

<style>
  .layout-grid { display: grid; grid-template-columns: 1fr 2.5fr; width: 100%; margin: 0; }
  .scrolly-column { position: relative; z-index: 10; padding: 0 1rem; padding-bottom: 20vh; background: rgba(255,255,255,0.8); backdrop-filter: blur(5px); }
  .step { height: 90vh; display: flex; align-items: center; justify-content: center; }
  .card { background: #fff; padding: 1.5rem; border: 1px solid #eee; border-left: 4px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.08); width: 100%; border-radius: 4px; }
  .chart-column { position: relative; background: white; }
  .sticky-wrapper { position: sticky; top: 0; height: 100vh; width: 100%; overflow: hidden; }
  @media (max-width: 768px) { .layout-grid { grid-template-columns: 1fr; } }
</style>
