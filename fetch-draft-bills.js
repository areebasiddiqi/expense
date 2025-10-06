

// Replace with your actual values
const CLIENT_ID = 'F8A370E367B748D69199803D7F365A43';
const CLIENT_SECRET = 'Ga1diFptjwsnUOv_CwwRgtsGJYpM1-3gHvVt_T00GuPK4gyD';
const REFRESH_TOKEN = 'pFp2NoaR5IEU56vE9J5t3r_YXtqASrvmav_xpAL99UE';
const TENANT_ID = '346de7e9-2e21-44f3-952a-98300eecf6f7';

// 1. Get access token
const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET),
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: REFRESH_TOKEN,
  }),
});

const tokenData = await tokenResponse.json();
const accessToken = tokenData.access_token;

// 2. Fetch draft bills
const billsResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices?where=Status=="DRAFT" AND Type=="ACCPAY"', {
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Xero-Tenant-Id': TENANT_ID,
    'Accept': 'application/json'
  }
});

const billsData = await billsResponse.json();
console.log('Draft bills:', billsData.Invoices);
