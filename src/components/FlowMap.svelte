<script>
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import * as topojson from "topojson-client";

	let { data, step = 0, activeHighlight = null } = $props();

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
	let cScaleRed = d3.scaleSqrt().range([0.2, 1]);
	let cScaleFunding = d3.scaleSqrt().range([0.3, 1]);
	let cScaleExp = d3.scaleSqrt().range([0.2, 1]);

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
	let annotationTarget = $state(null);

	// Show All Toggle
	let showAll = $state(false);

	let countyFundingMap = new Map();
	let countyExpMap = new Map();

	const projection = d3.geoAlbersUsa().scale(1300).translate([480, 300]);
	const pathGenerator = d3.geoPath().projection(projection);

	const centerLeft = { x: 300, y: 320 },
		centerRight = { x: 700, y: 320 };

	// === React to Highlights ===
	$effect(() => {
		if (activeHighlight) {
			const target = nodes.find(
				(n) =>
					(n.county && n.county.includes(activeHighlight)) ||
					n.contributor_state === activeHighlight
			);
			annotationTarget = target || null;
		} else {
			annotationTarget = null;
		}
	});

	// === Alluvial Logic ===
	function getNetColor(countyName) {
		if (!countyName) return "#444";
		const fund = countyFundingMap.get(countyName) || 0;
		const exp = countyExpMap.get(countyName) || 0;
		return fund >= exp ? "#9C27B0" : "#FFC107";
	}

	function getNetStatusLabel(countyName) {
		const fund = countyFundingMap.get(countyName) || 0;
		const exp = countyExpMap.get(countyName) || 0;
		const diff = fund - exp;
		return diff >= 0 ? "Net Contributor" : "Net Beneficiary";
	}

	function getRibbonPath(x1, y1, h1, x2, y2, h2) {
		const mx = (x1 + x2) / 2;
		return `M ${x1} ${y1} 
                C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2} 
                L ${x2} ${y2 + h2} 
                C ${mx} ${y2 + h2}, ${mx} ${y1 + h1}, ${x1} ${y1 + h1} 
                Z`;
	}

	function getOpacity(countyName) {
		if (!hoveredNode) return 0.8;
		return hoveredNode.county === countyName ? 1 : 0.1;
	}

	let alluvialData = $derived.by(() => {
		if (step !== 6 || !miCountyData || !expenditureData) return null;

		const margin = { top: 60, bottom: 60 };
		const height = baseHeight - margin.top - margin.bottom;

		let unionSet = new Set();
		if (showAll) {
			miCountyData.forEach((d) => unionSet.add(d.county));
			expenditureData.forEach((d) => unionSet.add(d.county));
		} else {
			const topN = 10;
			const topFunders = [...miCountyData]
				.sort((a, b) => b.total_amount - a.total_amount)
				.slice(0, topN)
				.map((d) => d.county);
			const topSpenders = [...expenditureData]
				.map((d) => ({ ...d, total_amount: +d.total_amount }))
				.sort((a, b) => b.total_amount - a.total_amount)
				.slice(0, topN)
				.map((d) => d.county);
			unionSet = new Set([...topFunders, ...topSpenders]);
		}

		let leftData = [...miCountyData]
			.filter((d) => unionSet.has(d.county))
			.map((d) => ({ ...d, val: d.total_amount }))
			.sort((a, b) => b.val - a.val);
		let rightData = [...expenditureData]
			.filter((d) => unionSet.has(d.county))
			.map((d) => ({ ...d, val: +d.total_amount }))
			.sort((a, b) => b.val - a.val);

		const totalFunding = d3.sum(leftData, (d) => d.val);
		const totalExp = d3.sum(rightData, (d) => d.val);
		const maxTotal = Math.max(totalFunding, totalExp);
		const maxVal = Math.max(leftData[0]?.val || 0, rightData[0]?.val || 0);

		const yScale = d3.scaleLinear().domain([0, maxTotal]).range([0, height]);
		const barScale = d3.scaleLinear().domain([0, maxVal]).range([0, 140]);

		const xLeftCol = 220,
			xPool = 480,
			xRightCol = 740,
			colWidth = 10;

		const knotHeight = 50;
		const knotTop = margin.top + (height - knotHeight) / 2;
		const knotScale = d3
			.scaleLinear()
			.domain([0, maxTotal])
			.range([0, knotHeight]);

		let yCursor = margin.top + (height - yScale(totalFunding)) / 2;
		let knotCursorLeft = knotTop + (knotHeight - knotScale(totalFunding)) / 2;

		let leftItems = leftData.map((d) => {
			const h = yScale(d.val);
			const hKnot = knotScale(d.val);
			const color = getNetColor(d.county);
			const item = {
				...d,
				x: xLeftCol,
				y: yCursor,
				h: h,
				knotY: knotCursorLeft,
				knotH: hKnot,
				color: color,
				barLen: barScale(d.val)
			};
			yCursor += h;
			knotCursorLeft += hKnot;
			return item;
		});

		yCursor = margin.top + (height - yScale(totalExp)) / 2;
		let knotCursorRight = knotTop + (knotHeight - knotScale(totalExp)) / 2;

		let rightItems = rightData.map((d) => {
			const h = yScale(d.val);
			const hKnot = knotScale(d.val);
			const color = getNetColor(d.county);
			const item = {
				...d,
				x: xRightCol,
				y: yCursor,
				h: h,
				knotY: knotCursorRight,
				knotH: hKnot,
				color: color,
				barLen: barScale(d.val)
			};
			yCursor += h;
			knotCursorRight += hKnot;
			return item;
		});

		const leftLinks = leftItems.map((d) => ({
			path: getRibbonPath(
				d.x + colWidth,
				d.y,
				d.h,
				xPool - 2,
				d.knotY,
				d.knotH
			),
			color: d.color,
			data: d
		}));

		const rightLinks = rightItems.map((d) => ({
			path: getRibbonPath(xPool + 2, d.knotY, d.knotH, d.x, d.y, d.h),
			color: d.color,
			data: d
		}));

		return {
			leftItems,
			rightItems,
			leftLinks,
			rightLinks,
			xLeftCol,
			xRightCol,
			xPool,
			knotTop,
			knotHeight,
			colWidth
		};
	});

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

		const maxFunding = d3.max(fundingData, (d) => d.amount) || 0;
		const maxCounty = d3.max(miCountyData, (d) => d.total_amount) || 0;
		const maxExp = d3.max(expenditureData, (d) => +d.total_amount) || 0;
		const globalMax = Math.max(maxFunding, maxCounty, maxExp);

		rScale.domain([0, globalMax]);
		wScale.domain([0, maxFunding]);
		cScaleRed.domain([0, maxFunding]);
		cScaleFunding.domain([0, maxCounty]);
		cScaleExp.domain([0, maxExp]);

		miCountyData.forEach((d) => {
			if (d.county) countyFundingMap.set(d.county, d.total_amount);
		});
		expenditureData.forEach((d) => {
			if (d.county) countyExpMap.set(d.county, +d.total_amount);
		});

		let allNodes = [],
			processedArcs = [];

		fundingData.forEach((d) => {
			const s = projection([d.lon, d.lat]);
			const t = projection([d.dest_lon, d.dest_lat]);
			if (s && t) {
				const r = rScale(d.amount);
				const nodeColor = d3.interpolateReds(cScaleRed(d.amount));
				allNodes.push({
					...d,
					type: "out-state",
					homeX: s[0],
					homeY: s[1],
					x: s[0],
					y: s[1],
					r: Math.max(3, r * 0.7),
					r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.amount),
					color: nodeColor
				});
				const midX = (s[0] + t[0]) / 2;
				const midY =
					(s[1] + t[1]) / 2 -
					Math.sqrt(Math.pow(t[0] - s[0], 2) + Math.pow(t[1] - s[1], 2)) * 0.2;
				processedArcs.push({
					path: `M${s[0]},${s[1]} Q${midX},${midY} ${t[0]},${t[1]}`,
					color: nodeColor,
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
					homeX: c[0],
					homeY: c[1],
					x: c[0],
					y: c[1],
					r_map: Math.max(2, r * 0.15),
					r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.total_amount),
					color: d3.interpolatePurples(cScaleFunding(d.total_amount))
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
					homeX: c[0],
					homeY: c[1],
					x: c[0],
					y: c[1],
					r_map: Math.max(2, r * 0.15),
					r_compare: r,
					formattedAmount: d3.format("$,.0f")(d.total_amount),
					color: d3.interpolateYlOrBr(cScaleExp(d.total_amount))
				});
			}
		});

		nodes = allNodes;
		arcs = processedArcs;
		simulation = d3
			.forceSimulation(nodes)
			.alphaDecay(0.02)
			.on("tick", () => {
				nodes = [...nodes];
			});
		isReady = true;
	});

	// === Zoom & Physics ===
	$effect(() => {
		if (usFeatures.length > 0 && !miTarget) {
			const mi = usFeatures.find((f) => f.id === "26");
			if (mi) {
				const b = pathGenerator.bounds(mi);
				miCenter = { x: (b[0][0] + b[1][0]) / 2, y: (b[0][1] + b[1][1]) / 2 };
				const k =
					0.85 /
					Math.max(
						(b[1][0] - b[0][0]) / baseWidth,
						(b[1][1] - b[0][1]) / baseHeight
					);
				miTarget = { x: miCenter.x, y: miCenter.y, k };
			}
		}
	});

	$effect(() => {
		if (step >= 4 && step < 6 && miTarget) {
			let k_adj = step === 5 ? miTarget.k * 0.7 : miTarget.k;
			let x_shift = step === 5 ? 100 : 0;
			transformString = `translate(${baseWidth / 2 - k_adj * miTarget.x + x_shift}px, ${baseHeight / 2 - k_adj * miTarget.y}px) scale(${k_adj})`;
			currentScale = k_adj;
		} else {
			transformString = "translate(0,0) scale(1)";
			currentScale = 1;
		}
	});

	$effect(() => {
		if (!isReady || !simulation) return;
		simulation.alpha(1).restart();
		const collide = d3
			.forceCollide()
			.radius((d) => getCurrentRadius(d, step) + 1.5)
			.strength(0.8);
		simulation.force("x", null).force("y", null).force("collide", null);

		if (step <= 2) {
			simulation
				.force("x", d3.forceX((d) => d.homeX).strength(1))
				.force("y", d3.forceY((d) => d.homeY).strength(1));
		} else if (step === 3) {
			simulation
				.force(
					"x",
					d3
						.forceX((d) =>
							d.type === "out-state" ? centerLeft.x : centerRight.x
						)
						.strength(0.08)
				)
				.force(
					"y",
					d3
						.forceY((d) =>
							d.type === "out-state" ? centerLeft.y : centerRight.y
						)
						.strength(0.08)
				)
				.force("collide", collide);
		} else if (step === 4) {
			simulation
				.force(
					"x",
					d3
						.forceX((d) => {
							if (d.type === "out-state") return centerLeft.x;
							return d.homeX;
						})
						.strength((d) => (d.type === "out-state" ? 0.08 : 0.8))
				)
				.force(
					"y",
					d3
						.forceY((d) => (d.type === "out-state" ? centerLeft.y : d.homeY))
						.strength((d) => (d.type === "out-state" ? 0.08 : 0.8))
				);
		} else if (step >= 5) {
			simulation
				.force("x", d3.forceX((d) => d.homeX).strength(1))
				.force("y", d3.forceY((d) => d.homeY).strength(1));
		}
	});

	function getCurrentRadius(n, s) {
		if (n.type === "expenditure") return n.r_map;
		if (s === 3) return n.r_compare * 1.5;
		return n.type === "out-state" || s === 3 ? n.r_compare : n.r_map;
	}

	function getNodeOpacity(n, s) {
		if (s === 0) return 0;
		if (s === 5) return 0;
		if (s === 6) return 0;

		if (s <= 2) {
			if (n.type === "in-state") return 0;
			return n.type === "out-state" ? 0.95 : 0;
		}

		if (annotationTarget && s < 6) return n === annotationTarget ? 1 : 0.1;
		if (s === 3)
			return n.type === "out-state" || n.type === "in-state" ? 0.95 : 0;
		if (s === 4) return n.type === "in-state" ? 0.95 : 0;
		return 0;
	}

	function getCountyFill(feature, type) {
		let name = feature.properties.name;
		let val = 0;
		let col = "#333";
		if (!name) return col;
		if (type === "funding") {
			val = countyFundingMap.get(name) || 0;
			if (val > 0) col = d3.interpolatePurples(cScaleFunding(val));
		} else if (type === "expenditure") {
			val = countyExpMap.get(name) || 0;
			if (val > 0) col = d3.interpolateYlOrBr(cScaleExp(val));
		}
		return col;
	}

	function getStrokeColor(feature) {
		if (activeHighlight && feature.properties.name === activeHighlight)
			return "#FFF";
		return "#555";
	}
	function getStrokeWidth(feature) {
		if (activeHighlight && feature.properties.name === activeHighlight)
			return 2;
		return 0.5;
	}

	function handleHover(e, n) {
		if (getNodeOpacity(n, step) < 0.1) return;
		if (step !== 2 && step !== 5) {
			hoveredNode = n;
			tooltipPos = { x: e.clientX + 15, y: e.clientY + 15 };
		}
	}

	function handleMapHover(e, feature, type) {
		if (step === 4) {
			let name = feature.properties.name;
			let val =
				type === "funding"
					? countyFundingMap.get(name)
					: countyExpMap.get(name);
			hoveredNode = {
				county: name,
				formattedAmount: d3.format("$,.0f")(val || 0),
				type: type === "funding" ? "In-State Funding" : "Expenditure"
			};
			tooltipPos = { x: e.clientX + 15, y: e.clientY + 15 };
		}
	}

	function handleAlluvialHover(e, data, type) {
		hoveredNode = {
			county: data.county,
			formattedAmount: d3.format("$,.0f")(data.val),
			type: type,
			extra: getNetStatusLabel(data.county)
		};
		tooltipPos = { x: e.clientX + 15, y: e.clientY + 15 };
	}
