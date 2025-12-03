<script>
	import * as d3 from "d3";

	// Receive JSON data passed from outside
	let { rawData } = $props();

	let width = $state(1000);
	let height = 500;
	let margin = { top: 40, right: 20, bottom: 40, left: 20 };

	let hoverData = $state(null); // Store data in the time dimension (for Tooltip)
	let hoveredCategory = $state(null); // Store the name of the currently hovered category (for highlighting)

	let mouseX = $state(0);
	let containerWidth = $state(0);

	// 1. Data processing
	let processedData = $derived.by(() => {
		if (!rawData) return [];

		const categories = Array.from(
			new Set(rawData.map((d) => d["Big Category"]))
		);
		const grouped = d3.group(
			rawData,
			(d) => `${d.Year}-${String(d.Month).padStart(2, "0")}`
		);

		const formatted = Array.from(grouped, ([key, values]) => {
			const [year, month] = key.split("-").map(Number);
			const date = new Date(year, month - 1, 1);

			const entry = { date, total: 0 };
			categories.forEach((c) => (entry[c] = 0));

			values.forEach((v) => {
				entry[v["Big Category"]] = v.amount;
				entry.total += v.amount;
			});

			return entry;
		}).sort((a, b) => a.date - b.date);

		return { data: formatted, categories };
	});

	// 2. D3 Scales
	let scales = $derived.by(() => {
		const { data, categories } = processedData;
		if (!data || data.length === 0) return {};

		const stack = d3
			.stack()
			.keys(categories)
			.order(d3.stackOrderInsideOut)
			.offset(d3.stackOffsetWiggle);

		const series = stack(data);

		const x = d3
			.scaleTime()
			.domain(d3.extent(data, (d) => d.date))
			.range([margin.left, width - margin.right]);

		const minY = d3.min(series, (layer) => d3.min(layer, (d) => d[0]));
		const maxY = d3.max(series, (layer) => d3.max(layer, (d) => d[1]));

		const y = d3
			.scaleLinear()
			.domain([minY, maxY])
			.range([height - margin.bottom, margin.top]);

		const color = d3
			.scaleOrdinal()
			.domain(categories)
			.range([
				"#4FC3F7",
				"#FFB74D",
				"#EF5350",
				"#BA68C8",
				"#81C784",
				"#FFD54F",
				"#4DB6AC",
				"#A1887F",
				"#90A4AE",
				"#7986CB"
			]);

		const area = d3
			.area()
			.x((d) => x(d.data.date))
			.y0((d) => y(d[0]))
			.y1((d) => y(d[1]))
			.curve(d3.curveBasis);

		return { x, y, color, series, area };
	});

	// 3. Interaction logic
	function handleMouseMove(event) {
		const { data } = processedData;
		const { x } = scales;
		if (!x) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		containerWidth = bounds.width;

		const clientX = event.clientX - bounds.left;
		mouseX = clientX;

		const scaleRatio = width / bounds.width;
		const correctedX = clientX * scaleRatio;

		if (correctedX < margin.left || correctedX > width - margin.right) {
			hoverData = null;
			return;
		}

		const date = x.invert(correctedX);
		const index = d3.bisector((d) => d.date).center(data, date);
		hoverData = data[index];
	}

	function handleMouseLeave() {
		hoverData = null;
		hoveredCategory = null;
	}

	function getOpacity(layerKey) {
		if (!hoveredCategory) return 0.9;
		return hoveredCategory === layerKey ? 1 : 0.1;
	}
</script>

