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
        res = await client.get(`/v1/${endpointName}`, { params: { limit: 21, offset: 395 } });
    } catch (err) {
        console.log(`Offset probe failed for /v1/${endpointName} (${err.response?.status}), trying page...`);
        try {
        res = await client.get(`/v1/${endpointName}`, { params: { limit: 18, page: 1 } });
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

  return allRecords;
}


async function run() {
  await login();
  await fetchAll('projects');
}

run();