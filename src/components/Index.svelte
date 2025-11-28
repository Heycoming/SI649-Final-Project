<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

  // Receive data from +page.svelte
  let { data } = $props();
  
  // Manage current scroll step
  let currentStep = $state(0);
</script>

<section class="layout-grid">
  <!-- Left: Scrolly Narrative -->
  <div class="scrolly-column">
    <Scrolly bind:value={currentStep}>
      <div class="step">
        <div class="card">
          <h2>1. Funding Sources</h2>
          <p>Visualizing the origins of funding across the United States...</p>
        </div>
      </div>
      <div class="step">
        <div class="card">
          <h2>2. Inflow</h2>
          <p>Tracking the flow of capital into the state of Michigan...</p>
        </div>
      </div>
      <div class="step">
        <div class="card">
          <h2>3. State Convergence</h2>
          <p>Separating In-State vs Out-of-State contributions...</p>
        </div>
      </div>
      <div class="step">
        <div class="card">
          <h2>4. Michigan Focus</h2>
          <p>Zooming into the county level distribution of funding.</p>
        </div>
      </div>
      <!-- NEW STEP 4 (Index 4): Side-by-Side -->
      <div class="step">
        <div class="card">
          <h2>5. Funding vs. Expenditure</h2>
          <p>Left: Funding received.<br>Right: Expenditures made.<br>Comparing the inflow and outflow dynamics side-by-side.</p>
        </div>
      </div>
      <!-- NEW STEP 5 (Index 5): Choropleth -->
      <div class="step">
        <div class="card">
          <h2>6. County Density</h2>
          <p>Transforming individual data points into a density map to show overall concentration per county.</p>
        </div>
      </div>
    </Scrolly>
  </div>

  <!-- Right: Visualization Component -->
  <div class="chart-column">
    <div class="sticky-wrapper">
      <!-- Pass data and step to the map -->
      <FlowMap {data} step={currentStep} />
    </div>
  </div>
</section>

<style>
  .layout-grid { display: grid; grid-template-columns: 1fr 2.5fr; width: 100%; margin: 0; }
  .scrolly-column { position: relative; z-index: 10; padding: 0 1rem; padding-bottom: 20vh; background: rgba(255,255,255,0.8); backdrop-filter: blur(5px); }
  .step { height: 90vh; display: flex; align-items: center; justify-content: center; }
  .card { background: #fff; padding: 1.5rem; border: 1px solid #eee; border-left: 4px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.08); width: 100%; max-width: 400px; border-radius: 4px; }
  .chart-column { position: relative; background: white; }
  .sticky-wrapper { position: sticky; top: 0; height: 100vh; width: 100%; overflow: hidden; }
  @media (max-width: 768px) { .layout-grid { grid-template-columns: 1fr; } }
</style>
