<script>
  import Scrolly from "$components/helpers/Scrolly.svelte";
  import FlowMap from "$components/FlowMap.svelte";

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
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            overflow-x: hidden; 
            /* 深邃的蓝黑色底色，中心稍微亮一点 */
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

  <!-- 2. 数据层：地图 -->
  <!-- 关键修改：添加 class:locked，在封面模式下禁止地图交互，防止误触 -->
  <div class="viz-layer" class:locked={isCoverActive}>
    <div class="map-wrapper">
        <FlowMap {data} step={currentStep} {activeHighlight} />
    </div>
  </div>

  <!-- 3. 叙事层：文字与按钮 -->
  <!-- Z-Index: 100 (位于遮罩层之下，所以会被遮住) -->
  <div class="scrolly-overlay" class:cover-mode={isCoverActive}>
    <Scrolly bind:value={currentStep}>
      
      <!-- STEP 0: 封面标题 -->
      <div class="step title-page">
        <div class="card title-card" class:active={currentStep === 0}>
          <h1>The Invisible Current</h1>
          <p class="subtitle">Tracing the hidden flow of political capital into Michigan's 2024 Election.</p>
          
          <!-- 核心按钮 -->
          <!-- pointer-events: auto 确保它是这一层唯一能被点击的东西 -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="scroll-hint interactive-hint" 
            onclick={enterStory}
          >
            {#if isCoverActive}
                <span class="blink">●</span> Click to Begin Investigation
            {:else}
                Scroll to begin ↓
            {/if}
          </div>
        </div>
      </div>

      <!-- STEP 1: National Source -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 1}>
          <h2>1. The National Source</h2>
          <p>
            Money in politics rarely stays local. Before a single vote is cast in Michigan, millions of dollars traverse the country.
          </p>
          <p>
            While local support is vital, a significant portion originates from coastal powerhouses. 
            <span class="interactive" onmouseenter={() => setHighlight('DC')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">DC</span> 
            and 
            <span class="interactive" onmouseenter={() => setHighlight('CA')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">California</span>
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
        </div>
      </div>

      <!-- STEP 3: State Convergence -->
      <div class="step right-align">
        <div class="card glass" class:active={currentStep === 3}>
          <h2>3. Domestic vs. Imported</h2>
          <p>
            Here, we separate the signal from the noise.
            <br><br>
            <strong style="color: #EF5350;">Red Nodes</strong>: Out-of-State contributions.<br>
            <strong style="color: #B39DDB;">Purple Nodes</strong>: In-State capital.
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
            <span class="interactive" onmouseenter={() => setHighlight('Wayne')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Wayne County</span> 
            and 
            <span class="interactive" onmouseenter={() => setHighlight('Oakland')} onmouseleave={() => setHighlight(null)} role="button" tabindex="0">Oakland County</span> 
            absorb the vast majority of resources.
          </p>
          <div class="legend-row">
            <div><span class="dot purple"></span> Inflow</div>
            <div><span class="dot yellow"></span> Expenditure</div>
          </div>
        </div>
      </div>

      <!-- STEP 6: Alluvial -->
      <div class="step center-focus">
        <div class="card glass" class:active={currentStep === 6}>
          <h2>6. The Flow of Influence</h2>
          <p>
            Does funding translate directly to expenditure?
            <br><br>
            <strong style="color: #9C27B0;">Purple Ribbons</strong>: Net Contributors.<br>
            <strong style="color: #FFC107;">Yellow Ribbons</strong>: Net Beneficiaries.
          </p>
        </div>
      </div>

    </Scrolly>
  </div>

  <!-- 4. 遮罩层：聚光灯 -->
  <!-- Z-Index: 999 (最高层) -->
  <!-- 关键修改：pointer-events: none 让鼠标穿透它去点击下面的按钮 -->
  <div 
    class="spotlight-overlay" 
    class:hidden={!isCoverActive}
    style="--x: {mouseX}%; --y: {mouseY}%;"
  >
  </div>

</section>

<style>
  /* =========================================
     1. Global & Layout
     ========================================= */
  :global(body) {
      margin: 0; padding: 0; overflow-x: hidden;
      background: radial-gradient(circle at 50% 50%, #1a202c 0%, #0d1117 100%);
      color: #eee;
      font-family: 'Inter', sans-serif;
  }

  /* =========================================
     2. Background Layers (Z-Index: 0-1)
     ========================================= */
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
  
  /* 当处于封面模式时，彻底禁用地图层的交互 */
  .viz-layer.locked {
      pointer-events: none !important;
  }
  /* 正常模式下，地图可以交互 */
  .viz-layer:not(.locked) .map-wrapper {
      pointer-events: auto;
  }

  .map-wrapper {
      width: 100%; height: 100%;
      display: flex; justify-content: center;
  }

  /* =========================================
     3. Spotlight Overlay (Z-Index: 999)
     ========================================= */
  .spotlight-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 999; /* 最高层级，盖住文字 */
      
      /* 关键：允许鼠标穿透！这样才能点到下面的按钮 */
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

  .spotlight-overlay.hidden {
      opacity: 0;
      visibility: hidden;
  }

  /* =========================================
     4. UI & Scrolly Layer (Z-Index: 100)
     ========================================= */
  .scrolly-overlay {
      position: relative;
      z-index: 100; /* 位于 Spotlight 之下，所以会被黑影遮住 */
      pointer-events: none; /* 默认穿透，不挡地图 */
  }
  
  .scrolly-overlay.cover-mode {
      height: 100vh;
      overflow: hidden;
  }

  .step {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
  }

  /* =========================================
     5. Cards & Typography
     ========================================= */
  .card {
      background: rgba(18, 18, 18, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(0, 0, 0, 0.4);
      padding: 2.5rem;
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

  .card.active {
      opacity: 1;
      transform: translateY(0);
  }

  .title-card {
      text-align: center;
      background: transparent;
      border: none;
      box-shadow: none;
      backdrop-filter: none;
      /* 封面卡片本身不接收点击，防止误触 */
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

  .subtitle {
      font-size: 1.2rem;
      color: #aaa;
      margin-bottom: 2rem;
      font-weight: 300;
  }

  /* =========================================
     6. Interactive Elements (Buttons & Links)
     ========================================= */

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

  .interactive {
      color: #FFD700;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      cursor: pointer;
      transition: all 0.2s;
      pointer-events: auto;
  }
  .interactive:hover {
      background: rgba(255, 215, 0, 0.2);
      color: #fff;
  }

  /* =========================================
     7. Utilities
     ========================================= */
  .blink { animation: blinker 1.5s linear infinite; color: red; margin-right: 5px; }
  @keyframes blinker { 50% { opacity: 0; } }

  .center-focus { justify-content: center; }
  .left-align { justify-content: flex-start; padding-left: 10%; }
  .right-align { justify-content: flex-end; padding-right: 10%; }
  .top-left-align { justify-content: flex-start; align-items: flex-start; padding-top: 15vh; padding-left: 5%; }

  .legend-row { display: flex; gap: 1rem; margin-top: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .dot { width: 10px; height: 10px; display: inline-block; border-radius: 50%; margin-right: 5px; }
  .purple { background: #9C27B0; }
  .yellow { background: #FFC107; }
  .small-hint { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; opacity: 0.7; margin-top: 1rem; }
</style>
