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

      <div class="step">
        <div class="card">
          <h2>5. Impact Analysis</h2>
          <p><strong>Left:</strong> Funding Inflow (<span style="color:#B39DDB">Purple</span>)<br><strong>Right:</strong> Expenditures (<span style="color:#FFF59D">Yellow</span>)</p>
          <p>Comparing the density of capital received versus capital spent across counties.</p>
        </div>
      </div>

      <div class="step">
        <div class="card">
          <h2>6. The Capital Flow</h2>
          <p><strong>Net Value Analysis:</strong></p>
          <p>Showing the Top 10 Contributors and Spenders.</p>
          <ul>
            <li><strong style="color: #AB47BC;">Purple (Contributors):</strong><br>Counties that contribute more than they spend.</li>
            <li><strong style="color: #FBC02D;">Yellow (Beneficiaries):</strong><br>Counties that spend more than they contribute.</li>
          </ul>
          <p>Use the <strong>Show All</strong> button to explore the full dataset.</p>
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
  :global(body) { margin: 0; background: #121212; color: #eee; font-family: sans-serif; }
  
  .layout-grid { display: grid; grid-template-columns: 1fr 2.5fr; width: 100%; margin: 0; background: #121212; }
  
  /* Dark Theme for Scrolly Column */
  .scrolly-column { 
    position: relative; 
    z-index: 10; 
    padding: 0 1rem; 
    padding-bottom: 20vh; 
    background: rgba(18, 18, 18, 0.6); /* Semi-transparent dark */
    backdrop-filter: blur(5px); 
  }
  
  .step { height: 90vh; display: flex; align-items: center; justify-content: center; }
  
  /* Dark Theme for Cards */
  .card { 
    background: #1E1E1E; 
    color: #E0E0E0;
    padding: 1.5rem; 
    border: 1px solid #333; 
    border-left: 4px solid #7E57C2; /* Purple Accent */
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
    width: 100%; 
    max-width: 400px; 
    border-radius: 4px; 
  }
  
  .card h2 { margin-top: 0; color: #B39DDB; } /* Light Purple Heading */
  
  .chart-column { position: relative; background: #121212; }
  .sticky-wrapper { position: sticky; top: 0; height: 100vh; width: 100%; overflow: hidden; }
  
  @media (max-width: 768px) { .layout-grid { grid-template-columns: 1fr; } }
</style>
