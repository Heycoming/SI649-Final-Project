<!-- src/routes/+page.svelte -->
<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";
  import TreeMap from "$components/TreeMap.svelte";

  let { data } = $props();
  
  let currentStep = $state(0);
  let activeHighlight = $state(null);

  // === 封面交互逻辑 ===
  let isCoverActive = $state(true); 
  let mouseX = $state(50);
  let mouseY = $state(50);

  function handleMouseMove(e) {
    if (isCoverActive) {
        mouseX = (e.clientX / window.innerWidth) * 100;
        mouseY = (e.clientY / window.innerHeight) * 100;
    }
  }

  function enterStory() {
    isCoverActive = false;
  }

  function setHighlight(id) {
    activeHighlight = id;
  }

  // === Treemap 年份逻辑 ===
  let treemapYear = $derived.by(() => {
      if (currentStep < 8) return 2020;
      if (currentStep > 12) return 2024;
      return 2020 + (currentStep - 8);
  });

  const years = [2020, 2021, 2022, 2023, 2024];
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            overflow-x: hidden; 
            background: radial-gradient(circle at 50% 50%, #1a1f25 0%, #0a0b0c 100%);
            color: #e0e0e0;
        }
    </style>
</svelte:head>

<svelte:window onmousemove={handleMouseMove} />

<section class="story-container">
  
  <!-- 1. 背景层：网格 -->
  <div 
    class="bg-grid" 
    style:opacity={currentStep === 1 || currentStep === 2 || currentStep === 4 ? 0 : 1}
  ></div>

  <!-- 2. 数据层：可视化图表 -->
  <div class="viz-layer" class:locked={isCoverActive}>
    
    <!-- FlowMap: Step 0 到 6 显示 -->
    <div 
        class="viz-wrapper" 
        style:opacity={currentStep <= 6 ? 1 : 0} 
        style:pointer-events={currentStep <= 6 ? 'auto' : 'none'}
    >
        <FlowMap {data} step={currentStep} {activeHighlight} />
    </div>

    <!-- Treemap: Step 8 开始显示 -->
    <div 
        class="viz-wrapper" 
        style:opacity={currentStep >= 8 ? 1 : 0} 
        style:pointer-events={currentStep >= 8 ? 'auto' : 'none'}
    >
        <TreeMap data={data.treemapData} year={treemapYear} />
    </div>

  </div>

  <!-- 年份侧边栏 -->
  <div class="year-sidebar" class:visible={currentStep >= 8 && currentStep <= 12}>
      {#each years as y}
          <div class="year-item" class:active={treemapYear === y}>
              <span class="year-text">{y}</span>
              <div class="year-dot"></div>
          </div>
      {/each}
  </div>

  <!-- 3. 叙事层：文字与按钮 -->
  <div class="scrolly-overlay" class:cover-mode={isCoverActive}>
    <Scrolly bind:value={currentStep}>
      
      <!-- STEP 0: 封面 -->
      <div class="step title-page">
        <div class="card title-card" class:active={currentStep === 0}>
          <h1>The Invisible Current</h1>
          <p class="subtitle">Tracing the hidden flow of political capital into Michigan's 2024 Election.</p>
          <div 
            class="scroll-hint interactive-hint" 
            onclick={enterStory}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') enterStory(); }}
          >
            {#if isCoverActive}
                <span class="blink">●</span> Click to Begin
            {:else}
                Scroll to begin ↓
            {/if}
          </div>
        </div>
      </div>

      <!-- STEP 1 -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 1}>
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

      <!-- STEP 2 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 2}>
          <h2>2. The Funnel Effect</h2>
          <p>As we track the trajectory, we see a "funneling" effect. Capital isn't distributed evenly; it seeks specific targets.</p>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="step right-align">
        <div class="card glass" class:active={currentStep === 3}>
          <h2>3. Domestic vs. Imported</h2>
          <p>
            <strong style="color: #EF5350;">Red Nodes</strong>: Out-of-State contributions.<br>
            <strong style="color: #B39DDB;">Purple Nodes</strong>: In-State capital.
          </p>
        </div>
      </div>

      <!-- STEP 4 -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 4}>
          <h2>4. Michigan Focus</h2>
          <p>Zooming into the state level. The distribution is heavily skewed towards population centers.</p>
        </div>
      </div>

      <!-- STEP 5 -->
      <div class="step top-left-align">
        <div class="card glass" class:active={currentStep === 5}>
          <h2>5. Power Centers</h2>
          <p>
            <span class="interactive" onmouseenter={() => setHighlight('Wayne')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Wayne County</span> 
            and 
            <span class="interactive" onmouseenter={() => setHighlight('Oakland')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Oakland County</span> 
            absorb the vast majority of resources.
          </p>
        </div>
      </div>

      <!-- STEP 6 -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 6}>
          <h2>6. The Flow of Influence</h2>
          <p>Does funding translate directly to expenditure?</p>
        </div>
      </div>

      <!-- STEP 7: Transition -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 7} style="border-color: #FFD700;">
          <h2 style="color: #FFD700;">Part II: The Source of Wealth</h2>
          <p>Let's uncover <em>who</em> is sending the money by analyzing industry sectors.</p>
          <p class="small-hint">Scroll down to analyze the yearly breakdown ↓</p>
        </div>
      </div>

      <!-- STEP 8: 2020 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 8}>
          <h2>2020: The Baseline</h2>
          <p>A high-spending election year. Business and Legal sectors dominate.</p>
        </div>
      </div>

      <!-- STEP 9: 2021 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 9}>
          <h2>2021: Post-Election Shift</h2>
          <p>Total volume decreases in the off-year.</p>
        </div>
      </div>

      <!-- STEP 10: 2022 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 10}>
          <h2>2022: Midterm Surge</h2>
          <p>A massive influx of capital returns for the midterms.</p>
        </div>
      </div>

      <!-- STEP 11: 2023 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 11}>
          <h2>2023: The Lull</h2>
          <p>The cycle resets. Contributions contract significantly.</p>
        </div>
      </div>

      <!-- STEP 12: 2024 -->
      <div class="step left-align">
        <div class="card glass" class:active={currentStep === 12}>
          <h2>2024: Current Cycle</h2>
          <p>Leading into the current election, new patterns emerge.</p>
        </div>
      </div>

    </Scrolly>
  </div>

  <!-- 4. 遮罩层 -->
  <div 
    class="spotlight-overlay" 
    class:hidden={!isCoverActive}
    style="--x: {mouseX}%; --y: {mouseY}%;"
  >
  </div>

