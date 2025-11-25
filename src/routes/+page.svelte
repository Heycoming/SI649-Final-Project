<script>
  import Index from "$components/Index.svelte";
  
  // 接收 +page.js 返回的数据
  let { data } = $props();
</script>

<svelte:head>
  <title>Michigan Campaign Finance Flow</title>
  <meta name="description" content="Visualizing out-of-state contributions." />
</svelte:head>

<!-- 将数据透传给主应用组件 -->
<Index {data} />
