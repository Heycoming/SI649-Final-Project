<!-- src/components/layercake/future/CirclePack.html.svelte -->
<script>
	import { stratify, pack, hierarchy } from "d3-hierarchy";
	import { format } from "d3-format";

	let {
		width,
		height,
		data,
		globalScale = 1,
		idKey = "id",
		parentKey = undefined,
		valueKey = "value",
		getFill = undefined,
		getTextColor = undefined,
		labelVisibilityThreshold = (r) => r > 20,
		stroke = "#999",
		strokeWidth = 1,
		sortBy = (a, b) => b.value - a.value,
		spacing = 0,
		onHover = undefined
	} = $props();

	let parent = $state({});
	let hoverTimeout = undefined; // 防抖定时器

	let dataset = $derived.by(() => {
		if (parentKey === undefined) {
			return [...data, { [idKey]: "all" }];
		}
		return data;
	});

	$effect(() => {
		if (parentKey === undefined) {
			parent = { [idKey]: "all" };
		}
	});

	let stratifier = $derived(
		stratify()
			.id((d) => d[idKey])
			.parentId((d) => {
				if (d[idKey] === parent[idKey]) return "";
				return d[parentKey] || parent[idKey];
			})
	);

	let packer = $derived(
		pack()
			.size([width, height])
			.padding(spacing + 8)
	);

	let stratified = $derived(stratifier(dataset));

	let root = $derived(
		hierarchy(stratified)
			.sum((d, i) => d.data[valueKey] || 0)
			.sort(sortBy)
	);

	let packed = $derived(packer(root));
	let descendants = $derived(packed.descendants());

	// 优化：单词首字母大写
	const titleCase = (d) =>
		d.toLowerCase().replace(/(?:^|\s)\w/g, (w) => w.toUpperCase());
	const commas = format(",");

	function getScaled(d) {
		const cx = width / 2;
		const cy = height / 2;
		const dx = (d.x - cx) * globalScale;
		const dy = (d.y - cy) * globalScale;
		return {
			x: cx + dx,
			y: cy + dy,
			r: d.r * globalScale
		};
	}

	// 径向标签计算
	function getRadialInfo(s) {
		const cx = width / 2;
		const cy = height / 2;
		const dx = s.x - cx;
		const dy = s.y - cy;
		const angle = Math.atan2(dy, dx);
		const deg = angle * (180 / Math.PI);
		const dist = Math.sqrt(dx * dx + dy * dy);
		const maxDist = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2) || 1;
		const factor = 1 - dist / maxDist;
		const lineLength = 40 + factor * 60;
		return { deg, lineLength };
	}

	// --- 鼠标交互逻辑 (含防抖) ---

	function handleMouseEnter(e, d) {
		// 进入新圆圈，立即清除“隐藏”定时器
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = undefined;
		}
		if (onHover && d.depth === 2) {
			onHover({
				data: d.data,
				parent: d.parent,
				value: d.value,
				x: e.clientX,
				y: e.clientY
			});
		}
	}

	function handleMouseMove(e, d) {
		// 移动中也要清除定时器，保持显示
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = undefined;
		}
		if (onHover && d.depth === 2) {
			onHover({
				data: d.data,
				parent: d.parent,
				value: d.value,
				x: e.clientX,
				y: e.clientY
			});
		}
	}

	function handleMouseLeave() {
		// 离开时，延迟 100ms 再隐藏
		// 如果在这 100ms 内进入了另一个圆圈，handleMouseEnter 会取消这个操作
		if (onHover) {
			hoverTimeout = setTimeout(() => {
				onHover(null);
			}, 100);
		}
	}
</script>

