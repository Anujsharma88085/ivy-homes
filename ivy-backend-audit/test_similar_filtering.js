import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY || 'IVY26-8B68015ADE35';
const EMAIL = process.env.DEMO_EMAIL || 'demo1@ivy.homes';
const PASSWORD = process.env.DEMO_PASSWORD;

async function check() {
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD }, {
    headers: { 'X-API-Key': API_KEY }
  });
  const token = loginRes.data.access_token || loginRes.data.token;

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${token}`
    }
  });

  const sampleId = 'MAG-6002450';

  // 1. Fetch details of the target property to know its locality and BHK
  const targetRes = await client.get(`/v1/listings/${sampleId}`);
  const target = targetRes.data;
  console.log(`Target Property: ID=${sampleId}, Locality=${target.locality}, BHK=${target.bedroom}, Price=${target.price}`);

  // 2. Fetch with NO filters
  const bareRes = await client.get('/v1/listings');
  const bareIds = bareRes.data.results.map(r => r.listing_id);

  // 3. Fetch with bogus query param
  const bogusRes = await client.get('/v1/listings?this_is_bogus=true');
  const bogusIds = bogusRes.data.results.map(r => r.listing_id);

  // 4. Fetch with similar_to param
  const simToRes = await client.get(`/v1/listings?similar_to=${sampleId}`);
  const simToResults = simToRes.data.results;
  const simToIds = simToResults.map(r => r.listing_id);

  // 5. Fetch with similar param
  const simRes = await client.get(`/v1/listings?similar=${sampleId}`);
  const simIds = simRes.data.results.map(r => r.listing_id);

  console.log('\n--- Comparison ---');
  console.log('Bare /v1/listings first 5 IDs:    ', bareIds.slice(0, 5));
  console.log('Bogus param first 5 IDs:          ', bogusIds.slice(0, 5));
  console.log('?similar_to first 5 IDs:          ', simToIds.slice(0, 5));
  console.log('?similar first 5 IDs:             ', simIds.slice(0, 5));

  const isSimToIdenticalToBare = JSON.stringify(bareIds) === JSON.stringify(simToIds);
  console.log('\nIs ?similar_to returning the EXACT same records as bare /v1/listings?', isSimToIdenticalToBare);

  // Inspect the attributes of the 20 results in simToResults
  const matchesLocality = simToResults.filter(r => r.locality === target.locality).length;
  const matchesBhk = simToResults.filter(r => r.bedroom === target.bedroom).length;
  console.log(`Out of 20 results in ?similar_to:`);
  console.log(`- How many match target locality (${target.locality})? ${matchesLocality}/20`);
  console.log(`- How many match target BHK (${target.bedroom})? ${matchesBhk}/20`);
}

check();