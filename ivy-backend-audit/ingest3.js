import fs from 'fs/promises';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY;
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo1@ivy.homes';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!API_KEY || !DEMO_PASSWORD) {
  console.error("Please set API_KEY and DEMO_PASSWORD in .env");
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 15000,
});

async function login() {
  console.log(`\n--- Logging in as ${DEMO_EMAIL} ---`);
  try {
    const res = await client.post('/auth/login', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD
    });
    console.log('[Login Success]:', res.data);
    const token = res.data.token || res.data.access_token;
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return token;
  } catch (err) {
    console.error('[Login Failed]:', err.response?.status, err.response?.data || err.message);
    process.exit(1);
  }
}

async function fetchAll(endpointName) {
  console.log(`\n--- Fetching /v1/${endpointName} ---`);
  let allRecords = [];
  
  let res;
  try {
    res = await client.get(`/v1/${endpointName}`, { params: { limit: 50, offset: 0 } });
  } catch (err) {
    console.log(`Offset probe failed for /v1/${endpointName} (${err.response?.status}), trying page...`);
    try {
      res = await client.get(`/v1/${endpointName}`, { params: { limit: 50, page: 1 } });
    } catch (innerErr) {
      console.error(`Failed to fetch /v1/${endpointName}:`, innerErr.response?.status, innerErr.response?.data);
      return [];
    }
  }

  const meta = res.data;
  console.log(`Top-level response keys:`, Object.keys(meta));
  console.log(`Meta details:`, {
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
  const total = meta.total !== undefined ? meta.total : meta.count;

  console.log(`Fetched initial batch: ${records.length} items. Total: ${total}`);

  while (true) {
    if (meta.has_more === false) break;

    const params = usesOffset ? { limit: 50, offset } : { limit: 50, page };

    try {
      const nextRes = await client.get(`/v1/${endpointName}`, { params });
      const nextMeta = nextRes.data;
      const nextRecords = Array.isArray(nextMeta) ? nextMeta : (recordsKey ? nextMeta[recordsKey] : []);

      console.log("Response metadata:", {
        total: nextMeta.total,
        count: nextMeta.count,
        limit: nextMeta.limit,
        offset: nextMeta.offset,
        has_more: nextMeta.has_more
      });

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
      console.error(`Failed at batch:`, err.response?.data || err.message);
      break;
    }
  }

  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(`./data/${endpointName}.json`, JSON.stringify(allRecords, null, 2));
  console.log(`Saved ${allRecords.length} records to ./data/${endpointName}.json`);
  if (allRecords.length > 0) {
    console.log(`Sample fields for first record:`, Object.keys(allRecords[0]));
  }
  return allRecords;
}

async function probeAnalyticsWithAuth() {
  console.log('\n--- Probing Analytics with Auth ---');
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

async function run() {
  await login();
  await fetchAll('listings');
  await fetchAll('rentals');
  await fetchAll('projects');
  await probeAnalyticsWithAuth();
}

run();