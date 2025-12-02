<!-- src/components/layercake/migrate/Tooltip.html.svelte -->
<script>
	let { 
		evt = {}, 
		offset = 15, 
		children 
	} = $props();

	let position = $derived.by(() => {
		// 修复：直接检查 detail 中是否有 x, y 坐标
		// 即使 evt.detail 重新生成，只要 x/y 是数字，就不会出错
		if (evt?.detail?.x !== undefined && evt?.detail?.y !== undefined) {
			return {
				top: `${evt.detail.y + offset}px`,
				left: `${evt.detail.x}px`,
				visible: true
			};
		}
		return { top: '0px', left: '0px', visible: false };
	});
</script>

{#if position.visible}
	<div 
		class="tooltip-container"
		style:top={position.top} 
		style:left={position.left}
	>
		{@render children(evt.detail)}
	</div>
{/if}

<style>
	.tooltip-container {
		position: fixed; 
		transform: translate(-50%, -100%); 
		padding: 10px 14px;
		z-index: 9999; 
		pointer-events: none; 
		
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		color: #eee;
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		line-height: 1.4;
		min-width: 140px;
		
		/* 移除 top/left 的 transition，让跟随鼠标更跟手，避免延迟感 */
		transition: opacity 0.1s;
	}
</style>
