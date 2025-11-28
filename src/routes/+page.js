import fundingData from '../data/state_funding.json';
import miCountyData from '../data/county_funding.json';
import expenditureData from '../data/county_funding_expenditures.json'; // ✅ 保留你的文件！

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  // 🔴 修复点：这里必须是 counties-10m.json，否则无法画出县级地图
  const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
  const usAtlas = await res.json();

  // 原样返回你的真实数据
  return { usAtlas, fundingData, miCountyData, expenditureData };
}
