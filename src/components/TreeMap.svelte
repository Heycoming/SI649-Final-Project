<!-- src/components/TreeMap.svelte -->
<script>
	import CirclePack from "$components/layercake/future/CirclePack.html.svelte";
	import Tooltip from "$components/layercake/migrate/Tooltip.html.svelte";
	import * as d3 from "d3";
	import { flip } from "svelte/animate";

	let { data, year } = $props();

	let width = $state(100);
	let height = $state(100);

	let tooltipEvent = $state({});

	const years = ["2020", "2021", "2022", "2023", "2024"];

	let maxYearlyTotal = $derived.by(() => {
		if (!data) return 1;
		const yearlyTotals = years.map((y) => d3.sum(data, (d) => +d[y] || 0));
		return d3.max(yearlyTotals) || 1;
	});

	let currentYearTotal = $derived.by(() => {
		if (!data) return 0;
		return d3.sum(data, (d) => +d[year.toString()] || 0);
	});

	let globalScale = $derived(Math.sqrt(currentYearTotal / maxYearlyTotal));

	let maxGrandTotal = $derived(
		data ? d3.max(data, (d) => +d["Grand Total"] || 0) : 1000000
	);
	let bigCategoriesList = $derived(
		data ? [...new Set(data.map((d) => d["Big Category"]))] : []
	);
	let categoryColorScale = $derived(
		d3.scaleOrdinal(d3.schemeTableau10).domain(bigCategoriesList)
	);

	let processedData = $derived.by(() => {
		if (!data) return [];
		const currentYearKey = year.toString();
		const result = [];
		const bigCategories = new Set();

		data.forEach((row) => {
			const smallCat = row["Small Category"];
			const bigCat = row["Big Category"];
			const val = +row[currentYearKey] || 0;
			const grandTot = +row["Grand Total"] || 0;

			result.push({
				id: smallCat,
				parent: bigCat,
				value: val,
				grandTotal: grandTot
			});

			if (!bigCategories.has(bigCat)) {
				bigCategories.add(bigCat);
				result.push({ id: bigCat, parent: "root", value: 0, grandTotal: 0 });
			}
		});
		result.push({ id: "root", parent: "", value: 0, grandTotal: 0 });
		return result;
	});

	let legendData = $derived.by(() => {
		if (!data) return [];
		const currentYearKey = year.toString();
		const rollup = d3.rollup(
			data,
			(v) => d3.sum(v, (d) => +d[currentYearKey] || 0),
			(d) => d["Big Category"]
		);
		return Array.from(rollup, ([key, value]) => ({
			key,
			value,
			color: categoryColorScale(key)
		})).sort((a, b) => b.value - a.value);
	});

	function calculateNodeColor(node) {
		if (node.depth === 1) {
			const baseColor = d3.color(categoryColorScale(node.data.id));
			baseColor.opacity = 0.25; 
			return baseColor.formatRgb();
		}
		if (node.depth === 2) {
			const parentColor = categoryColorScale(node.parent.data.id);
			const hsl = d3.hsl(parentColor);
			const t = node.data.data.grandTotal / maxGrandTotal;
			hsl.s = 0.8;
			hsl.l = 0.92 - t * 0.57;
			return hsl.formatRgb();
		}
		return "none";
	}

	function calculateTextColor(node) {
		if (node.depth === 1) return "#ffffff";
		if (node.depth === 2) {
			const bgColorString = calculateNodeColor(node);
			const c = d3.color(bgColorString);
			const brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
			return brightness > 140 ? "#1a1a1a" : "#ffffff";
		}
		return "#333";
	}

	const sortFunc = (a, b) =>
		(b.data.data.grandTotal || 0) - (a.data.data.grandTotal || 0);

	function handleHover(detail) {
		// 修复：增加空值检查，防止报错
		if (detail && detail.data) {
			tooltipEvent = { detail };
		} else {
			tooltipEvent = {};
		}
	}
</script>

<div class="viz-container">
	<!-- 1. Chart Area -->
	<div class="chart-area" bind:clientWidth={width} bind:clientHeight={height}>
		{#if width > 0 && height > 0}
			<CirclePack
				{width}
				{height}
				data={processedData}
				{globalScale}
				idKey="id"
				parentKey="parent"
				valueKey="value"
				getFill={calculateNodeColor}
				getTextColor={calculateTextColor}
				sortBy={sortFunc}
				stroke="rgba(255,255,255,0.4)"
				strokeWidth={1}
				labelVisibilityThreshold={(r) => r > 30}
				onHover={handleHover}
			/>
		{/if}
	</div>

	<!-- 2. Legend Area -->
	<div class="legend-area">
		<h3>Top Categories ({year})</h3>
		<div class="legend-list">
			{#each legendData as item (item.key)}
				<div class="legend-item" animate:flip={{ duration: 400 }}>
					<span class="legend-color" style="background: {item.color}"></span>
					<div class="legend-info">
						<span class="legend-name">{item.key}</span>
						<span class="legend-value">${d3.format(".2s")(item.value)}</span>
					</div>
					<div
						class="legend-bar"
						style="width: {(item.value / legendData[0].value) *
							100}%; background: {item.color}; opacity: 0.2;"
					></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 3. Tooltip -->
	<Tooltip evt={tooltipEvent}>
		{#snippet children(detail)}
			{#if detail && detail.parent}
				<div class="tt-header">
					<span
						class="tt-dot"
						style="background: {categoryColorScale(detail.parent.data.id)}"
					></span>
					<span class="tt-cat">{detail.parent.data.id}</span>
				</div>
				<div class="tt-title">{detail.data.id}</div>
				<div class="tt-amount">${d3.format(",.0f")(detail.value)}</div>
			{/if}
		{/snippet}
	</Tooltip>
</div>

<style>
	.viz-container {
		width: 100%;
		height: 100%;
		display: flex;
		padding-right: 150px; 
		box-sizing: border-box;
		align-items: center;
		padding-top: 40px;
		padding-bottom: 60px;
		margin: 0 40px;
		margin-left: 100px;
	}

	.chart-area {
		flex: 1;
		height: 100%;
		position: relative;
		min-height: 400px;
		z-index: 10;
		pointer-events: auto;
	}

	.legend-area {
		width: 240px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		/* Legend 层级保持高，但因为没有负 margin，不再遮挡 Chart */
		z-index: 50;
	}

	h3 {
		font-size: 13px;
		color: #bbb;
		margin-bottom: 15px;
		text-transform: uppercase;
		letter-spacing: 1px;
		border-bottom: 1px solid #555;
		padding-bottom: 8px;
	}

	.legend-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		position: relative;
		overflow: hidden;
		font-size: 12px;
	}

	.legend-color {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
		z-index: 2;
	}

	.legend-info {
		display: flex;
		justify-content: space-between;
		width: 100%;
		z-index: 2;
		position: relative;
	}

	.legend-name {
		font-weight: 600;
		color: #fff;
	}
	.legend-value {
		color: #ccc;
		font-family: monospace;
	}

	.legend-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		z-index: 1;
		transition: width 0.5s;
	}

	.tt-header {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
		font-size: 10px;
		color: #aaa;
		text-transform: uppercase;
	}
	.tt-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.tt-title {
		font-size: 13px;
		font-weight: 700;
		margin-bottom: 2px;
		color: #fff;
	}
	.tt-amount {
		font-size: 12px;
		color: #ffd700;
		font-family: monospace;
	}


</style>
