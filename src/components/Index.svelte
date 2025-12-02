<!-- src/routes/+page.svelte -->
<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";
  import TreeMap from "$components/TreeMap.svelte";

  let { data } = $props();
  
  // === Interaction Lock (Spotlight) ===
  let isLocked = $state(true); 
  let isSpotlightVisible = $state(true);

  // === Scrolly State ===
  let currentStep = $state(undefined);
  let activeHighlight = $state(null);
  let scrollY = $state(0);
  let innerHeight = $state(0);

  // === Logic: Sync Scrolly Steps to Map Steps ===
  // When currentStep is undefined (user is in Intro), mapStep is 1 (Default View)
  let mapStep = $derived(currentStep === undefined ? 1 : currentStep + 1);

  // === Logic: Treemap Year ===
  let treemapYear = $derived.by(() => {
      if (mapStep < 8) return 2020;
      if (currentStep < 7) return 2020;
      if (currentStep > 11) return 2024;
      return 2020 + (currentStep - 7);
  });

  const years = [2020, 2021, 2022, 2023, 2024];

  // === Spotlight Logic ===
  let mouseX = $state(50);
  let mouseY = $state(50);

  function handleMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 100;
    mouseY = (e.clientY / window.innerHeight) * 100;
  }

  function unlockExperience() {
      // 1. 先让遮罩开始消失 (触发 CSS opacity 变 0)
      isSpotlightVisible = false;

      // 2. 等待动画结束 (例如 500ms) 后，再允许页面滚动
      // 注意：这里的 500 要和你 CSS 里的 transition 时间匹配
      setTimeout(() => {
          isLocked = false; 
      }, 300); 
  }

  function setHighlight(id) {
    activeHighlight = id;
  }
</script>

<svelte:window 
    bind:scrollY={scrollY} 
    bind:innerHeight={innerHeight}
    onmousemove={handleMouseMove} 
/>

<!-- Lock Body Scroll when in Spotlight Mode -->
<svelte:body style:overflow={isLocked ? 'hidden' : 'auto'} />

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background-color: #0a0b0c; 
            color: #e0e0e0;
            font-family: 'Inter', sans-serif;
        }
    </style>
</svelte:head>

