import fundingData from '../data/state_funding.json';
import miCountyData from '../data/county_funding.json';

 /** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  // 并行请求远程地图数据
  const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
  const usAtlas = await res.json();

  // 返回给 +page.svelte
  return { usAtlas, fundingData, miCountyData };
}
