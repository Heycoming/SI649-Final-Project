<script>
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import FlowMap from "$components/FlowMap.svelte";
	import TreeMap from "$components/TreeMap.svelte";
	import SectorStream from "$components/SectorStream.svelte";

	let { data } = $props();

	// === Interaction Lock (Spotlight) ===
	let isLocked = $state(true);
	let isSpotlightVisible = $state(true);

	// === Scrolly State ===
	let currentStep = $state(undefined);
	let activeHighlight = $state(null);
	let scrollY = $state(0);
	let innerHeight = $state(0);

	// === Logic: Scroll Locking ===
	// Use $effect instead of <svelte:body> for stronger locking
	// Locks both html and body, and forces scroll to top
	$effect(() => {
		if (isLocked) {
			document.body.style.overflow = "hidden";
			document.documentElement.style.overflow = "hidden";
			window.scrollTo(0, 0);
		} else {
			document.body.style.overflow = "";
			document.documentElement.style.overflow = "";
		}
	});

	function unlockExperience() {
		if (!isLocked) return;
		isSpotlightVisible = false;
		setTimeout(() => {
			isLocked = false;
		}, 300);
	}

	// Handle Double Click to Unlock
	function handleDoubleClick() {
		unlockExperience();
	}

	// === Logic: Adjusted Step for Spacers ===
	// Content steps are EVEN (0, 2, 4...), Spacers are ODD (1, 3, 5...)
	let adjustedStep = $derived(
		currentStep === undefined ? 0 : Math.round(currentStep / 2)
	);

	// === Logic: Sync Scrolly Steps to Map Steps ===
	let mapStep = $derived.by(() => {
		const s = adjustedStep;
		if (s <= 4) return s + 1;
		if (s === 5) return 5; // Hold visual state at 5
		return s;
	});

	// === Logic: Treemap Year ===
	let treemapYear = $derived.by(() => {
		const s = adjustedStep;
		if (mapStep < 8) return 2020;
		if (s < 8) return 2020;
		if (s > 12) return 2024;
		return 2020 + (s - 8);
	});

	const years = [2020, 2021, 2022, 2023, 2024];

	// === Spotlight Logic ===
	let mouseX = $state(50);
	let mouseY = $state(50);

	function handleMouseMove(e) {
		mouseX = (e.clientX / window.innerWidth) * 100;
		mouseY = (e.clientY / window.innerHeight) * 100;
	}

	function setHighlight(id) {
		activeHighlight = id;
	}
</script>

<svelte:window
	bind:scrollY
	bind:innerHeight
	onmousemove={handleMouseMove}
	ondblclick={handleDoubleClick}
/>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600&display=swap"
		rel="stylesheet"
	/>
	<style>
		body {
			margin: 0;
			padding: 0;
			background-color: #0a0b0c;
			color: #e0e0e0;
		}
	</style>
</svelte:head>

