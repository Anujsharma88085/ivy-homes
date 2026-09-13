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

  const candidatePaths = [
    '/v1/favourites',
    '/v1/favorites',
    '/v1/saved',
    '/v1/saved-listings',
    '/v1/users/favourites',
    '/v1/users/favorites',
    '/v1/user/favorites',
    '/favourites',
    '/favorites',
    '/v1/listings/favorites',
    '/v1/listings/saved'
  ];

  console.log('--- Probing GET methods ---');
  for (const path of candidatePaths) {
    try {
      const res = await client.get(path);
      console.log(`[SUCCESS 200] GET ${path} ->`, res.data);
    } catch (err) {
      console.log(`[${err.response?.status || 'ERR'}] GET ${path}`);
    }
  }

  console.log('\n--- Probing POST methods with sample ID ---');
  for (const path of candidatePaths) {
    try {
      const res = await client.post(path, { id: '100-6000042', listing_id: '100-6000042' });
      console.log(`[SUCCESS 200/201] POST ${path} ->`, res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.log(`[NOT 404: ${err.response?.status}] POST ${path} ->`, err.response?.data);
      }
    }
  }
}

probe();