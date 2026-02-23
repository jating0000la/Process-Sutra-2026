import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const challanId = 'd60825f8-c7c3-49ed-97d8-502b330cb923';

const r = await pool.query(
  `SELECT id, payu_txn_id, status, amount FROM payment_transactions WHERE challan_id = $1 ORDER BY created_at DESC LIMIT 5`,
  [challanId]
);
console.log('Transactions:', JSON.stringify(r.rows, null, 2));

const c = await pool.query(
  `SELECT id, challan_number, total_amount, status FROM challans WHERE id = $1`,
  [challanId]
);
console.log('Challan:', JSON.stringify(c.rows, null, 2));

await pool.end();
