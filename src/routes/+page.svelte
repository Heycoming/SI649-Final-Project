<script>
  import Index from "$components/Index.svelte";
  
  // 接收 +page.js load 函数返回的数据
  let { data } = $props();
</script>

<Index />
