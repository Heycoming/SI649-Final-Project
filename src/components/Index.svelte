<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

  let { data } = $props();
  
  let currentStep = $state(0);
  let activeHighlight = $state(null);

  function setHighlight(id) {
    activeHighlight = id;
  }
</script>

<svelte:head>
    <style>
        body { margin: 0; padding: 0; overflow-x: hidden; background: #121212; }
    </style>
</svelte:head>

<section class="story-container">
  <div class="viz-layer">
    <FlowMap {data} step={currentStep} {activeHighlight} />
  </div>

  <div class="scrolly-overlay">
    <Scrolly bind:value={currentStep}>
      
      <!-- STEP 0: Title -->
      <div class="step title-page">
        <div class="card title-card" class:active={currentStep === 0}>
          <h1>The Invisible Current</h1>
          <p class="subtitle">Tracing the hidden flow of political capital into Michigan's 2024 Election.</p>
          <div class="scroll-hint">Scroll to begin ↓</div>
        </div>
      </div>

      <!-- STEP 1: National Source (改为居中，避开 CA) -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 1}>
          <h2>1. The National Source</h2>
          <p>
            Money in politics rarely stays local. Before a single vote is cast in Michigan, millions of dollars traverse the country.
          </p>
          <p>
            While local support is vital, a significant portion originates from coastal powerhouses. 
            <span class="interactive" onmouseenter={() => setHighlight('CA')} onmouseleave={() => setHighlight(null)}>California</span> 
            and 
            <span class="interactive" onmouseenter={() => setHighlight('NY')} onmouseleave={() => setHighlight(null)}>New York</span> 
            act as massive reservoirs.
          </p>
        </div>
      </div>

      <!-- STEP 2: Inflow -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 2}>
          <h2>2. The Funnel Effect</h2>
          <p>
            As we track the trajectory, we see a "funneling" effect. Capital isn't distributed evenly; it seeks specific targets.
          </p>
          <p>
            The particles on the map represent individual funding streams. Watch how they converge from a broad national network.
          </p>
        </div>
      </div>

      <!-- STEP 3: State Convergence -->
      <div class="step right-align">
        <div class="card glass" class:active={currentStep === 3}>
          <h2>3. Domestic vs. Imported</h2>
          <p>
            Here, we separate the signal from the noise.
          </p>
          <p>
            <strong style="color: #EF5350;">Red Nodes</strong> represent Out-of-State contributions—often tied to national PACs.
          </p>
            <p>
            <strong style="color: #B39DDB;">Purple Nodes</strong> represent In-State capital—grassroots funding and local business support.
          </p>
        </div>
      </div>

      <!-- STEP 4: Michigan Focus -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 4}>
          <h2>4. Michigan Focus</h2>
          <p>
            Zooming into the state level. The distribution is heavily skewed towards population centers.
          </p>
          <p class="small-hint">(Hover over the map to explore counties)</p>
        </div>
      </div>

      <!-- STEP 5: Impact Analysis -->
      <div class="step top-left-align">
        <div class="card glass" class:active={currentStep === 5}>
          <h2>5. Power Centers</h2>
          <p>
            Zooming in, the disparity becomes stark. 
            <span class="interactive" onmouseenter={() => setHighlight('Wayne')} onmouseleave={() => setHighlight(null)}>Wayne County</span> 
            (Detroit) and 
            <span class="interactive" onmouseenter={() => setHighlight('Oakland')} onmouseleave={() => setHighlight(null)}>Oakland County</span> 
            absorb the vast majority of resources.
          </p>
          <div class="legend-row">
            <div><span class="dot purple"></span><strong>Inflow</strong></div>
            <div><span class="dot yellow"></span><strong>Expenditure</strong></div>
          </div>
        </div>
      </div>

      <!-- STEP 6: Alluvial Diagram -->
      <div class="step center-focus">
        <div class="card glass wide-alluvial" class:active={currentStep === 6}>
          <h2>6. The Lifecycle of Funds</h2>
          <p>
            Tracing the complete lifecycle from Contribution to Expenditure.
          </p>
          <p>
            <strong>Left:</strong> Contributions (<span style="color:#9C27B0">Purple</span>) flow into the pool.<br>
            <strong>Right:</strong> Expenditures (<span style="color:#FBC02D">Yellow</span>) flow out.
          </p>
        </div>
      </div>

    </Scrolly>
  </div>
</section>

<style>
  :global(body) { font-family: 'Inter', sans-serif; color: #eee; }
  h1, h2 { font-family: 'Playfair Display', serif; font-weight: 700; }
  
  .story-container { position: relative; width: 100%; }

  .viz-layer {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 0; background: #121212;
    display: flex; justify-content: center; align-items: center;
  }

  .scrolly-overlay { position: relative; z-index: 10; pointer-events: none; }

  .step { min-height: 100vh; display: flex; padding: 2rem; box-sizing: border-box; }
  
  .title-page { justify-content: center; align-items: center; }
  .center-focus { justify-content: center; align-items: center; }
  .left-align { justify-content: flex-start; align-items: center; padding-left: 5vw; }
  .right-align { justify-content: flex-end; align-items: center; padding-right: 5vw; }
  .top-left-align { justify-content: flex-start; align-items: flex-start; padding-top: 15vh; padding-left: 5vw; }

  .card {
    pointer-events: auto;
    background: rgba(20, 20, 20, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem;
    border-radius: 8px;
    max-width: 450px;
    color: #e0e0e0;
    opacity: 0; transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  .card.active { opacity: 1; transform: translateY(0); }

  .title-card { text-align: center; background: transparent; border: none; backdrop-filter: none; }
  .title-card h1 { font-size: 4rem; margin-bottom: 0.5rem; text-shadow: 0 4px 20px rgba(0,0,0,0.8); }
  .subtitle { font-size: 1.2rem; color: #aaa; max-width: 600px; margin: 0 auto; }
  .scroll-hint { margin-top: 3rem; opacity: 0.7; animation: bounce 2s infinite; }

  .wide-alluvial { max-width: 800px; text-align: center; margin-bottom: 5vh; }
  .small-hint { font-size: 0.8rem; color: #888; margin-top: 1rem; font-style: italic; }

  .interactive { color: #FFD700; border-bottom: 1px dashed #FFD700; cursor: pointer; font-weight: bold; }
  .interactive:hover { background: rgba(255, 215, 0, 0.2); color: #fff; }

  .legend-row { display: flex; gap: 1.5rem; margin: 1rem 0; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  .dot.purple { background: #B39DDB; }
  .dot.yellow { background: #FFF59D; }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }
</style>