</section>

<style>
  :global(body) {
      margin: 0; padding: 0; overflow-x: hidden;
      background: radial-gradient(circle at 50% 50%, #1a202c 0%, #0d1117 100%);
      color: #eee;
      font-family: 'Inter', sans-serif;
  }

  .bg-grid {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 0;
      pointer-events: none;
      background-image: 
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      transition: opacity 0.8s ease-in-out;
  }

  .viz-layer {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 1;
      pointer-events: none; 
  }
  
  .viz-layer.locked { pointer-events: none !important; }

  .viz-wrapper {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      transition: opacity 0.8s ease-in-out;
      display: flex;
      justify-content: center;
      align-items: center;
  }

  .spotlight-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 999;
      pointer-events: none; 
      background: radial-gradient(
          circle 650px at var(--x) var(--y), 
          transparent 10%, 
          rgba(0, 0, 0, 0.8) 20%,
          rgba(0, 0, 0, 1) 40%
      );
      transition: opacity 1.5s ease-in-out, visibility 1.5s;
      opacity: 1;
      visibility: visible;
  }

  .spotlight-overlay.hidden { opacity: 0; visibility: hidden; }

  .scrolly-overlay {
      position: relative;
      z-index: 100;
      pointer-events: none;
  }
  
  .scrolly-overlay.cover-mode { height: 100vh; overflow: hidden; }

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
      background: rgba(18, 18, 18, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(0, 0, 0, 0.4);
      padding: 1.8rem;
      padding-top: 1rem;
      border-radius: 4px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      max-width: 500px;
      color: #ddd;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s, transform 0.5s;
      pointer-events: auto; 
      position: relative;
  }

  .card.active { opacity: 1; transform: translateY(0); }

  .title-card {
      text-align: center;
      background: transparent;
      border: none;
      box-shadow: none;
      backdrop-filter: none;
      pointer-events: none; 
  }

  h1 {
      font-family: 'Playfair Display', serif;
      font-size: 4rem;
      font-weight: bold;
      margin: 0 0 1rem 0;
      background: linear-gradient(to bottom, #fff8e1 0%, #ffd700 45%, #b8860b 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
      filter: drop-shadow(0 2px 0px rgba(0,0,0,0.5)) drop-shadow(0 0 30px rgba(255, 215, 0, 0.2));
      letter-spacing: -0.03em;
  }

  .subtitle { font-size: 1.2rem; color: #aaa; margin-bottom: 2rem; font-weight: 300; }

  .interactive {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9em;
      color: #FFD700;
      border-bottom: 1px dashed #FFD700;
      cursor: help;
      transition: all 0.2s ease-in-out;
      pointer-events: auto;
      position: relative;
      padding: 0 2px;
  }

  .interactive:hover {
      background: rgba(255, 215, 0, 0.2);
      color: #fff;
      border-bottom: 1px dashed #FFD700;
      border-radius: 3px;
      text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  }

  .interactive-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: #FFD700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 10px 20px;
      border: 1px solid rgba(255, 215, 0, 0.3);
      display: inline-block;
      border-radius: 50px;
      transition: all 0.3s;
      cursor: pointer;
      pointer-events: auto; 
  }

  .interactive-hint:hover {
      background: rgba(255, 215, 0, 0.1);
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
      transform: scale(1.05);
  }

  .blink { animation: blinker 1.5s linear infinite; }
  @keyframes blinker { 50% { opacity: 0; } }

  .year-sidebar {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 20px;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.5s;
      pointer-events: none;
  }
  .year-sidebar.visible { opacity: 1; pointer-events: auto; }
  
  .year-item {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      cursor: pointer;
      opacity: 0.4;
      transition: all 0.3s;
  }
  .year-item:hover { opacity: 0.8; }
  .year-item.active { opacity: 1; transform: scale(1.1); }
  
  .year-text { font-family: "JetBrains Mono", monospace; font-size: 12px; color: #fff; }
  .year-dot { width: 6px; height: 6px; background: #fff; border-radius: 50%; transition: all 0.3s; }
  .year-item.active .year-dot { background: #ffd700; box-shadow: 0 0 8px #ffd700; transform: scale(1.5); }
</style>