<main class="story-container">

  <!-- ========================================= -->
  <!-- PART 1: INTRO SEQUENCE (Grid + Text)      -->
  <!-- ========================================= -->
  <section class="intro-sequence">
      
      <!-- Spotlight Overlay (Fixed relative to viewport) -->
      <div 
        class="spotlight-overlay" 
        class:hidden={!isSpotlightVisible}
        style="--x: {mouseX}%; --y: {mouseY}%;"
      ></div>

      <!-- Background Grid (Only exists in this section) -->
      <div class="bg-grid"></div>

      <!-- Cover Content -->
      <div class="cover-section">
          <div class="title-card">
              <h1>The Invisible Current</h1>
              <p class="subtitle">Tracing the hidden flow of political capital.</p>
              
              <button 
                  class="start-btn" 
                  onclick={unlockExperience}
                  disabled={!isLocked}
              >
                  Click to Reveal Analysis
              </button>
              
              <div class="scroll-hint" style:opacity={isLocked ? 0 : 1}>
                  Scroll to Begin ↓
              </div>
          </div>
      </div>

      <!-- Article Content -->
      <div class="article-section">
          <div class="article-block">
              <h2>Introduction: Follow the Money</h2>
              <p>
                Michigan has emerged as a decisive battleground in the 2024 election cycle. While public attention focuses on polling data, campaign finance records reveal a different story about the state's political landscape.
              </p>
              <p class="highlight-box">
                A comprehensive analysis of contribution data shows that despite the national spotlight, 
                <strong>the majority of financial support originates from within the state itself</strong>.
              </p>
              <p>
                This report traces the flow of capital from individual donors to campaign war chests, identifying the key economic hubs and industries funding the race.
              </p>
          </div>
      </div>
  </section>

  <!-- ========================================= -->
  <!-- PART 2: VISUALIZATION (Sticky Map)        -->
  <!-- ========================================= -->
  <!-- This section follows the intro. It has NO grid. -->
  <section class="viz-sequence">
      
      <!-- A. The Sticky Stage -->
      <!-- This enters from bottom, hits top, and STICKS. -->
      <div class="sticky-stage">
          
          <!-- FlowMap -->
          <div 
              class="viz-wrapper" 
              style:opacity={mapStep <= 6 ? 1 : 0} 
              style:pointer-events={mapStep <= 6 ? 'auto' : 'none'}
          >
              <FlowMap {data} step={mapStep} {activeHighlight} />
          </div>

          <!-- Treemap -->
          <div 
              class="viz-wrapper" 
              style:opacity={mapStep >= 8 ? 1 : 0} 
              style:pointer-events={mapStep >= 8 ? 'auto' : 'none'}
          >
              <TreeMap data={data.treemapData} year={treemapYear} />
          </div>

          <!-- Year Sidebar -->
          <div class="year-sidebar" class:visible={mapStep >= 8 && mapStep <= 12}>
              {#each years as y}
                  <div class="year-item" class:active={treemapYear === y}>
                      <span class="year-text">{y}</span>
                      <div class="year-dot"></div>
                  </div>
              {/each}
          </div>

      </div>

      <!-- B. The Scrolling Steps -->
      <!-- These scroll OVER the sticky stage -->
      <div class="scrolly-steps">
        <Scrolly bind:value={currentStep}>
          
          <!-- Step 0 -->
          <div class="step center-focus">
            <div class="card glass" class:active={currentStep === 0}>
              <h2>1. The National Source</h2>
              <p>Money in politics rarely stays local. Before a single vote is cast in Michigan, millions of dollars traverse the country.</p>
              <p>
                While local support is vital, a significant portion originates from coastal powerhouses. 
                <span class="interactive" onmouseenter={() => setHighlight('DC')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">DC</span> 
                and 
                <span class="interactive" onmouseenter={() => setHighlight('CA')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">California</span>.
              </p>
            </div>
          </div>

          <!-- Step 1 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 1}>
              <h2>2. The Funnel Effect</h2>
              <p>As we track the trajectory, we see a "funneling" effect. Capital isn't distributed evenly; it seeks specific targets.</p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step right-align">
            <div class="card glass" class:active={currentStep === 2}>
              <h2>3. Domestic vs. Imported</h2>
              <p>
                <strong style="color: #EF5350;">Red Nodes</strong>: Out-of-State contributions.<br>
                <strong style="color: #B39DDB;">Purple Nodes</strong>: In-State capital.
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="step center-focus">
            <div class="card glass" class:active={currentStep === 3}>
              <h2>4. Michigan Focus</h2>
              <p>Zooming into the state level. The distribution is heavily skewed towards population centers.</p>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="step top-left-align">
            <div class="card glass" class:active={currentStep === 4}>
              <h2>5. Power Centers</h2>
              <p>
                <span class="interactive" onmouseenter={() => setHighlight('Wayne')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Wayne County</span> 
                and 
                <span class="interactive" onmouseenter={() => setHighlight('Oakland')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Oakland County</span> 
                absorb the vast majority of resources.
              </p>
            </div>
          </div>

          <!-- Step 5 -->
          <div class="step center-focus">
            <div class="card glass" class:active={currentStep === 5}>
              <h2>6. The Flow of Influence</h2>
              <p>Does funding translate directly to expenditure?</p>
            </div>
          </div>

          <!-- Step 6 -->
          <div class="step center-focus">
            <div class="card glass" class:active={currentStep === 6} style="border-color: #FFD700;">
              <h2 style="color: #FFD700;">Part II: The Source of Wealth</h2>
              <p>Let's uncover <em>who</em> is sending the money by analyzing industry sectors.</p>
            </div>
          </div>

          <!-- Step 7 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 7}>
              <h2>2020: The Baseline</h2>
              <p>A high-spending election year. Business and Legal sectors dominate.</p>
            </div>
          </div>

          <!-- Step 8 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 8}>
              <h2>2021: Post-Election Shift</h2>
              <p>Total volume decreases in the off-year.</p>
            </div>
          </div>

          <!-- Step 9 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 9}>
              <h2>2022: Midterm Surge</h2>
              <p>A massive influx of capital returns for the midterms.</p>
            </div>
          </div>

          <!-- Step 10 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 10}>
              <h2>2023: The Lull</h2>
              <p>The cycle resets. Contributions contract significantly.</p>
            </div>
          </div>

          <!-- Step 11 -->
          <div class="step left-align">
            <div class="card glass" class:active={currentStep === 11}>
              <h2>2024: Current Cycle</h2>
              <p>Leading into the current election, new patterns emerge.</p>
            </div>
          </div>

        </Scrolly>
      </div>
  </section>

</main>

