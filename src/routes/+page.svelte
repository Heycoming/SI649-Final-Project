<script>
  import Index from "$components/Index.svelte";
  
  let { data } = $props();
</script>

<svelte:head>
  <title>Michigan Campaign Finance Flow</title>
  <meta name="description" content="Visualizing out-of-state contributions." />
</svelte:head>

<Index {data} />
