<script>
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import * as topojson from "topojson-client";

	let { data, step = 0 } = $props();

	let fundingData = $derived(data.fundingData);
	let miCountyData = $derived(data.miCountyData);
	let expenditureData = $derived(data.expenditureData || []);
	let usAtlas = $derived(data.usAtlas);

	// === Base Settings ===
	const baseWidth = 960,
		baseHeight = 600;
	let containerWidth = $state(960),
		containerHeight = $state(600);

	// === Scales ===
	let rScale = d3.scaleSqrt().range([4, 50]);
	let wScale = d3.scaleSqrt().range([5, 30]);
	let cScaleRed = d3.scaleSqrt().range(["#ED9C9C", "#D62728"]);

	// Scales for Choropleth
	let cScaleBlue = d3.scaleSqrt().range([0.1, 1]);
	let cScalePurple = d3.scaleSqrt().range([0.1, 1]);

	// === Internal State ===
	let usFeatures = $state([]);
	let miFeatures = $state([]);
	let nodes = $state([]),
		arcs = $state([]);
	let isReady = $state(false);
	let simulation;
	let transformString = $state("translate(0,0) scale(1)");
	let currentScale = $state(1);
	let miTarget = $state(null);
	let hoveredNode = $state(null),
		tooltipPos = $state({ x: 0, y: 0 });
	let miCenter = $state({ x: 0, y: 0 });

	// Maps for Choropleth
	let countyFundingMap = new Map();
	let countyExpMap = new Map();

	const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
	const pathGenerator = d3.geoPath().projection(projection);

	const centerLeft = { x: 300, y: 320 },
		centerRight = { x: 700, y: 320 };

	// === Initialization ===
	onMount(() => {
		if (!usAtlas || !fundingData || !miCountyData) return;

		usFeatures = topojson.feature(usAtlas, usAtlas.objects.states).features;
		if (usAtlas.objects.counties) {
			const allCounties = topojson.feature(
				usAtlas,
				usAtlas.objects.counties
			).features;
			miFeatures = allCounties.filter((f) => f.id.startsWith("26"));
		}

		// Set Domains
		const maxFunding = d3.max(fundingData, (d) => d.amount) || 0;
		const maxCounty = d3.max(miCountyData, (d) => d.total_amount) || 0;
        // 🟢 Ensure number conversion
		const maxExp = d3.max(expenditureData, (d) => +d.total_amount) || 0; 

		const globalMax = Math.max(maxFunding, maxCounty, maxExp);

		rScale.domain([0, globalMax]);
		wScale.domain([0, maxFunding]);
		cScaleRed.domain([0, maxFunding]);
		cScaleBlue.domain([0, maxCounty]);
		cScalePurple.domain([0, maxExp]);

		// Populate Data Maps
		miCountyData.forEach((d) => {
			if (d.county) countyFundingMap.set(d.county, d.total_amount);
		});
		expenditureData.forEach((d) => {
			if (d.county) countyExpMap.set(d.county, +d.total_amount);
		});

		let allNodes = [],
			processedArcs = [];

		// Process Data (Funding, In-State, Exp) - Same as before
		fundingData.forEach((d) => {
			const s = projection([d.lon, d.lat]);
			const t = projection([d.dest_lon, d.dest_lat]);
			if (s && t) {
				const r = rScale(d.amount);
				allNodes.push({
					...d,
					type: "out-state",
					homeX: s[0], homeY: s[1], x: s[0], y: s[1],
					r: Math.max(3, r * 0.7), r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.amount),
					color: cScaleRed(d.amount)
				});
				const midX = (s[0] + t[0]) / 2;
				const midY = (s[1] + t[1]) / 2 - Math.sqrt(Math.pow(t[0]-s[0],2) + Math.pow(t[1]-s[1],2)) * 0.2;
				processedArcs.push({
					path: `M${s[0]},${s[1]} Q${midX},${midY} ${t[0]},${t[1]}`,
					color: cScaleRed(d.amount),
					strokeWidth: wScale(d.amount)
				});
			}
		});

		miCountyData.forEach((d) => {
			const c = projection([d.lon, d.lat]);
			if (c) {
				const r = rScale(d.total_amount);
				allNodes.push({
					...d,
					type: "in-state",
					homeX: c[0], homeY: c[1], x: c[0], y: c[1],
					r_map: Math.max(2, r * 0.15), r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.total_amount),
					color: d3.interpolateBlues(cScaleBlue(d.total_amount))
				});
			}
		});

		expenditureData.forEach((d) => {
			const c = projection([d.lon, d.lat]);
			if (c) {
				const r = rScale(d.total_amount);
				allNodes.push({
					...d,
					type: "expenditure",
					homeX: c[0], homeY: c[1], x: c[0], y: c[1],
					r_map: Math.max(2, r * 0.15), r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.total_amount),
					color: d3.interpolatePurples(cScalePurple(d.amount))
				});
			}
		});

		nodes = allNodes;
		arcs = processedArcs;

		simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.02)
			.on("tick", () => { nodes = [...nodes]; });

		isReady = true;
	});

	// === Zoom Logic ===
	$effect(() => {
		if (usFeatures.length > 0 && !miTarget) {
			const mi = usFeatures.find((f) => f.id === "26");
			if (mi) {
				const b = pathGenerator.bounds(mi);
				miCenter = { x: (b[0][0] + b[1][0]) / 2, y: (b[0][1] + b[1][1]) / 2 };
				const k = 0.85 / Math.max((b[1][0] - b[0][0]) / baseWidth, (b[1][1] - b[0][1]) / baseHeight);
				miTarget = { x: miCenter.x, y: miCenter.y, k };
			}
		}
	});

	$effect(() => {
		if (step >= 3 && miTarget) {
			// 🟢 Step 4 (Split) needs slightly less zoom to fit two maps side-by-side
			let k_adj = step === 4 ? miTarget.k * 0.7 : miTarget.k;
			transformString = `translate(${baseWidth / 2 - k_adj * miTarget.x}px, ${baseHeight / 2 - k_adj * miTarget.y}px) scale(${k_adj})`;
			currentScale = k_adj;
		} else {
			transformString = "translate(0,0) scale(1)";
			currentScale = 1;
		}
	});

	// === Physics Engine ===
	$effect(() => {
		if (!isReady || !simulation) return;
		simulation.alpha(1).restart();

		const collide = d3.forceCollide().radius((d) => getCurrentRadius(d, step) + 1.5).strength(0.8);
		simulation.force("x", null).force("y", null).force("collide", null);

		// 🔴 Removed the "splitOffset" calculation for bubbles, as bubbles are hidden in Step 4

		if (step === 0 || step === 1) {
			simulation
				.force("x", d3.forceX((d) => d.homeX).strength(1))
				.force("y", d3.forceY((d) => d.homeY).strength(1));
		} else if (step === 2) {
			simulation
				.force("x", d3.forceX((d) => d.type === "out-state" ? centerLeft.x : centerRight.x).strength(0.08))
				.force("y", d3.forceY((d) => d.type === "out-state" ? centerLeft.y : centerRight.y).strength(0.08))
				.force("collide", collide);
		} else if (step === 3) {
			// MI Focused: Out-state at left, In-state at home(MI)
			simulation
				.force("x", d3.forceX((d) => {
					if (d.type === "out-state") return centerLeft.x;
					return d.homeX;
				}).strength((d) => (d.type === "out-state" ? 0.08 : 0.8)))
				.force("y", d3.forceY((d) => (d.type === "out-state" ? centerLeft.y : d.homeY))
					.strength((d) => (d.type === "out-state" ? 0.08 : 0.8)));
		} else if (step === 4) {
			// 🟢 Step 4 (Final): Just keep particles at home (they will be hidden by opacity)
            // This prevents them from flying around invisibly.
			simulation
				.force("x", d3.forceX((d) => d.homeX).strength(1))
				.force("y", d3.forceY((d) => d.homeY).strength(1));
		}
	});

	// === Helpers ===
	function getCurrentRadius(n, s) {
		if (n.type === "expenditure") return n.r_map;
		return n.type === "out-state" || s === 2 ? n.r_compare : n.r_map;
	}

	function getNodeOpacity(n, s) {
		if (s <= 1) return n.type === "out-state" ? 0.95 : 0;
		if (s === 2) return n.type === "out-state" || n.type === "in-state" ? 0.95 : 0;
		if (s === 3) return n.type === "in-state" ? 0.95 : 0;
		if (s === 4) return 0; // 🟢 Hide ALL particles in Step 4 (Choropleth only)
		return 0;
	}

	function getCountyFill(feature, type) {
		let name = feature.properties.name;
		let val = 0;
		let col = "#f9f9f9";

		if (!name) return col;

		if (type === "funding") {
			val = countyFundingMap.get(name) || 0;
			if (val > 0) col = d3.interpolateBlues(cScaleBlue(val));
		} else if (type === "expenditure") {
			val = countyExpMap.get(name) || 0;
			if (val > 0) col = d3.interpolatePurples(cScalePurple(val));
		}
		return col;
	}

	function handleHover(e, n) {
		if (step !== 1 && step !== 4) { // Disable hover in step 4
			hoveredNode = n;
			tooltipPos = { x: e.clientX + 15, y: e.clientY + 15 };
		}
	}
