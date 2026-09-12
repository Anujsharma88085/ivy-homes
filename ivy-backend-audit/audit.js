import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const ASSIGNED_LOCALITY = (process.env.ASSIGNED_LOCALITY || '').toLowerCase().trim();
const REFERENCE_TIME = new Date('2026-09-10T00:00:00+05:30').getTime();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_BEFORE = REFERENCE_TIME - SEVEN_DAYS_MS;

async function runAudit() {
  const rawListings = JSON.parse(await fs.readFile('./data/listings.json', 'utf8'));
  const rawRentals = JSON.parse(await fs.readFile('./data/rentals.json', 'utf8'));
  const rawProjects = JSON.parse(await fs.readFile('./data/projects.json', 'utf8'));

  // Deduplicate by ID in case paging overlapped at boundaries
  const listingsMap = new Map();
  rawListings.forEach(l => listingsMap.set(l.listing_id, l));
  const listings = Array.from(listingsMap.values());

  const rentalsMap = new Map();
  rawRentals.forEach(r => rentalsMap.set(r.listing_id, r));
  const rentals = Array.from(rentalsMap.values());

  const projectsMap = new Map();
  rawProjects.forEach(p => projectsMap.set(p.project_id, p));
  const projects = Array.from(projectsMap.values());

  console.log(`\n================ DATA COUNTS ================`);
  console.log(`Unique retrievable listing records: ${listings.length}`);
  console.log(`Unique retrievable rental records:  ${rentals.length}`);
  console.log(`Unique retrievable project records: ${projects.length}`);

  // Q1: total_listing_records
  const total_listing_records = listings.length;

  // Q3: active_listings
  const active_listings = listings.filter(l => l.is_live === true).length;

  // Q4: Corrupt listings (cannot exist physically)
  // Hypotheses:
  // - floor > total_floors
  // - carpet_area > super_built_up_area
  // - price <= 0 or carpet_area <= 0
  // - bathroom < 0 or balcony < 0 or bedroom <= 0
  const corrupt_reasons = [];
  const corrupt_ids_set = new Set();

  listings.forEach(l => {
    const reasons = [];
    if (l.floor !== null && l.total_floors !== null && l.floor > l.total_floors) {
      reasons.push(`floor (${l.floor}) > total_floors (${l.total_floors})`);
    }
    if (l.carpet_area && l.super_built_up_area && l.carpet_area > l.super_built_up_area) {
      reasons.push(`carpet_area (${l.carpet_area}) > super_built_up_area (${l.super_built_up_area})`);
    }
    if (l.price <= 0) reasons.push(`price <= 0 (${l.price})`);
    if (l.carpet_area <= 0) reasons.push(`carpet_area <= 0 (${l.carpet_area})`);
    if (l.bedroom < 0) reasons.push(`bedroom < 0`);
    if (l.bathroom < 0) reasons.push(`bathroom < 0`);

    if (reasons.length > 0) {
      corrupt_ids_set.add(l.listing_id);
      corrupt_reasons.push({ id: l.listing_id, reasons, data: l });
    }
  });

  const corrupt_listing_ids = Array.from(corrupt_ids_set).sort();

  // Q9: Fake listings (lead-generation bait, fraud)
  // Hypotheses:
  // - Phone number shared by multiple agents or across an absurd number of disparate properties
  // - Descriptions indicating scam / test / dummy
  // - Price per sqft absurdly low or high (e.g. ₹500/sqft in prime localities)
  // - Repetitive fake phone patterns (e.g. +912000000000, 9999999999)
  const phoneCounts = {};
  listings.forEach(l => {
    if (l.posted_by_contact) {
      phoneCounts[l.posted_by_contact] = (phoneCounts[l.posted_by_contact] || 0) + 1;
    }
  });

  // Let's inspect potential anomalies
  const suspiciousListings = [];
  listings.forEach(l => {
    const ppsqft = l.price && l.carpet_area ? l.price / l.carpet_area : 0;
    // Inspect descriptions or extreme pricing
    const desc = (l.description || '').toLowerCase();
    const isSuspiciousText = desc.includes('fake') || desc.includes('test') || desc.includes('dummy') || desc.includes('call now for best offer');
    if (ppsqft < 500 || ppsqft > 200000 || isSuspiciousText) {
      suspiciousListings.push({ id: l.listing_id, ppsqft: Math.round(ppsqft), price: l.price, area: l.carpet_area, desc: l.description, contact: l.posted_by_contact });
    }
  });

  // Q2: unique_properties
  // A single physical property described by several records counts once.
  // Physical property signature: (apartment_name, floor, bedroom, carpet_area) or coordinates + floor
  const propertySignatures = new Set();
  listings.forEach(l => {
    // Clean strings
    const apt = (l.apartment_name || '').trim().toLowerCase();
    const loc = (l.locality || '').trim().toLowerCase();
    const sig = `${loc}|${apt}|${l.floor}|${l.carpet_area}|${l.bedroom}`;
    propertySignatures.add(sig);
  });
  const unique_properties = propertySignatures.size;

  // Q5: total_monthly_rent in assigned locality
  let total_monthly_rent = 0;
  let rentalCountInLocality = 0;
  rentals.forEach(r => {
    const loc = (r.locality || '').trim().toLowerCase();
    if (loc === ASSIGNED_LOCALITY) {
      total_monthly_rent += (r.price || 0);
      rentalCountInLocality++;
    }
  });

  // Q7: costliest_project
  let costliest_project = { project_id: '', price_max_inr: -1 };
  projects.forEach(p => {
    const pMax = p.price_max || 0;
    if (pMax > costliest_project.price_max_inr) {
      costliest_project = {
        project_id: p.project_id,
        price_max_inr: pMax
      };
    }
  });

  // Q8: listings_last_7_days in [REFERENCE - 7 days, REFERENCE) in IST
  let listings_last_7_days = 0;
  listings.forEach(l => {
    if (l.posted_at) {
      const t = new Date(l.posted_at).getTime();
      if (t >= SEVEN_DAYS_BEFORE && t < REFERENCE_TIME) {
        listings_last_7_days++;
      }
    }
  });

  // Q10: projects_with_wrong_listing_count
  // Count how many listings in /v1/listings have project_id == p.project_id
  const projectListingCounts = {};
  listings.forEach(l => {
    if (l.project_id) {
      projectListingCounts[l.project_id] = (projectListingCounts[l.project_id] || 0) + 1;
    }
  });

  let projects_with_wrong_listing_count = 0;
  const projectDiscrepancies = [];
  projects.forEach(p => {
    const actualCount = projectListingCounts[p.project_id] || 0;
    const reportedCount = p.total_listings || 0;
    if (actualCount !== reportedCount) {
      projects_with_wrong_listing_count++;
      projectDiscrepancies.push({
        project_id: p.project_id,
        reported: reportedCount,
        actual: actualCount
      });
    }
  });

  console.log(`\n================ AUDIT SUMMARY ================`);
  console.log(`1. total_listing_records:`, total_listing_records);
  console.log(`2. unique_properties (estimate):`, unique_properties);
  console.log(`3. active_listings (is_live: true):`, active_listings);
  console.log(`4. corrupt_listing_ids (${corrupt_listing_ids.length}):`, corrupt_listing_ids);
  console.log(`   Reasons sample:`, corrupt_reasons.slice(0, 5));
  console.log(`5. total_monthly_rent in '${ASSIGNED_LOCALITY}' (${rentalCountInLocality} rentals):`, total_monthly_rent);
  console.log(`7. costliest_project:`, costliest_project);
  console.log(`8. listings_last_7_days:`, listings_last_7_days);
  console.log(`10. projects_with_wrong_listing_count:`, projects_with_wrong_listing_count);
  console.log(`   Sample project mismatches:`, projectDiscrepancies.slice(0, 5));

  // Save diagnostic info
  await fs.writeFile('./data/corrupt_candidates.json', JSON.stringify(corrupt_reasons, null, 2));
  await fs.writeFile('./data/suspicious_candidates.json', JSON.stringify(suspiciousListings, null, 2));
}

runAudit();