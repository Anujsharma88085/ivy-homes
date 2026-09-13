import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://solve.ivy.homes';
const API_KEY = process.env.API_KEY || 'IVY26-8B68015ADE35';
const EMAIL = process.env.DEMO_EMAIL || 'demo1@ivy.homes';
const PASSWORD = process.env.DEMO_PASSWORD;

async function probe() {
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
    `/v1/listings/${sampleId}/similar`,
    `/v1/listing/${sampleId}/similar`,
    `/v1/similar/${sampleId}`,
    `/v1/listings/similar/${sampleId}`,
    `/v1/similar?listing_id=${sampleId}`,
    `/v1/properties/${sampleId}/similar`,
    `/v1/recommendations/${sampleId}`
  ];

  console.log(`--- Probing Similar Listings for ID: ${sampleId} ---`);
  for (const path of candidates) {
    try {
      const res = await client.get(path);
      console.log(`[SUCCESS 200] GET ${path} ->`, res.data);
      return;
    } catch (err) {
      console.log(`[${err.response?.status || 'ERR'}] GET ${path}`);
    }
  }
  console.log('All candidate endpoints returned 404. Endpoint does not exist on server.');
}

probe();