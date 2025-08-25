// Simple Start Flow API tester
// Env vars required:
//  STARTFLOW_BASE_URL (default: http://localhost:5000)
//  STARTFLOW_API_KEY
//  STARTFLOW_ORG_DOMAIN or STARTFLOW_ORG_ID
//  STARTFLOW_SYSTEM (e.g., CRM Onboarding)
//  STARTFLOW_ORDER (e.g., ORD-12345)
//  STARTFLOW_DESCRIPTION (e.g., "New account setup")

const BASE = process.env.STARTFLOW_BASE_URL || 'http://localhost:5000';
const API_KEY = process.env.STARTFLOW_API_KEY;
const ORG_DOMAIN = process.env.STARTFLOW_ORG_DOMAIN;
const ORG_ID = process.env.STARTFLOW_ORG_ID;
const SYSTEM = process.env.STARTFLOW_SYSTEM || 'CRM Onboarding';
const ORDER = process.env.STARTFLOW_ORDER || 'ORD-12345';
const DESCRIPTION = process.env.STARTFLOW_DESCRIPTION || 'API test - new flow';

if (!API_KEY) {
  console.error('Missing STARTFLOW_API_KEY');
  process.exit(1);
}
if (!ORG_DOMAIN && !ORG_ID) {
  console.error('Provide STARTFLOW_ORG_DOMAIN or STARTFLOW_ORG_ID');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};
if (ORG_DOMAIN) headers['x-org-domain'] = ORG_DOMAIN;
if (ORG_ID) headers['x-org-id'] = ORG_ID;
headers['x-actor-email'] = process.env.STARTFLOW_ACTOR_EMAIL || 'bot@example.com';
headers['x-source'] = process.env.STARTFLOW_SOURCE || 'script';

const body = {
  system: SYSTEM,
  orderNumber: ORDER,
  description: DESCRIPTION,
  initialFormData: { sample: true },
  notifyAssignee: true,
};

const url = `${BASE}/api/integrations/start-flow`;
console.log('POST', url);
console.log('Headers', headers);
console.log('Body', body);

const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
console.log('Status:', res.status);
let txt;
try { txt = await res.text(); } catch { txt = ''; }
try { console.log('Response:', JSON.parse(txt)); }
catch { console.log('Response (raw):', txt); }