</script>

<div class="map-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	<svg width="100%" height="100%" viewBox="0 0 {baseWidth} {baseHeight}" preserveAspectRatio="xMidYMid meet">
		<g class="zoom-group" style="transform: {transformString};">
			<g class="map-layer">
				<!-- 1. USA Background (Steps 0-2) -->
				{#if step < 3}
					{#each usFeatures as f}
						<path d={pathGenerator(f)} fill="none" stroke="#e0e0e0" stroke-width="1.5" vector-effect="non-scaling-stroke" style="transition: opacity 1s;" opacity={step === 2 ? 0 : 1} />
					{/each}
				{/if}

				<!-- 2. Single MI Map (Step 3 ONLY) -->
                <!-- 🟢 Transition: Fades out when step becomes 4 -->
				<g class="mi-center" style="transition: opacity 1s; opacity: {step === 3 ? 1 : 0}; pointer-events: {step === 3 ? 'auto' : 'none'};">
                    {#each miFeatures as f}
                        <path d={pathGenerator(f)} fill="none" stroke="#ccc" stroke-width="0.5" vector-effect="non-scaling-stroke" />
                    {/each}
				</g>

				<!-- 3. Split MI Maps (Step 4 ONLY) -->
                <!-- 🟢 Transition: Fades in when step becomes 4 -->
				<g class="split-maps" style="transition: opacity 1s; opacity: {step === 4 ? 1 : 0}; pointer-events: {step === 4 ? 'auto' : 'none'};">
					<!-- Left Map: Funding -->
					<g class="mi-left" style="transform: translate(-{200 / currentScale}px, 0);">
						{#each miFeatures as f}
							<path d={pathGenerator(f)} stroke="#ccc" stroke-width="0.5" vector-effect="non-scaling-stroke" 
                                  fill={getCountyFill(f, "funding")} style="transition: fill 1s;" />
						{/each}
						<text x={miCenter.x} y={miCenter.y - 150} text-anchor="middle" font-size="20" fill="#08519C" style="pointer-events: none;">Funding Inflow</text>
					</g>

					<!-- Right Map: Expenditure -->
					<g class="mi-right" style="transform: translate({200 / currentScale}px, 0);">
						{#each miFeatures as f}
							<path d={pathGenerator(f)} stroke="#ccc" stroke-width="0.5" vector-effect="non-scaling-stroke" 
                                  fill={getCountyFill(f, "expenditure")} style="transition: fill 1s;" />
						{/each}
						<text x={miCenter.x} y={miCenter.y - 150} text-anchor="middle" font-size="20" fill="#512DA8" style="pointer-events: none;">Expenditures</text>
					</g>
				</g>
			</g>

			<g class="arc-layer" style="opacity: {step === 1 ? 1 : 0}; transition: opacity 1s;">
				{#each arcs as arc}
					<path d={arc.path} fill="none" stroke={arc.color} stroke-width={arc.strokeWidth} stroke-linecap="round" opacity="0.9" class="flow-line" class:animate={step === 1} vector-effect="non-scaling-stroke" />
				{/each}
			</g>

			<g class="particle-layer">
				{#each nodes as n}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle cx={n.x} cy={n.y} r={getCurrentRadius(n, step) / (step >= 3 ? currentScale * 0.8 : 1)} 
                            fill={n.color} stroke="white" stroke-width={1.5 / (step >= 3 ? currentScale : 1)} 
                            style="transition: fill 0.5s, opacity 1s, r 1s; cursor: pointer;" 
                            opacity={getNodeOpacity(n, step)} 
                            onmouseenter={(e) => handleHover(e, n)} 
                            onmousemove={(e) => handleHover(e, hoveredNode)} 
                            onmouseleave={() => (hoveredNode = null)} />
				{/each}
			</g>
		</g>

		<g class="labels-layer" style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s; pointer-events: none;">
			<text x={centerLeft.x} y="520" text-anchor="middle" font-weight="bold" fill="#D62728" font-size="16">Out-of-State</text>
			<text x={centerRight.x} y="520" text-anchor="middle" font-weight="bold" fill="#08519C" font-size="16">In-State</text>
		</g>
	</svg>

	{#if hoveredNode}
		<div class="tooltip" style="top: {tooltipPos.y}px; left: {tooltipPos.x}px;">
			<strong>{hoveredNode.type === "out-state" ? hoveredNode.contributor_state : hoveredNode.county}</strong><br />
			{hoveredNode.formattedAmount}<br />
			<span style="font-size:0.85em; color:#666; text-transform:capitalize;">{hoveredNode.type.replace("-", " ")}</span>
		</div>
	{/if}
</div>

<style>
	.map-container { width: 100%; height: 100vh; position: relative; background: white; overflow: hidden; }
	.zoom-group { transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1); transform-origin: 0 0; will-change: transform; }
	.flow-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; transition: stroke-dashoffset 1.5s ease-in-out; }
	.flow-line.animate { stroke-dashoffset: 0; }
	.tooltip { position: fixed; background: rgba(255, 255, 255, 0.98); padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); pointer-events: none; font-size: 13px; color: #333; z-index: 100; transform: translate(0, -100%); }
</style>
