import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY || 'IVY26-8B68015ADE35';
const EMAIL = process.env.DEMO_EMAIL || 'demo1@ivy.homes';
const PASSWORD = process.env.DEMO_PASSWORD;

async function runDeepProbe() {
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD }, {
    headers: { 'X-API-Key': API_KEY }
  });
  const token = loginRes.data.access_token || loginRes.data.token;

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${token}`
    },
    validateStatus: () => true // Don't throw so we inspect all status codes (200, 400, 405, etc.)
  });

  const sampleId = 'MAG-6002450';
  // Also try an un-prefixed ID or another website's ID (like 100acres or dwelling)
  const numericId = '6002450';
  const alternativeId = '100-6000042';

  const patterns = [
    // 1. Variations around /similar
    `/v1/listings/${sampleId}/similar`,
    `/v1/listing/${sampleId}/similar`,
    `/v1/listings/${numericId}/similar`,
    `/v1/listing/${numericId}/similar`,
    `/v1/listings/${alternativeId}/similar`,
    `/v1/similar`,
    `/v1/similar/${sampleId}`,
    `/v1/similar/listings/${sampleId}`,
    `/v1/similar?id=${sampleId}`,
    `/v1/similar?listing_id=${sampleId}`,
    `/v1/listings/similar`,
    `/v1/listings/similar?id=${sampleId}`,
    `/v1/listings/similar?listing_id=${sampleId}`,

    // 2. Variations around /comparable or /comps
    `/v1/listings/${sampleId}/comparables`,
    `/v1/listings/${sampleId}/comparable`,
    `/v1/listings/${sampleId}/comps`,
    `/v1/comparables/${sampleId}`,
    `/v1/comparables?listing_id=${sampleId}`,

    // 3. Variations around /recommendations or /related
    `/v1/listings/${sampleId}/related`,
    `/v1/listings/${sampleId}/recommendations`,
    `/v1/listings/${sampleId}/matching`,
    `/v1/related/${sampleId}`,
    `/v1/recommendations/${sampleId}`,
    `/v1/recommendations?listing_id=${sampleId}`,

    // 4. Variations on properties rather than listings
    `/v1/properties/${sampleId}/similar`,
    `/v1/property/${sampleId}/similar`,
    `/v1/properties/similar/${sampleId}`,

    // // 5. Query parameter variations on /v1/listings itself
    // `/v1/listings?similar_to=${sampleId}`,
    // `/v1/listings?similar=${sampleId}`,
    // `/v1/listings?like=${sampleId}`,
    // `/v1/listings?reference_id=${sampleId}`,

    // 6. Without /v1 prefix
    `/listings/${sampleId}/similar`,
    `/similar/${sampleId}`,
    `/similar?listing_id=${sampleId}`
  ];

  console.log(`\nTesting ${patterns.length} candidate paths for recommendations / similar items...\n`);

  let found = false;
  for (const path of patterns) {
    const res = await client.get(path);
    if (res.status !== 404) {
      console.log(`🎯 [STATUS ${res.status}] GET ${path}`);
      console.log('Response body:', res.data.results.length);
      found = true;
    }
  }

  // Also check POST variations (e.g. POST /v1/listings/similar with body { listing_id })
  const postPatterns = [
    { path: '/v1/similar', body: { listing_id: sampleId } },
    { path: '/v1/listings/similar', body: { listing_id: sampleId } },
    { path: '/v1/similar', body: { id: sampleId } },
    { path: '/v1/recommendations', body: { listing_id: sampleId } },
  ];

  // console.log(`\nTesting POST endpoints...`);
  // for (const { path, body } of postPatterns) {
  //   const res = await client.post(path, body);
  //   if (res.status !== 404) {
  //     console.log(`🎯 [STATUS ${res.status}] POST ${path}`);
  //     console.log('Response body:', res.data);
  //     found = true;
  //   }
  // }

  // Also probe an OpenAPI / Swagger schema in case it's exposed
  console.log(`\nChecking for API spec routes...`);
  const specRoutes = ['/openapi.json', '/docs', '/swagger.json', '/api/docs', '/redoc', '/v1/docs'];
  for (const route of specRoutes) {
    const res = await client.get(route);
    if (res.status !== 404) {
      console.log(`📖 [API SPEC DISCOVERED ${res.status}] GET ${route}`);
    }
  }

  if (!found) {
    console.log('\nResult: Exhaustive search complete. No alternate similar/recommendation endpoint exists on the server.');
  }
}

runDeepProbe();