import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const REFERENCE_TIME = new Date('2026-09-10T00:00:00+05:30').getTime();

async function run() {
  const listings = JSON.parse(await fs.readFile('./data/listings.json', 'utf8'));
  const rentals = JSON.parse(await fs.readFile('./data/rentals.json', 'utf8'));
  const projects = JSON.parse(await fs.readFile('./data/projects.json', 'utf8'));

  console.log("=== 1. PROJECT UNITS INSPECTION ===");
  // Look at price_max distribution in projects
  const sampleProjects = projects.slice(0, 10).map(p => ({
    id: p.project_id,
    name: p.apartment_name,
    min: p.price_min,
    max: p.price_max
  }));
  console.log("Sample project prices:", sampleProjects);

  // Check if ALL projects or some are in Crores/Lakhs
  let under1000Count = 0;
  let maxProject = { project_id: '', price_max: 0 };
  projects.forEach(p => {
    if (p.price_max < 1000) under1000Count++;
    if (p.price_max > maxProject.price_max) {
      maxProject = { project_id: p.project_id, price_max: p.price_max, full: p };
    }
  });
  console.log(`Projects with price_max < 1000: ${under1000Count} / ${projects.length}`);
  console.log("Max raw project:", maxProject);

  console.log("\n=== 2. CORRUPT LISTINGS CHECK ===");
  const corruptIds = new Set();
  listings.forEach(l => {
    if (l.price <= 0) corruptIds.add(l.listing_id);
    if (l.carpet_area <= 0) corruptIds.add(l.listing_id);
    if (l.floor !== null && l.total_floors !== null && l.floor > l.total_floors) corruptIds.add(l.listing_id);
    if (l.carpet_area && l.super_built_up_area && l.carpet_area > l.super_built_up_area) corruptIds.add(l.listing_id);
    if (l.bedroom <= 0 || l.bathroom < 0) corruptIds.add(l.listing_id);
  });
  console.log(`Corrupt count: ${corruptIds.size}`);

  console.log("\n=== 3. DETECTING FAKE LISTINGS (Q9) ===");
  // Let's inspect potential indicators:
  // - duplicate descriptions across different localities or different properties
  // - repeated phone numbers with contradictory details
  // - extreme outliers in price / area
  // - words like 'enquiry', 'lead', or identical phone number posted 50+ times
  const phoneMap = new Map();
  listings.forEach(l => {
    const p = l.posted_by_contact;
    if (!phoneMap.has(p)) phoneMap.set(p, []);
    phoneMap.get(p).push(l);
  });

  console.log("Unique contacts:", phoneMap.size);
  // Find contacts with high frequency
  const heavyContacts = [];
  for (const [phone, list] of phoneMap.entries()) {
    if (list.length > 15) {
      heavyContacts.push({ phone, count: list.length, names: [...new Set(list.map(x => x.posted_by_name))] });
    }
  }
  console.log("Heavy contacts:", heavyContacts);

  // Check listings where price is absurdly low (e.g. price < 10,00,000 for sale or price per sqft < 1000)
  const absurdPriceListings = listings.filter(l => {
    const ppsqft = l.price / l.carpet_area;
    return l.price > 0 && (ppsqft < 1000 || ppsqft > 150000 || l.price < 500000);
  });
  console.log("Listings with extreme price/sqft:", absurdPriceListings.map(l => ({
    id: l.listing_id,
    price: l.price,
    area: l.carpet_area,
    ppsqft: Math.round(l.price / l.carpet_area),
    desc: l.description,
    phone: l.posted_by_contact
  })));

  // Inspect duplicate descriptions
  const descMap = new Map();
  listings.forEach(l => {
    const d = (l.description || '').trim();
    if (!descMap.has(d)) descMap.set(d, []);
    descMap.get(d).push(l.listing_id);
  });
  const dupDescs = [];
  for (const [d, ids] of descMap.entries()) {
    if (ids.length > 5) {
      dupDescs.push({ desc: d.slice(0, 60), count: ids.length, ids: ids.slice(0, 3) });
    }
  }
  console.log("Duplicate description clusters:", dupDescs);

  // Check website / source patterns or title patterns
  const websites = [...new Set(listings.map(l => l.website))];
  console.log("Websites represented:", websites);

  // Check is_verified vs fake
  const unverified = listings.filter(l => l.is_verified === false);
  console.log(`Unverified listings count: ${unverified.length}`);

  // Let's inspect listings where description mentions enquiry or has a distinct template
  const suspiciousKeywords = ['enquiry', 'lead', 'fake', 'sample', 'test', 'not for sale', 'call for price'];
  const keywordHits = listings.filter(l => {
    const text = (l.description || '').toLowerCase();
    return suspiciousKeywords.some(k => text.includes(k));
  });
  console.log("Keyword hits:", keywordHits.map(l => ({ id: l.listing_id, desc: l.description })));

  // Save diagnostic dump
  await fs.writeFile('./data/absurd_prices.json', JSON.stringify(absurdPriceListings, null, 2));
}

run();