</script>

<div
	class="map-container"
	bind:clientWidth={containerWidth}
	bind:clientHeight={containerHeight}
>
	{#if step === 6}
		<button class="toggle-btn" onclick={() => (showAll = !showAll)}>
			{showAll ? "Show Top 10" : "Show All Counties"}
		</button>
	{/if}

	<svg
		width="100%"
		height="100%"
		viewBox="0 0 {baseWidth} {baseHeight}"
		preserveAspectRatio="xMidYMid meet"
	>
		<g class="zoom-group" style="transform: {transformString};">
			<g
				class="map-layer"
				style="opacity: {step === 6 || step === 0
					? 0
					: 1}; transition: opacity 0.5s;"
			>
				{#if step < 4}
					{#each usFeatures as f}
						<path
							d={pathGenerator(f)}
							fill="none"
							stroke="#444"
							stroke-width="1"
							vector-effect="non-scaling-stroke"
							style="transition: opacity 1s;"
							opacity={step === 3 ? 0 : 1}
						/>
					{/each}
				{/if}
				<g
					class="mi-center"
					style="transition: opacity 1s; opacity: {step === 4
						? 1
						: 0}; pointer-events: {step === 4 ? 'auto' : 'none'};"
				>
					{#each miFeatures as f}
						<path
							d={pathGenerator(f)}
							fill="none"
							stroke="#666"
							stroke-width="0.5"
							vector-effect="non-scaling-stroke"
							style="cursor: pointer; transition: stroke 0.2s;"
							role="button"
							tabindex="0"
							aria-label="Interactive map region"
							onmouseenter={(e) => {
								e.target.setAttribute("stroke", "#FFF");
								e.target.setAttribute("stroke-width", "1.5");
								handleMapHover(e, f, "funding");
							}}
							onmouseleave={(e) => {
								e.target.setAttribute("stroke", "#666");
								e.target.setAttribute("stroke-width", "0.5");
								hoveredNode = null;
							}}
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									handleMapHover(e, f, "funding");
								}
							}}
						/>
					{/each}
				</g>
				<g
					class="split-maps"
					style="transition: opacity 1s; opacity: {step >= 5 ? 1 : 0};"
				>
					<g
						class="mi-left"
						style="transform: translate(-{200 / currentScale}px, 0);"
					>
						{#each miFeatures as f}
							<path
								d={pathGenerator(f)}
								stroke={getStrokeColor(f)}
								stroke-width={getStrokeWidth(f)}
								vector-effect="non-scaling-stroke"
								fill={getCountyFill(f, "funding")}
								style="transition: fill 1s, stroke 0.3s;"
							/>
						{/each}
						<text
							x={miCenter.x}
							y={miCenter.y - 150}
							text-anchor="middle"
							font-size="20"
							fill="#B39DDB"
							style="pointer-events: none;">Funding Inflow</text
						>
					</g>
					<g
						class="mi-right"
						style="transform: translate({200 / currentScale}px, 0);"
					>
						{#each miFeatures as f}
							<path
								d={pathGenerator(f)}
								stroke={getStrokeColor(f)}
								stroke-width={getStrokeWidth(f)}
								vector-effect="non-scaling-stroke"
								fill={getCountyFill(f, "expenditure")}
								style="transition: fill 1s, stroke 0.3s;"
							/>
						{/each}
						<text
							x={miCenter.x}
							y={miCenter.y - 150}
							text-anchor="middle"
							font-size="20"
							fill="#FFF59D"
							style="pointer-events: none;">Expenditures</text
						>
					</g>
				</g>
			</g>

			<g
				class="arc-layer"
				style="opacity: {step === 2 ? 1 : 0}; transition: opacity 1s;"
			>
				{#each arcs as arc}
					<path
						d={arc.path}
						fill="none"
						stroke={arc.color}
						stroke-width={arc.strokeWidth}
						stroke-linecap="round"
						opacity="0.9"
						class="flow-line"
						class:animate={step === 2}
						vector-effect="non-scaling-stroke"
					/>
				{/each}
			</g>

			<g class="particle-layer">
				{#each nodes as n}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						cx={n.x}
						cy={n.y}
						r={getCurrentRadius(n, step) / (step >= 4 ? currentScale * 0.8 : 1)}
						fill={n.color}
						stroke="none"
						style="transition: fill 0.5s, opacity 1s, r 1s; cursor: pointer;"
						opacity={getNodeOpacity(n, step)}
						onmouseenter={(e) => handleHover(e, n)}
						onmousemove={(e) => handleHover(e, hoveredNode)}
						onmouseleave={() => (hoveredNode = null)}
					/>
				{/each}
			</g>

			{#if annotationTarget && step < 5 && step > 0}
				<g class="annotation-layer" style="pointer-events: none;">
					<circle
						cx={annotationTarget.x}
						cy={annotationTarget.y}
						r={20 / currentScale}
						fill="none"
						stroke="#FFD700"
						stroke-width="2"
						opacity="0.8"
					>
						<animate
							attributeName="r"
							from={10 / currentScale}
							to={30 / currentScale}
							dur="1.5s"
							repeatCount="indefinite"
						/>
						<animate
							attributeName="opacity"
							from="1"
							to="0"
							dur="1.5s"
							repeatCount="indefinite"
						/>
					</circle>
					<line
						x1={annotationTarget.x}
						y1={annotationTarget.y}
						x2={annotationTarget.x + 40 / currentScale}
						y2={annotationTarget.y - 40 / currentScale}
						stroke="#FFD700"
						stroke-width="1.5"
					/>
					<text
						x={annotationTarget.x + 45 / currentScale}
						y={annotationTarget.y - 40 / currentScale}
						fill="#FFD700"
						font-size={14 / currentScale}
						font-weight="bold"
						alignment-baseline="middle"
					>
						{annotationTarget.county || annotationTarget.contributor_state}
					</text>
				</g>
			{/if}
		</g>

		{#if step === 6 && alluvialData}
			<g class="alluvial-layer" style="opacity: 1; transition: opacity 1s;">
				<!-- 1. Funding (Left) -->
				<g class="col-left">
					{#each alluvialData.leftLinks as link}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<path
							d={link.path}
							fill={link.color}
							stroke="none"
							opacity={getOpacity(link.data.county)}
							style="transition: opacity 0.2s; cursor: pointer;"
							onmouseenter={(e) =>
								handleAlluvialHover(e, link.data, "Contribution")}
							onmouseleave={() => (hoveredNode = null)}
						/>
					{/each}

					{#each alluvialData.leftItems as item}
						<rect
							x={item.x - 10 - item.barLen}
							y={item.y}
							width={item.barLen}
							height={item.h}
							fill={item.color}
							opacity={getOpacity(item.county)}
						/>
						<rect
							x={item.x}
							y={item.y}
							width={alluvialData.colWidth}
							height={item.h}
							fill={item.color}
							stroke="#121212"
							stroke-width="0.5"
							opacity={getOpacity(item.county)}
						/>

						{#if item.h > 10}
							<text
								x={item.x - 15 - item.barLen}
								y={item.y + item.h / 2}
								text-anchor="end"
								dominant-baseline="middle"
								fill="#ccc"
								font-size="11px"
								font-weight="bold"
								opacity={getOpacity(item.county)}
							>
								{item.county}
							</text>
						{/if}
					{/each}
					<text
						x={alluvialData.xLeftCol}
						y="40"
						text-anchor="end"
						font-weight="bold"
						fill="#9C27B0"
						font-size="16">Contributions</text
					>
				</g>

				<!-- 2. Pool (Center Knot) -->
				<g class="col-center">
					<rect
						x={alluvialData.xPool - 2}
						y={alluvialData.knotTop}
						width={4}
						height={alluvialData.knotHeight}
						fill="#fff"
						opacity="0.5"
						rx="2"
					/>
					<text
						x={alluvialData.xPool}
						y={alluvialData.knotTop - 20}
						text-anchor="middle"
						font-weight="bold"
						fill="#eee"
						font-size="14">Funding Pool</text
					>
				</g>

				<!-- 3. Expenditure (Right) -->
				<g class="col-right">
					{#each alluvialData.rightLinks as link}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<path
							d={link.path}
							fill={link.color}
							stroke="none"
							opacity={getOpacity(link.data.county)}
							style="transition: opacity 0.2s; cursor: pointer;"
							onmouseenter={(e) =>
								handleAlluvialHover(e, link.data, "Expenditure")}
							onmouseleave={() => (hoveredNode = null)}
						/>
					{/each}

					{#each alluvialData.rightItems as item}
						<rect
							x={item.x}
							y={item.y}
							width={alluvialData.colWidth}
							height={item.h}
							fill={item.color}
							stroke="#121212"
							stroke-width="0.5"
							opacity={getOpacity(item.county)}
						/>
						<rect
							x={item.x + alluvialData.colWidth + 5}
							y={item.y}
							width={item.barLen}
							height={item.h}
							fill={item.color}
							opacity={getOpacity(item.county)}
						/>

						{#if item.h > 10}
							<text
								x={item.x + alluvialData.colWidth + 10 + item.barLen}
								y={item.y + item.h / 2}
								text-anchor="start"
								dominant-baseline="middle"
								fill="#ccc"
								font-size="11px"
								font-weight="bold"
								opacity={getOpacity(item.county)}
							>
								{item.county}
							</text>
						{/if}
					{/each}
					<text
						x={alluvialData.xRightCol}
						y="40"
						text-anchor="start"
						font-weight="bold"
						fill="#FFC107"
						font-size="16">Expenditures</text
					>
				</g>
			</g>
		{/if}
	</svg>

	{#if hoveredNode}
		<div class="tooltip" style="top: {tooltipPos.y}px; left: {tooltipPos.x}px;">
			<strong
				>{hoveredNode.type === "out-state"
					? hoveredNode.contributor_state
					: hoveredNode.county}</strong
			><br />
			{#if hoveredNode.extra}
				<span
					style="color: {hoveredNode.extra.includes('Contributor')
						? '#9C27B0'
						: '#FFC107'}; font-weight: bold; font-size: 0.9em;"
				>
					{hoveredNode.extra}
				</span><br />
			{/if}
			{hoveredNode.formattedAmount}<br />
			<span style="font-size:0.85em; color:#aaa; text-transform:capitalize;"
				>{hoveredNode.type.replace("-", " ")}</span
			>
		</div>
	{/if}
</div>

<style>
	.map-container {
		width: 85%;
		height: 100vh;
		position: relative;
		background: transparent;
		overflow: hidden;
	}
	.zoom-group {
		transition: transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1);
		transform-origin: 0 0;
		will-change: transform;
	}

	.flow-line {
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
		transition: stroke-dashoffset 1.5s ease-in-out;
	}
	.flow-line.animate {
		stroke-dashoffset: 0;
	}

	.tooltip {
		position: fixed;
		background: rgba(30, 30, 30, 0.95);
		padding: 8px 12px;
		border: 1px solid #444;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		pointer-events: none;
		font-size: 13px;
		color: #eee;
		z-index: 100;
		transform: translate(0, -100%);
	}

	.toggle-btn {
		position: absolute;
		top: 20px;
		left: 90%;
		background: #333;
		color: #eee;
		border: 1px solid #555;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background 0.2s;
		z-index: 50;
	}
	.toggle-btn:hover {
		background: #444;
	}
</style>
