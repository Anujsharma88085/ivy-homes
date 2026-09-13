import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY || 'IVY26-8B68015ADE35';
const EMAIL = process.env.DEMO_EMAIL || 'demo1@ivy.homes';
const PASSWORD = process.env.DEMO_PASSWORD;

async function run() {
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

  const candidates = [
    { url: '/v1/listings/similar', params: { listing_id: sampleId } },
    { url: '/v1/listings/similar', params: { id: sampleId } },
    { url: '/v1/similar', params: { listing_id: sampleId } },
    { url: '/v1/similar', params: { id: sampleId } },
    { url: `/v1/listings/similar/${sampleId}`, params: {} }
  ];

  for (const c of candidates) {
    try {
      const res = await client.get(c.url, { params: c.params });
      console.log(`\n🎉 SUCCESS! GET ${c.url} with params:`, c.params);
      console.log('Top-level response keys:', Object.keys(res.data));
      const items = Array.isArray(res.data) ? res.data : (res.data.results || res.data.data || []);
      console.log(`Returned ${items.length} records.`);
      if (items.length > 0) {
        console.log('Sample first match:', {
          id: items[0].listing_id,
          name: items[0].apartment_name,
          locality: items[0].locality,
          bedroom: items[0].bedroom,
          price: items[0].price
        });
      }
      return;
    } catch (err) {
      console.log(`[${err.response?.status || 'ERR'}] GET ${c.url} with params:`, c.params);
    }
  }
}

run();