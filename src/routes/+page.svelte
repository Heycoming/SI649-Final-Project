<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

  let currentStep = $state(0);
</script>

<section class="layout-grid">
  
  <!-- 左侧：滚动叙事区 -->
  <div class="scrolly-column">
    <Scrolly bind:value={currentStep}>
      
      <!-- Step 0 -->
      <div class="step">
        <div class="card">
          <h2>1. 资金的源头</h2>
          <p>
            2024年大选期间，资金最初分散在美国各地。
            <br><br>
            <span class="legend-blue">● 蓝色圆点</span> 代表各州筹集的资金总额。此时，它们静静地停留在各自的州内。
          </p>
        </div>
      </div>

      <!-- Step 1 -->
      <div class="step">
        <div class="card">
          <h2>2. 决战密歇根</h2>
          <p>
            随着竞选白热化，资金开始流动。
            <br><br>
            <span class="legend-red">● 红色流向</span> 显示了数百万美元如何跨越州界，最终汇入关键摇摆州——密歇根。
            <br><br>
            注意看加州（CA）和纽约（NY）发出的粗壮线条，它们是主要的外部资金来源。
          </p>
        </div>
      </div>

      <!-- Step 2 (Spacer / Conclusion) -->
      <div class="step">
        <div class="card">
          <h2>3. 影响分析</h2>
          <p>这种外部资金的高度集中，意味着密歇根的选情在很大程度上受到了外州资本的影响...</p>
        </div>
      </div>

    </Scrolly>
  </div>

  <!-- 右侧：固定图表区 -->
  <div class="chart-column">
    <div class="sticky-wrapper">
      <FlowMap step={currentStep} />
    </div>
  </div>

</section>

<style>
  /* 整体布局：两列 Grid */
  .layout-grid {
    display: grid;
    grid-template-columns: 1fr 2fr; /* 左侧 1份宽，右侧 2份宽 */
    /* max-width: 1400px; */
    margin: 0 auto;
  }

  /* 左侧滚动列 */
  .scrolly-column {
    position: relative;
    z-index: 10;
    padding: 0 2rem;
  }

  .step {
    height: 90vh; /* 每个步骤的高度 */
    display: flex;
    align-items: center; /* 垂直居中 */
    justify-content: center;
  }

  /* 文字卡片样式 */
  .card {
    background: rgba(255, 255, 255, 0.95);
    padding: 2rem;
    border-radius: 4px;
    border-left: 4px solid #333;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    max-width: 400px;
  }

  h2 {
    margin-top: 0;
    font-family: 'Helvetica Neue', sans-serif;
    font-weight: 700;
  }

  p {
    line-height: 1.6;
    color: #444;
  }

  .legend-blue { color: #377eb8; font-weight: bold; }
  .legend-red { color: #D62728; font-weight: bold; }

  /* 右侧图表列 */
  .chart-column {
    position: relative;
  }

  /* 关键：Sticky 容器 */
  .sticky-wrapper {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 移动端适配：变成单列 */
  @media (max-width: 768px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
    .sticky-wrapper {
      position: relative; /* 移动端取消 sticky，或者调整高度 */
      height: 50vh;
    }
    .step {
      height: auto;
      margin-bottom: 50vh;
    }
  }
</style>
