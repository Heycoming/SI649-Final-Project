import fundingData from '../data/state_funding.json';
import miCountyData from '../data/county_funding.json';
import expenditureData from '../data/county_funding_expenditures.json';
import treemapData from '../data/treemap_data.json'; 
import sectorData from "../data/summary_monthly_big_category.json"; 

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
  const usAtlas = await res.json();

  return { usAtlas, fundingData, miCountyData, expenditureData, treemapData, sectorData };
}
