import fs from 'fs/promises';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Please set API_KEY in .env");
  process.exit(1);
}

// Fixed: Send X-API-Key header instead of query parameter
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 15000,
});

async function checkHealth() {
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    console.log('[Health Check]:', res.data);
  } catch (err) {
    console.warn('[Health Check Failed]:', err.response?.data || err.message);
  }
}

async function probeAnalytics() {
  console.log('\n--- Probing Analytics Endpoints ---');
  const candidates = [
    '/v1/analytics/summary',
    '/v1/analytics',
    '/v1/summary',
    '/analytics/summary'
  ];
  for (const path of candidates) {
    try {
      const res = await client.get(path);
      console.log(`[Success] ${path}:`, Object.keys(res.data));
      await fs.writeFile('./data/analytics.json', JSON.stringify(res.data, null, 2));
      return;
    } catch (err) {
      console.log(`[${err.response?.status || 'ERR'}] ${path}`);
    }
  }
}

async function fetchAll(endpointName) {
  console.log(`\n--- Fetching /v1/${endpointName} ---`);
  let allRecords = [];
  
  // Probe with limit=100
  let res;
  try {
    res = await client.get(`/v1/${endpointName}`, { params: { limit: 100, offset: 0 } });
  } catch (err) {
    console.error(`Initial request failed for /v1/${endpointName}:`, err.response?.status, err.response?.data);
    // Try page=1 in case offset is rejected
    try {
      res = await client.get(`/v1/${endpointName}`, { params: { limit: 100, page: 1 } });
    } catch (innerErr) {
      console.error(`Page fallback also failed:`, innerErr.response?.status, innerErr.response?.data);
      return [];
    }
  }

  const meta = res.data;
  console.log(`Top-level response keys:`, Object.keys(meta));
  console.log(`Sample meta:`, {
    total: meta.total,
    count: meta.count,
    limit: meta.limit,
    offset: meta.offset,
    page: meta.page,
    page_size: meta.page_size,
    has_more: meta.has_more
  });

  const recordsKey = Array.isArray(meta) ? null : (meta.results ? 'results' : (meta.data ? 'data' : (meta.listings || meta.rentals || meta.projects)));
  let records = Array.isArray(meta) ? meta : (recordsKey ? meta[recordsKey] : []);
  allRecords.push(...records);

  const usesOffset = 'offset' in meta;
  let offset = records.length;
  let page = 2;
  const total = meta.total || meta.count;

  console.log(`Fetched first batch: ${records.length} items. Total: ${total}`);

  while (true) {
    if (total !== undefined && allRecords.length >= total) break;
    if (meta.has_more === false) break;

    const params = usesOffset ? { limit: 100, offset } : { limit: 100, page };

    try {
      const nextRes = await client.get(`/v1/${endpointName}`, { params });
      const nextMeta = nextRes.data;
      const nextRecords = Array.isArray(nextMeta) ? nextMeta : (recordsKey ? nextMeta[recordsKey] : []);

      if (!nextRecords || nextRecords.length === 0) break;

      allRecords.push(...nextRecords);
      console.log(`Fetched ${allRecords.length} / ${total || '?'}`);

      if (nextMeta.has_more === false) break;

      if (usesOffset) {
        offset += nextRecords.length;
      } else {
        page += 1;
      }
    } catch (err) {
      console.error(`Failed at ${usesOffset ? `offset ${offset}` : `page ${page}`}:`, err.response?.data || err.message);
      break;
    }
  }

  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(`./data/${endpointName}.json`, JSON.stringify(allRecords, null, 2));
  console.log(`Successfully saved ${allRecords.length} records to ./data/${endpointName}.json`);

  if (allRecords.length > 0) {
    console.log(`First record sample keys:`, Object.keys(allRecords[0]));
  }

  return allRecords;
}

async function run() {
  await checkHealth();
  await fetchAll('listings');
  await fetchAll('rentals');
  await fetchAll('projects');
  await probeAnalytics();
}

run();