<style>
  /* === 1. INTRO SEQUENCE (Normal Flow) === */
  .intro-sequence {
      position: relative;
      z-index: 20;
      background-color: #0a0b0c; /* Ensures it covers anything below if needed */
      padding-bottom: 10vh; /* Space before map arrives */
  }

  /* Background Grid - Only inside Intro */
  .bg-grid {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 1;
      pointer-events: none;
      background-image: 
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
  }

  .cover-section, .article-section {
      position: relative;
      z-index: 2; /* Above grid */
  }

  .cover-section {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .article-section {
      padding: 6rem 2rem;
      display: flex;
      justify-content: center;
  }

  /* === 2. VIZ SEQUENCE (Sticky Flow) === */
  .viz-sequence {
      position: relative;
      z-index: 10;
      /* No background here, so the sticky map is visible */
  }

  /* THE STICKY STAGE: Holds the map */
  .sticky-stage {
      position: -webkit-sticky;
      position: sticky;
      top: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
      background-color: #0a0b0c; /* Solid BG to hide the grid from Intro when this scrolls up */
      overflow: hidden;
      box-shadow: 0 -10px 50px rgba(0,0,0,0.5); /* Shadow to separate from intro */
  }

  .viz-wrapper {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      transition: opacity 1s ease-in-out;
      display: flex;
      justify-content: center;
      align-items: center;
  }

  /* THE SCROLLY STEPS: Scroll over the sticky stage */
  .scrolly-steps {
      position: relative;
      z-index: 10; /* Above sticky stage */
      /* Add gap so we see the map alone for a moment before text arrives */
      padding-top: 30vh; 
      padding-bottom: 20vh;
  }

  /* === SPOTLIGHT OVERLAY === */
  .spotlight-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 999; 
      pointer-events: none; 
      background: radial-gradient(
          circle 400px at var(--x) var(--y), 
          transparent 10%, 
          rgba(0, 0, 0, 0.95) 40%,
          rgba(0, 0, 0, 1) 60%
      );
      transition: opacity 0.3s ease-in-out;
      opacity: 1;
  }
  .spotlight-overlay.hidden { opacity: 0; pointer-events: none; }

  /* === BUTTON & TEXT STYLES === */
  .start-btn {
      background: transparent;
      border: 1px solid #FFD700;
      color: #FFD700;
      padding: 1rem 2rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      cursor: pointer;
      margin: 2rem 0;
      transition: all 0.3s;
      text-transform: uppercase;
      letter-spacing: 2px;
      position: relative;
      z-index: 1000;
  }
  .start-btn:hover {
      background: #FFD700;
      color: #000;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }

  .article-block {
      max-width: 680px;
      font-size: 1.2rem;
      line-height: 1.8;
      color: #ededed;
  }
  .article-block h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.2rem;
      color: #FFD700;
      margin-bottom: 2rem;
  }
  .highlight-box {
      border-left: 3px solid #FFD700;
      padding-left: 1.5rem;
      color: #e0e0e0;
      font-style: italic;
      background: rgba(255, 215, 0, 0.05);
      padding: 1.5rem;
      border-radius: 0 6px 6px 0;
  }
  .highlight-box strong { color: #FFD700; }

  .step {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
  }
  .center-focus { justify-content: center; }
  .left-align { justify-content: flex-start; padding-left: 5%; }
  .right-align { justify-content: flex-end; padding-right: 5%; }
  .top-left-align { justify-content: flex-start; align-items: flex-start; padding-top: 20vh; padding-left: 5%; }

  .card {
      background: rgba(18, 18, 18, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 4px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      max-width: 500px;
      color: #ddd;
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      pointer-events: auto; 
  }
  .card.active { opacity: 1; transform: translateY(0); }

  .title-card { text-align: center; pointer-events: auto; }
  h1 {
      font-family: 'Playfair Display', serif;
      font-size: 4.5rem;
      margin: 0 0 1.5rem 0;
      background: linear-gradient(to bottom, #fff8e1 0%, #ffd700 45%, #b8860b 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
  }
  .subtitle { font-size: 1.3rem; color: #aaa; margin-bottom: 2rem; }
  .scroll-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: #FFD700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.8;
      transition: opacity 0.5s;
  }

  .interactive {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9em;
      color: #FFD700;
      border-bottom: 1px dashed #FFD700;
      cursor: help;
      transition: all 0.2s;
      pointer-events: auto;
  }
  .interactive:hover { background: rgba(255, 215, 0, 0.2); color: #fff; }

  .year-sidebar {
      position: fixed;
      right: 20px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 20px;
      z-index: 100; opacity: 0; transition: opacity 0.5s; pointer-events: none;
  }
  .year-sidebar.visible { opacity: 1; pointer-events: auto; }
  .year-item {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      cursor: pointer; opacity: 0.4; transition: all 0.3s;
  }
  .year-item:hover { opacity: 0.8; }
  .year-item.active { opacity: 1; transform: scale(1.1); }
  .year-text { font-family: "JetBrains Mono", monospace; font-size: 12px; color: #fff; }
  .year-dot { width: 6px; height: 6px; background: #fff; border-radius: 50%; transition: all 0.3s; }
  .year-item.active .year-dot { background: #ffd700; box-shadow: 0 0 8px #ffd700; transform: scale(1.5); }
</style>