<main class="story-container">
	<!-- ... (Intro Sequence remains unchanged) ... -->
	<section class="intro-sequence">
		<div
			class="spotlight-overlay"
			class:hidden={!isSpotlightVisible}
			style="--x: {mouseX}%; --y: {mouseY}%;"
		></div>
		<div class="bg-grid"></div>
		<div class="cover-section">
			<div class="title-card">
				<h1>The Michigan Money Trail</h1>
				<p class="subtitle">
					An analysis of campaign finance flows in the 2024 State Election.
				</p>
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
		<div class="article-section">
			<div class="article-block">
				<span class="chapter-tag">Introduction</span>
				<h2>Follow the Money</h2>
				<p>
					<span class="drop-cap">M</span>ichigan has emerged as a decisive
					battleground in the 2024 election cycle. While public attention
					focuses on polling data, campaign finance records reveal a different
					story about the state's political landscape.
				</p>
				<p class="highlight-box">
					A comprehensive analysis of contribution data shows that despite the
					national spotlight,
					<strong
						>the majority of financial support originates from within the state
						itself</strong
					>.
				</p>
				<p>
					This report traces the flow of capital from individual donors to
					campaign war chests, identifying the key economic hubs and industries
					funding the race.
				</p>
			</div>
		</div>
	</section>

	<!-- ========================================= -->
	<!-- PART 2: VISUALIZATION (Sticky Map)        -->
	<!-- ========================================= -->
	<section class="viz-sequence">
		<!-- A. The Sticky Stage -->
		<div class="sticky-stage">
			<!-- FlowMap Wrapper (The Previous Chart) -->
			<div
				class="viz-wrapper"
				style:opacity={mapStep <= 6 ? 1 : 0}
				style:pointer-events={mapStep <= 6 ? "auto" : "none"}
				style:z-index={mapStep <= 6 ? 10 : 0}
				style:transform={mapStep === 4 ? "translateX(15%)" : "translateX(0)"}
				style:transition="opacity 0.4s ease-in-out, transform 1s ease-in-out"
			>
				<FlowMap {data} step={mapStep > 6 ? 6 : mapStep} {activeHighlight} />
			</div>

			<!-- Treemap Wrapper (The Funding Pool) -->
			<div
				class="viz-wrapper"
				style:opacity={mapStep >= 8 ? 1 : 0}
				style:pointer-events={mapStep >= 8 ? "auto" : "none"}
				style:z-index={mapStep >= 8 ? 10 : 0}
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
		<div class="scrolly-steps">
			<Scrolly bind:value={currentStep}>
				<!-- Step 0: Content -->
				<div class="step center-focus">
					<div class="card glass" class:active={currentStep === 0}>
						<span class="chapter-tag">Chapter I: The National Source</span>
						<h2>External Power Centers</h2>
						<p>
							Two specific regions outside of Michigan account for a
							disproportionate share of out-of-state funding.
						</p>
						<p>
							<span
								class="interactive"
								onmouseenter={() => setHighlight("DC")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">Washington D.C.</span
							>
							remains the primary hub for institutional lobbying, channeling funds
							to shape federal policy through state-level victories.
						</p>
						<p>
							Simultaneously,
							<span
								class="interactive"
								onmouseenter={() => setHighlight("CA")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">California</span
							>
							has become a major exporter of political capital. Wealth from the
							<strong>technology sector</strong> is being directed toward Michigan
							candidates, highlighting the industry's growing stake in Michigan politics.
						</p>
					</div>
				</div>

				<!-- Step 1: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 2: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 2}>
						<h2>Strategic Targeting</h2>
						<p>
							The inflow of capital is not evenly distributed. The data shows a
							high concentration of funds targeting specific zip codes.
						</p>
						<p>
							These areas correspond to "swing districts" where polling margins
							are tightest. Donors are strategically funneling resources into
							these battlegrounds to maximize the return on their political
							investment.
						</p>
					</div>
				</div>

				<!-- Step 3: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 4: Content -->
				<div class="step right-align">
					<div class="card glass" class:active={currentStep === 4}>
						<h2>The Local Majority</h2>
						<p>
							Comparing the source of funds reveals a distinct dichotomy between
							out-of-state and in-state contributions.
						</p>
						<ul class="stat-list">
							<li>
								<strong style="color: #EF5350;">Red Nodes (National)</strong>
								<span
									>Characterized by high-value individual checks, but lower
									overall transaction volume.</span
								>
							</li>
							<li>
								<strong style="color: #B39DDB;">Purple Nodes (Local)</strong>
								<span
									>Represent the vast majority of total contributions,
									indicating a broad base of grassroots support.</span
								>
							</li>
						</ul>
					</div>
				</div>

				<!-- Step 5: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 6: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 6}>
						<span class="chapter-tag">Chapter II: Michigan's Capital Flow</span>
						<h2>Urban Concentration</h2>
						<p>
							Aggregating data by county reveals significant disparities in
							fundraising capability.
						</p>
						<p>
							On this map, <strong
								>circle size corresponds to total funds received.</strong
							>
						</p>
						<p>
							The visualization highlights a stark urban-rural divide.
							Fundraising is heavily centralized in densely populated urban
							centers, while rural counties receive a fraction of the financial
							resources.
						</p>
					</div>
				</div>

				<!-- Step 7: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 8: Content -->
				<div class="step top-left-align">
					<div class="card glass" class:active={currentStep === 8}>
						<h2>Income vs. Expenditure</h2>
						<p>
							To analyze the flow of capital, we separate the data into two
							views: <strong>Total Income</strong> (Left) and
							<strong>Total Expenditure</strong> (Right).
						</p>
						<p>
							Some counties dominate the state's financial landscape.
							<span
								class="interactive"
								onmouseenter={() => setHighlight("Ingham")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">Ingham County</span
							>
							and
							<span
								class="interactive"
								onmouseenter={() => setHighlight("Oakland")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">Oakland County</span
							>
							account for the highest total income received, while
							<span
								class="interactive"
								onmouseenter={() => setHighlight("Ingham")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">Ingham County</span
							>
							and
							<span
								class="interactive"
								onmouseenter={() => setHighlight("Wayne")}
								onmouseleave={() => setHighlight(null)}
								role="button"
								tabindex="0">Wayne County</span
							>
							lead in total expenditure.
						</p>
						<p>
							Ingham County is a financial heavyweight simply because it is home
							to Lansing, the state capital. As the center of Michigan politics,
							it attracts steady money from government groups and lobbyists.
							Oakland County also tops the income list, driven by its wealthy
							suburbs and thriving business districts that fuel large donations.
						</p>
						<p>
							On the spending side, Wayne County joins Ingham at the top. This
							is largely due to Detroit, the state’s largest city, where a
							massive population demands heavy spending on campaigns and local
							projects. Together, these counties show a clear trend: money flows
							exactly where political power is concentrated and where the most
							people live.
						</p>
						<div class="legend-row">
							<div><span class="dot purple"></span> Income</div>
							<div><span class="dot yellow"></span> Expenditure</div>
						</div>
					</div>
				</div>

				<!-- Step 9: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 10: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 10}>
						<h2>Net Flow Analysis</h2>
						<p>
							Raw fundraising totals do not tell the whole story. The critical
							metric is the net flow of capital.
						</p>
						<p>
							By calculating the difference between funds raised and funds
							spent, we can identify which counties act as "Donors" to the
							system and which serve as the "Battlegrounds" where resources are
							consumed.
						</p>
					</div>
				</div>

				<!-- Step 11: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 12: Content -->
				<div class="step center-focus">
					<div class="card glass" class:active={currentStep === 12}>
						<h2>Capital Migration</h2>
						<p>
							This alluvial diagram tracks the lifecycle of campaign dollars,
							mapping <strong>Contributions</strong> (Left) to
							<strong>Expenditures</strong> (Right).
						</p>
						<p>
							The flow indicates a transfer of wealth from affluent suburbs to
							contested districts.
						</p>
						<ul class="stat-list">
							<li>
								<strong style="color: #9C27B0;"
									>Purple Ribbons (Net Exporters)</strong
								>
								<span
									>Wealthy areas like <strong>Oakland County</strong> generate surplus
									capital, which is then redistributed to support races across the
									state.</span
								>
							</li>
							<li>
								<strong style="color: #FFC107;"
									>Yellow Ribbons (Net Consumers)</strong
								>
								<span
									>Key political hubs, particularly <strong
										>Ingham County</strong
									> (Lansing), absorb and spend the majority of funds on statewide
									operations and media buys.</span
								>
							</li>
						</ul>
					</div>
				</div>

				<!-- Step 13: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 14: Content -->
				<div class="step center-focus">
					<div class="card glass" class:active={currentStep === 14}>
						<span class="chapter-tag">Chapter III: Industry & Influence</span>
						<h2>The Industry Breakdown</h2>
						<p>
							We have mapped the money across every county in Michigan. We know
							exactly where the cash is raised and where it is spent.
						</p>
						<p>
							But a map cannot tell us everything. We also need to know who is
							writing the checks.
						</p>
						<p>
							The next step is to look at the industries behind the donations.
							We will see exactly which business sectors are leading the
							spending in this election.
						</p>
					</div>
				</div>

				<!-- Step 15: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 16: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 16}>
						<span class="chapter-tag">Time & Trends</span>
						<h2>2020: The Starting Point</h2>
						<p>
							We begin with the 2020 election. This gives us a clear picture of
							a standard election year.
						</p>
						<p>
							<strong>Business</strong> ($15M) and <strong>Legal</strong> groups
							are the biggest donors. Look at the large blue circles. Corporate executives
							are already the main source of cash.
						</p>
					</div>
				</div>

				<!-- Step 17: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 18: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 18}>
						<span class="chapter-tag">Time & Trends</span>
						<h2>2021: The Quiet Growth</h2>
						<p>
							Usually, donations drop after an election ends. But 2021 was
							different.
						</p>
						<p>
							While other groups spent less, <strong>Business</strong> donations
							actually went up to <strong>$17M</strong>. Even in a quiet year,
							corporate leaders kept writing checks to prepare for the future.
						</p>
					</div>
				</div>

				<!-- Step 19: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 20: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 20}>
						<span class="chapter-tag">Time & Trends</span>
						<h2>2022: The Explosion</h2>
						<p>Then came the 2022 midterms. The chart explodes.</p>
						<p>
							Money flooded the system. Business spending tripled to nearly <strong
								>$62M</strong
							>. The blue bubbles take over most of the chart. This was a
							massive financial fight for control of the state government.
						</p>
					</div>
				</div>

				<!-- Step 21: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 22: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 22}>
						<span class="chapter-tag">Time & Trends</span>
						<h2>2023: The Reset</h2>
						<p>
							After the record-breaking spending of 2022, the system finally
							took a break.
						</p>
						<p>
							Total donations dropped sharply. We returned to normal levels as
							donors started saving their money for the next big cycle.
						</p>
					</div>
				</div>

				<!-- Step 23: Spacer -->
				<div class="step spacer"></div>

				<!-- Step 24: Content -->
				<div class="step left-align">
					<div class="card glass" class:active={currentStep === 24}>
						<span class="chapter-tag">Time & Trends</span>
						<h2>2024: Heating Up Again</h2>
						<p>
							We are now in the current election cycle. The money is flowing
							back in.
						</p>
						<p>
							Early numbers show <strong>Business</strong> ($20M) is already spending
							more than it did back in 2020. The pattern is repeating, but the price
							of the election is getting higher.
						</p>
					</div>
				</div>

				<!-- Step 25: Spacer -->
				<div class="step spacer"></div>
			</Scrolly>
		</div>
	</section>

	<!-- ... (Sector Stream remains unchanged) ... -->
	<section class="stream-section">
		<div class="stream-wrapper">
			<SectorStream rawData={data.sectorData} />
		</div>
	</section>
