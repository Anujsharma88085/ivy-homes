import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const REFERENCE = new Date('2026-09-10T00:00:00+05:30').getTime();
const SEVEN_DAYS_AGO = REFERENCE - (7 * 24 * 60 * 60 * 1000);

async function run() {
  const listings = JSON.parse(await fs.readFile('./data/listings.json', 'utf8'));
  const rentals = JSON.parse(await fs.readFile('./data/rentals.json', 'utf8'));
  const projects = JSON.parse(await fs.readFile('./data/projects.json', 'utf8'));

  console.log("================ 1. ISOLATING FAKE LISTINGS ================");
  // Candidates for fake listings:
  // - Sale listings where price is obviously a rental price (e.g. price < 1,00,000 or price < 50,000)
  // - Check if there are phone numbers shared across completely contradictory names/listings
  const rentPriceListings = listings.filter(l => l.price > 0 && l.price < 500000);
  console.log(`Sale listings with price < 500,000: ${rentPriceListings.length}`);
  console.log(rentPriceListings.map(l => ({
    id: l.listing_id,
    website: l.website,
    price: l.price,
    bhk: l.bedroom,
    locality: l.locality,
    contact: l.posted_by_contact,
    is_live: l.is_live
  })));

  console.log("\n================ 2. CORRUPT LISTINGS (CANNOT EXIST) ================");
  const corruptMap = new Map();
  listings.forEach(l => {
    const reasons = [];
    if (l.price <= 0) reasons.push(`non-positive price (${l.price})`);
    if (l.carpet_area <= 0) reasons.push(`non-positive carpet_area (${l.carpet_area})`);
    if (l.floor !== null && l.total_floors !== null && l.floor > l.total_floors) {
      reasons.push(`floor (${l.floor}) > total_floors (${l.total_floors})`);
    }
    // Note: If website is magichomes, carpet_area is in sqm, so compare carpet_area and super_built_up_area directly in raw units
    if (l.carpet_area && l.super_built_up_area && l.carpet_area > l.super_built_up_area) {
      reasons.push(`carpet_area (${l.carpet_area}) > super_built_up_area (${l.super_built_up_area})`);
    }
    if (l.bedroom <= 0) reasons.push(`bedroom <= 0`);
    if (l.bathroom < 0) reasons.push(`bathroom < 0`);

    if (reasons.length > 0) {
      corruptMap.set(l.listing_id, reasons);
    }
  });

  console.log(`Corrupt listings count: ${corruptMap.size}`);
  const corrupt_ids = Array.from(corruptMap.keys()).sort();
  console.log("Corrupt IDs:", corrupt_ids);

  console.log("\n================ 3. PROJECT UNITS & COSTLIEST PROJECT ================");
  // Let's analyze the distribution of price_max across all projects
  // In Indian real estate:
  // - If price is < 10, it's in Crores (e.g. 1.66 Cr to 4.54 Cr = 1,66,00,000 to 4,54,00,000)
  // - If price is >= 10 and < 500, is it in Lakhs (e.g. 55.8 L to 98.9 L = 55,80,000 to 98,90,000) or Crores?
  // Let's check min_area_sqft and calculate implied rate per sqft for both interpretations:
  const projectPriceAudit = projects.map(p => {
    let inr_max = 0;
    let unit = '';
    if (p.price_max < 15) {
      // Clearly Crores (e.g., 2.5 Cr = 2,50,00,000)
      inr_max = Math.round(p.price_max * 10000000);
      unit = 'Cr';
    } else {
      // E.g., 55.8 to 98.9 - is this Lakhs (98.9 L = 98,90,000) or Crores?
      // A 1000 sqft apartment at 98.9 Cr is 10 Lakh/sqft (impossible).
      // At 98.9 Lakhs it is ~9,200/sqft (standard Gurgaon rate).
      inr_max = Math.round(p.price_max * 100000);
      unit = 'L';
    }
    return {
      project_id: p.project_id,
      name: p.apartment_name,
      locality: p.locality,
      raw_min: p.price_min,
      raw_max: p.price_max,
      inr_max,
      unit,
      rate_per_sqft_max: Math.round(inr_max / p.max_area_sqft)
    };
  });

  // Sort by inr_max descending
  projectPriceAudit.sort((a, b) => b.inr_max - a.inr_max);
  console.log("Top 5 costliest projects (converted):", projectPriceAudit.slice(0, 5));
  console.log("Costliest raw projects (if no conversion):", [...projects].sort((a, b) => b.price_max - a.price_max).slice(0, 5).map(p => ({ id: p.project_id, max: p.price_max, name: p.apartment_name })));

  console.log("\n================ 4. UNIQUE PROPERTIES (Q2) ================");
  // Let's check duplicates:
  // What makes a physical property unique?
  // (apartment_name, floor, bedroom) or (locality, apartment_name, floor, carpet_area_sqft, bedroom)
  // Remember magichomes carpet_area is in sqm! So convert magichomes carpet_area to sqft (~ * 10.7639) or keep normalized!
  const propSet = new Set();
  listings.forEach(l => {
    const apt = (l.apartment_name || '').trim().toLowerCase();
    const loc = (l.locality || '').trim().toLowerCase();
    // Normalize area: if magichomes, round(area * 10.7639)
    let areaSqft = l.carpet_area;
    if (l.website === 'magichomes') {
      areaSqft = Math.round(l.carpet_area * 10.7639);
    }
    const sig = `${loc}::${apt}::${l.floor}::${l.bedroom}::${areaSqft}`;
    propSet.add(sig);
  });
  console.log(`Unique properties count with area normalization: ${propSet.size}`);

  // Without area normalization (raw values):
  const rawPropSet = new Set();
  listings.forEach(l => {
    const apt = (l.apartment_name || '').trim().toLowerCase();
    const loc = (l.locality || '').trim().toLowerCase();
    const sig = `${loc}::${apt}::${l.floor}::${l.bedroom}::${l.carpet_area}`;
    rawPropSet.add(sig);
  });
  console.log(`Unique properties count raw: ${rawPropSet.size}`);

  console.log("\n================ 5. AVG PRICE PER SQFT 2BHK (Q6) ================");
  // Across retrievable listing records where is_live is true and bedroom is 2,
  // leaving out corrupt (Q4) and fake (Q9):
  // mean of price / carpet_area, in rupees per sqft, to 2 decimals.
  // Note: For magichomes, carpet_area is sqm or does the question literally mean price / carpet_area?
  // Let's compute BOTH (with unit correction and raw) to compare!
}

run();