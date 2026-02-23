/**
 * Simulate a PayU success callback POST to test the fix.
 * This mimics what PayU sends to /api/billing/payu-success after payment.
 */
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const BASE = 'http://localhost:5000';

// Use the latest initiated transaction
const txnid = 'TXN-mlzqwls8-fc925d';
const challanId = 'd60825f8-c7c3-49ed-97d8-502b330cb923';

// Build the form data PayU would send
const formData = new URLSearchParams({
  mihpayid: 'DEMO-' + Date.now(),
  mode: 'CC',
  status: 'success',
  txnid: txnid,
  amount: '312.70',
  productinfo: 'Challan CH-2026-02-A0CE93D5-4CA8',
  firstname: 'Test User',
  email: 'test@example.com',
  phone: '',
  hash: 'demo-hash-will-fail-but-test-mode-bypasses',
  udf1: challanId,
  udf2: 'a0ce93d5-3a74-41a3-893e-60262d767e4b',
  udf3: '',
  udf4: '',
  udf5: '',
  error: '',
  error_Message: '',
  bank_ref_num: 'DEMO-REF-123',
  bankcode: 'CC',
});

console.log('Sending simulated PayU success callback...');
console.log('URL:', `${BASE}/api/billing/payu-success`);
console.log('txnid:', txnid);
console.log('challanId (udf1):', challanId);

try {
  const resp = await fetch(`${BASE}/api/billing/payu-success`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    redirect: 'manual',  // Don't follow the redirect
  });

  console.log('\nResponse status:', resp.status);
  console.log('Response headers:', Object.fromEntries(resp.headers.entries()));
  
  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get('location');
    console.log('Redirect to:', location);
    
    if (location?.includes('status=success')) {
      console.log('\n✅ SUCCESS! Payment callback processed correctly.');
    } else if (location?.includes('status=error')) {
      console.log('\n❌ ERROR during callback processing.');
    } else if (location?.includes('status=hash-mismatch')) {
      console.log('\n⚠️ Hash mismatch (expected in test without real hash).');
    } else {
      console.log('\n⚠️ Unexpected redirect.');
    }
  } else {
    const body = await resp.text();
    console.log('Response body:', body.slice(0, 500));
  }
} catch (err) {
  console.error('❌ Fetch error:', err.message);
}
