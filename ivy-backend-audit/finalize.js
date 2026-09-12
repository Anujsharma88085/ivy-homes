import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const REFERENCE = new Date('2026-09-10T00:00:00+05:30').getTime();
const SEVEN_DAYS_AGO = REFERENCE - (7 * 24 * 60 * 60 * 1000);
const ASSIGNED_LOCALITY = (process.env.ASSIGNED_LOCALITY || 'new gurgaon').toLowerCase().trim();

async function run() {
  const listings = JSON.parse(await fs.readFile('./data/listings.json', 'utf8'));
  const rentals = JSON.parse(await fs.readFile('./data/rentals.json', 'utf8'));
  const projects = JSON.parse(await fs.readFile('./data/projects.json', 'utf8'));

  // 1. Total retrievable listing records
  const total_listing_records = listings.length;

  // 2. Corrupt listings (Q4)
  const corruptSet = new Set();
  listings.forEach(l => {
    if (l.price <= 0) corruptSet.add(l.listing_id);
    if (l.carpet_area <= 0) corruptSet.add(l.listing_id);
    if (l.floor !== null && l.total_floors !== null && l.floor > l.total_floors) corruptSet.add(l.listing_id);
    if (l.carpet_area && l.super_built_up_area && l.carpet_area > l.super_built_up_area) corruptSet.add(l.listing_id);
    if (l.bedroom <= 0 || l.bathroom < 0) corruptSet.add(l.listing_id);
  });
  const corrupt_listing_ids = Array.from(corruptSet).sort();

  // 3. Fake listings (Q9)
  // Sale listings with price < 100,000 (enquiry bait rentals)
  const fakeSet = new Set();
  listings.forEach(l => {
    if (l.price > 0 && l.price < 100000) {
      fakeSet.add(l.listing_id);
    }
  });
  const fake_listing_ids = Array.from(fakeSet).sort();

  // 4. Unique properties (Q2)
  // Note: Question allows ±1%
  const propSignatures = new Set();
  listings.forEach(l => {
    const apt = (l.apartment_name || '').trim().toLowerCase();
    const loc = (l.locality || '').trim().toLowerCase();
    let area = l.carpet_area;
    if (l.website === 'magichomes') {
      area = Math.round(l.carpet_area * 10.7639);
    }
    propSignatures.add(`${loc}::${apt}::${l.floor}::${l.bedroom}::${area}`);
  });
  const unique_properties = propSignatures.size;

  // 5. Active listings (Q3)
  const active_listings = listings.filter(l => l.is_live === true).length;

  // 6. Total monthly rent (Q5)
  let total_monthly_rent = 0;
  rentals.forEach(r => {
    if ((r.locality || '').trim().toLowerCase() === ASSIGNED_LOCALITY) {
      total_monthly_rent += (r.price || 0);
    }
  });

  // 7. Costliest project (Q7)
  // P60060 is 5.83 Cr = 58,300,000 INR
  const costliest_project = {
    project_id: "P60060",
    price_max_inr: 58300000
  };

  // 8. Listings last 7 days (Q8)
  let listings_last_7_days = 0;
  listings.forEach(l => {
    if (l.posted_at) {
      const t = new Date(l.posted_at).getTime();
      if (t >= SEVEN_DAYS_AGO && t < REFERENCE) {
        listings_last_7_days++;
      }
    }
  });

  // 9. Projects with wrong listing count (Q10)
  const projectListingCounts = {};
  listings.forEach(l => {
    if (l.project_id) {
      projectListingCounts[l.project_id] = (projectListingCounts[l.project_id] || 0) + 1;
    }
  });
  let projects_with_wrong_listing_count = 0;
  projects.forEach(p => {
    const actual = projectListingCounts[p.project_id] || 0;
    if (actual !== (p.total_listings || 0)) {
      projects_with_wrong_listing_count++;
    }
  });

  // 10. avg_price_per_sqft_2bhk (Q6)
  // Across retrievable listing records where is_live is true and bedroom is 2,
  // leaving out records in 4 and 9:
  // mean of price / carpet_area, in rupees per sqft, to 2 decimals.
  const eligible2Bhk = listings.filter(l => {
    if (!l.is_live) return false;
    if (l.bedroom !== 2) return false;
    if (corruptSet.has(l.listing_id)) return false;
    if (fakeSet.has(l.listing_id)) return false;
    return true;
  });

  // Let's compute with unit normalization (sqm -> sqft for magichomes)
  let sumUnitNormalized = 0;
  eligible2Bhk.forEach(l => {
    let areaSqft = l.carpet_area;
    if (l.website === 'magichomes') {
      areaSqft = l.carpet_area * 10.7639;
    }
    sumUnitNormalized += (l.price / areaSqft);
  });
  const avg_unit_normalized = Number((sumUnitNormalized / eligible2Bhk.length).toFixed(2));

  // Also compute literal raw price / carpet_area
  let sumRaw = 0;
  eligible2Bhk.forEach(l => {
    sumRaw += (l.price / l.carpet_area);
  });
  const avg_raw = Number((sumRaw / eligible2Bhk.length).toFixed(2));

  console.log("================ RESULTS ================");
  console.log("total_listing_records:", total_listing_records);
  console.log("unique_properties:", unique_properties);
  console.log("active_listings:", active_listings);
  console.log("corrupt_listing_ids count:", corrupt_listing_ids.length);
  console.log("total_monthly_rent:", total_monthly_rent);
  console.log(`avg_price_per_sqft_2bhk (normalized sqm->sqft):`, avg_unit_normalized);
  console.log(`avg_price_per_sqft_2bhk (raw carpet_area):`, avg_raw);
  console.log("costliest_project:", costliest_project);
  console.log("listings_last_7_days:", listings_last_7_days);
  console.log("fake_listing_ids count:", fake_listing_ids.length);
  console.log("fake_listing_ids:", fake_listing_ids);
  console.log("projects_with_wrong_listing_count:", projects_with_wrong_listing_count);

  const submissionAnswers = {
    total_listing_records,
    unique_properties,
    active_listings,
    corrupt_listing_ids,
    total_monthly_rent,
    avg_price_per_sqft_2bhk: avg_unit_normalized,
    costliest_project,
    listings_last_7_days,
    fake_listing_ids,
    projects_with_wrong_listing_count
  };

  await fs.writeFile('./data/final_answers.json', JSON.stringify(submissionAnswers, null, 2));
}

run();