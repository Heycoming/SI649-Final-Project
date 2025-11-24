<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

  let { data } = $props();
  let currentStep = $state(0);
</script>

<section class="layout-grid">
  
  <!-- 左侧：文字区 (保持原样) -->
  <div class="scrolly-column">
    <Scrolly bind:value={currentStep}>
      
      <!-- Step 0 -->
      <div class="step">
        <div class="card">
          <h2>1. 资金源头</h2>
          <p>
            <span class="legend-blue">● 蓝色圆点</span> 精确对应各州的地理中心。
            <br><br>
            圆点大小代表资金规模。此时，它们静止在起始位置。
          </p>
        </div>
      </div>

      <!-- Step 1 -->
      <div class="step">
        <div class="card">
          <h2>2. 资金注入</h2>
          <p>
            随着竞选推进，资金开始流动。
            <br><br>
            <span class="legend-red">红色线条</span> 从圆心延伸而出，直指密歇根。
          </p>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="step">
        <div class="card">
          <h2>3. 最终汇聚</h2>
          <p>所有资金汇入同一战场，原来的地理分布变成了选战的燃料。</p>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="step">
        <div class="card">
          <h2>4. 聚焦密歇根</h2>
          <p>
            虽然外州资金庞大，但密歇根内部的捐款同样关键。
            <br><br>
            让我们隐去外部噪音，只看 <span class="legend-blue">本州资金</span> 在各个县（County）的实际地理分布。
          </p>
        </div>
      </div>

    </Scrolly>
  </div>

  <!-- 右侧：图表区 -->
  <div class="chart-column">
    <div class="sticky-wrapper">
      <!-- 
         优化点：
         1. 传入 step
         2. 传入预加载好的 data (usAtlas, funding, county)
      -->
      <FlowMap 
        step={currentStep} 
        usAtlas={data.usAtlas}
        fundingData={data.fundingData}
        miCountyData={data.miCountyData}
      />
    </div>
  </div>

</section>

<style>
  /* 保持你原有的 CSS 不变 */
  .layout-grid {
    display: grid;
    grid-template-columns: 1fr 2.5fr; 
    width: 100%;
    margin: 0;
  }

  .scrolly-column {
    position: relative;
    z-index: 10;
    padding: 0 1rem;
    /* 增加一点底部留白，防止最后一个 step 划不过去 */
    padding-bottom: 20vh; 
    background: rgba(255,255,255,0.8); /* 稍微透明一点，更有现代感 */
    backdrop-filter: blur(5px); /* 增加毛玻璃效果 */
  }

  .step {
    height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card {
    background: #fff;
    padding: 1.5rem; 
    border: 1px solid #eee;
    border-left: 4px solid #333;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08); /* 更柔和的阴影 */
    width: 100%;
    font-size: 1rem; 
    border-radius: 4px;
  }

  h2 { margin-top: 0; font-size: 1.4rem; margin-bottom: 0.5rem; }
  p { line-height: 1.6; color: #444; }

  .legend-blue { color: #2b8cbe; font-weight: bold; }
  .legend-red { color: #D62728; font-weight: bold; }

  .chart-column {
    position: relative;
    background: white;
  }

  .sticky-wrapper {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
    .scrolly-column {
      background: rgba(255,255,255,0.95);
    }
  }
</style>