<div class="wrapper">
	<!-- Chart Section -->
	<div class="chart-container" bind:clientWidth={width}>
		<h2 class="chart-title">Spending Stream</h2>
		<p class="chart-subtitle">
			Evolution of expenditure categories over time (2020-2024)
		</p>

		{#if scales.series}
			<svg
				{width}
				{height}
				viewBox="0 0 {width} {height}"
				onmousemove={handleMouseMove}
				onmouseleave={handleMouseLeave}
				role="img"
			>
				<g>
					{#each scales.series as layer}
						<path
							d={scales.area(layer)}
							fill={scales.color(layer.key)}
							fill-opacity={getOpacity(layer.key)}
							stroke={hoveredCategory === layer.key
								? "#fff"
								: "rgba(255,255,255,0.05)"}
							stroke-width={hoveredCategory === layer.key ? 1.5 : 0.5}
							style:transition="fill-opacity 0.2s ease, stroke-width 0.2s ease"
							onmouseenter={() => (hoveredCategory = layer.key)}
							onmouseleave={() => (hoveredCategory = null)}
							role="graphics-symbol"
						/>
					{/each}
				</g>

				<g transform="translate(0, {height - margin.bottom})">
					<line
						x1={margin.left}
						x2={width - margin.right}
						stroke="#fff"
						stroke-opacity="0.1"
					/>
					{#each scales.x.ticks(width > 600 ? 10 : 5) as tick}
						<g transform="translate({scales.x(tick)}, 0)">
							<line y2="6" stroke="#fff" stroke-opacity="0.3" />
							<text
								y="20"
								fill="#aaa"
								font-size="10"
								text-anchor="middle"
								font-family="JetBrains Mono"
							>
								{d3.timeFormat("%Y-%m")(tick)}
							</text>
						</g>
					{/each}
				</g>

				{#if hoverData}
					<line
						x1={scales.x(hoverData.date)}
						x2={scales.x(hoverData.date)}
						y1={margin.top}
						y2={height - margin.bottom}
						stroke="#fff"
						stroke-dasharray="4"
						opacity="0.4"
						pointer-events="none"
					/>
				{/if}
			</svg>

			<div class="legend">
				{#each processedData.categories as cat}
					<div
						class="legend-item"
						class:dimmed={hoveredCategory && hoveredCategory !== cat}
						class:active={hoveredCategory === cat}
						onmouseenter={() => (hoveredCategory = cat)}
						onmouseleave={() => (hoveredCategory = null)}
						role="button"
						tabindex="0"
					>
						<span class="dot" style:background={scales.color(cat)}></span>
						<span class="label">{cat}</span>
					</div>
				{/each}
			</div>

			{#if hoverData}
				<div
					class="tooltip card glass"
					style:left="{Math.min(mouseX + 60, containerWidth - 220)}px"
					style:top="50px"
				>
					<div class="tooltip-header">
						{d3.timeFormat("%B %Y")(hoverData.date)}
					</div>
					<div class="tooltip-body">
						{#each processedData.categories
							.slice()
							.sort((a, b) => hoverData[b] - hoverData[a]) as cat}
							<div
								class="tooltip-row"
								style:opacity={hoveredCategory && hoveredCategory !== cat
									? 0.3
									: 1}
							>
								<span class="row-color" style:background={scales.color(cat)}
								></span>
								<span class="row-label">{cat}</span>
								<span class="row-val">${d3.format(",.0f")(hoverData[cat])}</span
								>
							</div>
						{/each}
						<div class="tooltip-total">
							<span>Total</span>
							<span>${d3.format(",.0f")(hoverData.total)}</span>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Chart Analysis Section -->
	<article class="narrative-section">
		<h3 class="narrative-title">
			The Money Cycle: How Industries Spend on US Elections
		</h3>
		<div class="narrative-content">
			<p>
				The chart above tells a clear story: political spending moves in waves.
				A huge spike is visible in <strong>late 2022</strong>. This demonstrates
				how much money poured in during the Midterm Elections, when control of
				Congress was at stake.
			</p>
			<!-- Modification 1: Unified the term Corporations to Business related -->
			<p>
				<strong>Why is "Business related" the biggest?</strong> The blue layer
				represents <strong>business related</strong> interests, and it is always
				the largest. <strong>Large companies and trade groups</strong> spend money
				steadily to protect their profits. They want favorable tax laws and stable
				rules, so they keep donating year-round, not just during election season.
			</p>
			<p>
				In contrast, other groups like <strong>Non-Workforce</strong> (the red layer)
				tend to react to big moments. Their spending jumps up when voters are angry
				or excited about specific issues. As the 2024 election approaches, the stream
				is widening again, indicating that the race is heating up.
			</p>
		</div>
	</article>

	<!-- Divider -->
	<hr class="section-divider" />

	<!-- Web Summary Section -->
	<section class="conclusion-section">
		<h3 class="conclusion-title">The Currency of Influence</h3>
		<div class="conclusion-text">
			<p>
				This investigation into Michigan's campaign finance data reveals a
				complex truth about <strong>the democratic system</strong>. While
				elections are often framed as a contest of ideas, the data shows they
				are also a contest of resources. From the tech hubs of California to the
				lobbying firms of D.C., money flows into Michigan because the outcome
				here shapes the future of the entire nation.
			</p>
			<!-- Modification 2: Changed Corporate donors to Business related groups -->
			<p>
				<strong>Business related</strong> groups provide the steady baseline of funding,
				ensuring their interests are always protected. Meanwhile, ideological groups
				create the sudden waves of cash that define the most heated moments of the
				campaign.
			</p>
			<p class="final-thought">
				As the next election cycle looms, one thing is clear: to understand the
				politics, one must first follow the money.
			</p>
		</div>

		<!-- Updated Footer -->
		<div class="footer-note">
			<p>
				&copy; {new Date().getFullYear()} Michigan Money Trail Investigation.
				<br />
				Created by <strong>Lubing Han</strong> & <strong>Rui Wang</strong>. All
				rights reserved.
			</p>
			<p>Data provided by the A2 Dive Activity.</p>
			<p>
				<a
					href="https://github.com/Heycoming/SI649-Final-Project"
					target="_blank"
					rel="noopener noreferrer"
					class="github-link"
				>
					View Project on GitHub ↗
				</a>
			</p>
		</div>
	</section>
</div>

<style>
	/* Wrapper to center everything */
	.wrapper {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: "Inter", sans-serif;
	}

	.chart-container {
		position: relative;
		width: 100%;
		margin-bottom: 3rem;
	}

	.chart-title {
		font-family: "Playfair Display", serif;
		color: #fff;
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}
	.chart-subtitle {
		color: #aaa;
		margin-bottom: 2rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.9rem;
	}

	svg {
		overflow: visible;
		cursor: crosshair;
		display: block;
	}

	/* Legend */
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.5rem;
		justify-content: center;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #ccc;
		cursor: pointer;
		transition:
			opacity 0.2s,
			transform 0.2s;
		padding: 4px 8px;
		border-radius: 4px;
	}
	.legend-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.legend-item.dimmed {
		opacity: 0.2;
	}
	.legend-item.active {
		opacity: 1;
		transform: scale(1.05);
		font-weight: bold;
		color: #fff;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		pointer-events: none;
		width: 200px;
		padding: 1rem;
		z-index: 100;
		background: rgba(18, 18, 18, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		color: #eee;
		font-size: 0.85rem;
		transition:
			left 0.1s ease-out,
			top 0.1s ease-out;
	}
	.tooltip-header {
		font-family: "Playfair Display", serif;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.25rem;
		color: #ffd700;
	}
	.tooltip-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
		transition: opacity 0.2s;
	}
	.row-color {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 6px;
	}
	.row-label {
		flex: 1;
		opacity: 0.8;
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row-val {
		font-family: "JetBrains Mono", monospace;
		font-weight: bold;
	}
	.tooltip-total {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed rgba(255, 255, 255, 0.2);
		display: flex;
		justify-content: space-between;
		font-weight: bold;
		color: #fff;
	}

	/* --- Narrative Section Styles --- */
	.narrative-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		color: #e0e0e0;
		animation: fadeIn 1s ease-out;
	}

	.narrative-title {
		font-family: "Playfair Display", serif;
		font-size: 1.8rem;
		margin-bottom: 1.5rem;
		color: #fff;
		background: linear-gradient(90deg, #fff, #aaa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.narrative-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		font-size: 1rem;
		line-height: 1.7;
		color: #ccc;
	}

	.narrative-content p {
		margin-bottom: 1rem;
	}

	.narrative-content strong {
		color: #fff;
		font-weight: 600;
	}

	/* --- New Conclusion Section Styles --- */
	.section-divider {
		border: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.2),
			transparent
		);
		margin: 4rem 0;
	}

	.conclusion-section {
		text-align: center;
		max-width: 800px;
		margin: 0 auto 4rem auto;
	}

	.conclusion-title {
		font-family: "Playfair Display", serif;
		font-size: 2.5rem;
		margin-bottom: 1.5rem;
		color: #ffd700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
	}

	.conclusion-text p {
		font-size: 1.1rem;
		line-height: 1.8;
		color: #d0d0d0;
		margin-bottom: 1.5rem;
	}

	.final-thought {
		font-weight: 600;
		color: #fff !important;
		font-style: italic;
		font-size: 1.3rem !important;
		margin-top: 2rem;
	}

	.footer-note {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		font-family: "JetBrains Mono", monospace;
		font-size: 0.75rem;
		color: #aaa; /* Modified: Changed from #666 to #aaa for better contrast */
	}

	/* Added styles for the GitHub link */
	.github-link {
		color: #58a6ff; /* GitHub Dark Mode Blue */
		text-decoration: none;
		font-weight: bold;
		display: inline-block;
		margin-top: 0.5rem;
		transition: color 0.2s ease;
	}

	.github-link:hover {
		color: #fff;
		text-decoration: underline;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