<div class="circle-pack" data-has-parent-key={parentKey !== undefined}>
	{#each descendants as d (d.data.id)}
		{@const s = getScaled(d)}

		{@const isSmallCircleVisible =
			d.depth === 2 && labelVisibilityThreshold(s.r)}
		{@const isBigCircle = d.depth === 1}
		<!-- 大圆圈且半径小于 130 时使用外部标签 -->
		{@const isBigCircleSmall = isBigCircle && s.r < 130}
		{@const currentColor = getTextColor ? getTextColor(d) : "#333"}

		<div
			class="circle-group"
			data-id={d.data.id}
			style:z-index={d.depth === 1 ? 0 : 10}
			role="group"
			onmouseenter={(e) => handleMouseEnter(e, d)}
			onmouseleave={handleMouseLeave}
			onmousemove={(e) => handleMouseMove(e, d)}
		>
			<div
				class="circle"
				class:big-circle={d.depth === 1}
				style="
                    left:{s.x}px;
                    top:{s.y}px;
                    width:{s.r * 2}px;
                    height:{s.r * 2}px;
                    background-color:{getFill ? getFill(d) : '#fff'};
                    border: {d.depth === 1
					? 2
					: strokeWidth}px solid {d.depth === 1
					? 'rgba(255,255,255,0.3)'
					: stroke};
                "
			></div>

			{#if isBigCircleSmall}
				{@const radial = getRadialInfo(s)}
				<div
					class="radial-container"
					style="
                        left: {s.x}px; 
                        top: {s.y}px; 
                        transform: rotate({radial.deg}deg);
                        z-index: 999;
                    "
				>
					<div
						class="radial-line"
						style="
                            left: {s.r}px;
                            width: {radial.lineLength}px;
                        "
					></div>
					<div
						class="radial-text-anchor"
						style="left: {s.r + radial.lineLength}px;"
					>
						<div
							class="radial-text-content"
							style="transform: rotate({-radial.deg}deg);"
						>
							{titleCase(d.data.id)}
						</div>
					</div>
				</div>
			{:else if isSmallCircleVisible || (isBigCircle && !isBigCircleSmall)}
				<div
					class="text-group"
					class:is-big-label={isBigCircle}
					style="
						color: {currentColor};
						text-shadow: {currentColor === '#ffffff' || isBigCircle
						? '0 2px 4px rgba(0,0,0,0.8)'
						: 'none'};
						left:{s.x}px;
						top:{isBigCircle ? s.y - s.r + 24 : s.y}px;
                        z-index: {isBigCircle ? 5 : 20};
                        width: {isBigCircle ? '140' : s.r * 1.6}px;
					"
				>
					{#if isBigCircle}
						<div class="text big-label">
							{titleCase(d.data.id)}
						</div>
					{:else if d.depth === 2}
						{#if s.r > 40}
							<div class="text small-label">{titleCase(d.data.id)}</div>
							<div class="text value">{commas(d.value)}</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.circle-pack {
		position: relative;
		width: 100%;
		height: 100%;
		user-select: none; /* 防止点击时选中文本 */
	}
	.circle-group {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform, opacity;
	}
	.circle,
	.text-group {
		position: absolute;
		transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
	}
	.circle {
		transform: translate(-50%, -50%);
		border-radius: 50%;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
		pointer-events: auto; /* 确保圆圈可以响应鼠标 */
	}
	.circle.big-circle {
		box-shadow: none;
	}

	.circle-pack[data-has-parent-key="false"]
		.circle-group[data-id="all"]
		.circle {
		display: none;
	}

	.text-group {
		transform: translate(-50%, -50%);
		text-align: center;
		pointer-events: none; 
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1.1;
	}

	.text-group.is-big-label {
		transform: translate(-50%, 0);
	}

	.text.small-label {
		font-size: 12px;
		font-weight: 700;
		margin-bottom: 2px;
		white-space: normal; 
		word-wrap: break-word;
		line-height: 1.1;
		display: -webkit-box;
		-webkit-line-clamp: 2;
    line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.text.value {
		font-size: 10px;
		font-weight: 400;
		opacity: 0.9;
	}

	.text.big-label {
		font-size: 14px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #fff !important;
		padding: 4px 8px;
		white-space: normal;
		line-height: 1.1;
	}

	.radial-container {
		position: absolute;
		pointer-events: none; 
		width: 0;
		height: 0;
		display: flex;
		align-items: center;
		transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
	}

	.radial-line {
		position: absolute;
		top: 0;
		height: 1px;
		background: rgba(255, 255, 255, 0.6);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		transform-origin: left center;
	}

	.radial-text-anchor {
		position: absolute;
		top: 0;
		width: 0;
		height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.radial-text-content {
		font-size: 13px;
		font-weight: 800;
		text-transform: uppercase;
		color: #fff;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.2);
		padding: 4px 8px;
		border-radius: 4px;
		backdrop-filter: blur(2px);
		white-space: normal;
		text-align: center;
		max-width: 120px;
		line-height: 1.1;
	}

	.circle-group:hover {
		z-index: 100 !important;
	}
	.circle-group:hover .circle:not(.big-circle) {
		stroke: #fff !important;
		stroke-width: 3px !important;
		filter: brightness(1.15);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
</style>