</main>

<style>
	/* ... (Styles remain the same as previous, ensuring .step.spacer exists) ... */
	.intro-sequence {
		position: relative;
		z-index: 20;
		background-color: #0a0b0c;
		padding-bottom: 10vh;
	}
	.bg-grid {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 40px 40px;
		-webkit-mask-image: radial-gradient(
			circle at center,
			black 40%,
			transparent 80%
		);
		mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
	}

	.cover-section,
	.article-section {
		position: relative;
		z-index: 2;
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
	.viz-sequence {
		position: relative;
		z-index: 10;
	}
	.sticky-stage {
		position: -webkit-sticky;
		position: sticky;
		top: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1;
		background-color: #0a0b0c;
		overflow: hidden;
		box-shadow: 0 -10px 50px rgba(0, 0, 0, 0.5);
		pointer-events: auto;
	}
	.viz-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		/* Default transition for other wrappers (like Treemap) */
		transition:
			opacity 1s ease-in-out,
			transform 1s ease-in-out;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.scrolly-steps {
		position: relative;
		z-index: 10;
		padding-top: 30vh;
		padding-bottom: 20vh;
		pointer-events: none;
	}
	.spotlight-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
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
	.spotlight-overlay.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.start-btn {
		background: transparent;
		border: 1px solid #ffd700;
		color: #ffd700;
		padding: 1rem 2rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 1rem;
		cursor: pointer;
		margin: 2rem 0;
		transition: all 0.3s;
		text-transform: uppercase;
		letter-spacing: 2px;
		position: relative;
		z-index: 1000;
		pointer-events: auto;
	}
	.start-btn:hover {
		background: #ffd700;
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
		font-family: "Playfair Display", serif;
		font-size: 2.2rem;
		color: #ffd700;
		margin-bottom: 2rem;
	}
	.highlight-box {
		border-left: 3px solid #ffd700;
		padding-left: 1.5rem;
		color: #e0e0e0;
		font-style: italic;
		background: rgba(255, 215, 0, 0.05);
		padding: 1.5rem;
		border-radius: 0 6px 6px 0;
	}
	.highlight-box strong {
		color: #ffd700;
	}
	.step {
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.step.spacer {
		height: 70vh;
	}
	.center-focus {
		justify-content: center;
	}
	.left-align {
		justify-content: flex-start;
		padding-left: 5%;
	}
	.right-align {
		justify-content: flex-end;
		padding-right: 5%;
	}
	.top-left-align {
		justify-content: flex-start;
		align-items: flex-start;
		padding-top: 20vh;
		padding-left: 5%;
	}
	.card {
		background: rgba(18, 18, 18, 0.55);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 2px solid rgba(255, 255, 255, 0.08);
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		border-bottom: 1px solid rgba(0, 0, 0, 0.4);
		padding: 2.5rem;
		border-radius: 4px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
		max-width: 500px;
		color: #ddd;
		opacity: 0;
		transform: translateY(30px);
		transition:
			opacity 0.6s ease-out,
			transform 0.6s ease-out;
		pointer-events: auto;
	}
	.card.active {
		opacity: 1;
		transform: translateY(0);
	}
	.title-card {
		text-align: center;
		pointer-events: auto;
	}
	h1 {
		font-family: "Playfair Display", serif;
		font-size: 4.5rem;
		margin: 0 0 1.5rem 0;
		background: linear-gradient(
			to bottom,
			#fff8e1 0%,
			#ffd700 45%,
			#b8860b 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		filter: drop-shadow(0 2px 0px rgba(0, 0, 0, 0.5))
			drop-shadow(0 0 30px rgba(255, 215, 0, 0.2));
		letter-spacing: -0.03em;
	}
	.subtitle {
		font-size: 1.3rem;
		color: #d7d7d7;
		margin-bottom: 2rem;
		font-weight: 300;
		font-family: "Playfair Display", serif;
		font-style: italic;
	}
	.scroll-hint {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.9rem;
		color: #ffd700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.8;
		transition: opacity 0.5s;
		margin-top: 2rem;
	}
	.interactive {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.9em;
		color: #ffd700;
		border-bottom: 1px dashed #ffd700;
		cursor: help;
		transition: all 0.2s ease-in-out;
		pointer-events: auto;
		position: relative;
		padding: 0 2px;
	}
	.interactive:hover {
		background: rgba(255, 215, 0, 0.2);
		color: #fff;
		border-bottom: 1px dashed #ffd700;
		border-radius: 3px;
		text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
	}
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
	.year-sidebar.visible {
		opacity: 1;
		pointer-events: auto;
	}
	.year-item {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		cursor: pointer;
		opacity: 0.4;
		transition: all 0.3s;
	}
	.year-item:hover {
		opacity: 0.8;
	}
	.year-item.active {
		opacity: 1;
		transform: scale(1.1);
	}
	.year-text {
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		color: #fff;
	}
	.year-dot {
		width: 6px;
		height: 6px;
		background: #fff;
		border-radius: 50%;
		transition: all 0.3s;
	}
	.year-item.active .year-dot {
		background: #ffd700;
		box-shadow: 0 0 8px #ffd700;
		transform: scale(1.5);
	}
	.chapter-tag {
		font-family: "JetBrains Mono", monospace;
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #ffd700;
		font-weight: bold;
		display: block;
		opacity: 0.9;
	}
	.drop-cap {
		float: left;
		font-family: "Playfair Display", serif;
		font-size: 3.2rem;
		line-height: 0.8;
		margin-right: 0.5rem;
		margin-top: 0.2rem;
		color: #ffd700;
	}
	.stat-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0 0;
	}
	.stat-list li {
		margin-bottom: 1rem;
		font-size: 0.95rem;
	}
	.stat-list li > strong {
		display: block;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.85rem;
		margin-bottom: 0.2rem;
	}
	.legend-row {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.8rem;
	}
	.dot {
		width: 10px;
		height: 10px;
		display: inline-block;
		border-radius: 50%;
		margin-right: 5px;
	}
	.purple {
		background: #9c27b0;
	}
	.yellow {
		background: #ffc107;
	}
	.stream-section {
		position: relative;
		z-index: 20;
		background: #040404;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		/* REMOVED: border-top: 1px solid rgba(255, 255, 255, 0.1); */
		/* Added shadow for smoother transition instead of hard line */
		box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.8);
	}
	.stream-wrapper {
		width: 100%;
		max-width: 1400px;
	}

	p::selection, h1::selection, h2::selection, span::selection, strong::selection, div::selection {
		background-color: rgb(129, 80, 202); /* 段落选中背景颜色 */
		color: black; /* 段落选中文字颜色 */
	}
</style>
