import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Please set API_KEY in .env");
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  params: { api_key: API_KEY },
  timeout: 10000,
});

async function checkHealth() {
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    console.log('[Health Check]:', res.data);
  } catch (err) {
    console.warn('[Health Check Failed]:', err.response?.data || err.message);
  }
}

async function fetchAll(endpointName) {
  console.log(`\n--- Fetching /v1/${endpointName} ---`);
  let allRecords = [];
  let offset = 0;
  let page = 1;
  const limit = 100; // Let's probe high limit

  // First probe: see what the API returns in response keys (offset vs page, total, has_more)
  let initialRes;
  try {
    initialRes = await client.get(`/v1/${endpointName}`, { params: { limit, page: 1, offset: 0 } });
  } catch (err) {
    console.error(`Failed to hit /v1/${endpointName}:`, err.response?.status, err.response?.data);
    return [];
  }

  const meta = initialRes.data;
  console.log(`Response keys for /v1/${endpointName}:`, Object.keys(meta));
  
  // Inspect whether API uses offset/limit or page/limit
  const recordsKey = Array.isArray(meta) ? null : (meta.results ? 'results' : (meta.data ? 'data' : null));
  
  let records = Array.isArray(meta) ? meta : (recordsKey ? meta[recordsKey] : []);
  allRecords.push(...records);

  // If response has total/has_more/offset:
  const usesOffset = 'offset' in meta;
  const total = meta.total;
  console.log(`Initial batch: ${records.length} records. Total indicated: ${total}. usesOffset: ${usesOffset}`);

  let currentCount = records.length;

  while (records.length > 0) {
    if (total !== undefined && allRecords.length >= total) break;
    if (meta.has_more === false) break;

    let params = { limit };
    if (usesOffset) {
      offset += records.length;
      params.offset = offset;
    } else {
      page += 1;
      params.page = page;
    }

    try {
      const res = await client.get(`/v1/${endpointName}`, { params });
      const nextMeta = res.data;
      records = Array.isArray(nextMeta) ? nextMeta : (recordsKey ? nextMeta[recordsKey] : []);
      if (records.length === 0) break;
      allRecords.push(...records);
      console.log(`Fetched ${allRecords.length} / ${total || '?'}`);
      if (nextMeta.has_more === false) break;
    } catch (err) {
      console.error(`Error at offset/page ${offset || page}:`, err.response?.data || err.message);
      break;
    }
  }

  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(`./data/${endpointName}.json`, JSON.stringify(allRecords, null, 2));
  console.log(`Saved ${allRecords.length} records to ./data/${endpointName}.json`);
  return allRecords;
}

async function probeAnalytics() {
  try {
    const res = await client.get('/v1/analytics/summary');
    await fs.writeFile('./data/analytics_summary.json', JSON.stringify(res.data, null, 2));
    console.log('Saved /v1/analytics/summary');
  } catch (err) {
    console.warn('Analytics endpoint failed:', err.response?.status, err.response?.data);
  }
}

async function run() {
  await checkHealth();
  await fetchAll('listings');
  await fetchAll('rentals');
  await fetchAll('projects');
  await probeAnalytics();
}

run();