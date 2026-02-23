/**
 * Create a demo challan for testing the PayU payment flow.
 * Usage: node scripts/create-demo-challan.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // 1. Find the first organization
    const orgRes = await pool.query(`SELECT id, name, domain FROM organizations LIMIT 1`);
    if (orgRes.rows.length === 0) {
      console.error('❌ No organizations found. Create one first.');
      process.exit(1);
    }
    const org = orgRes.rows[0];
    console.log(`✅ Using org: ${org.name} (${org.id})`);

    // 2. Check if there's already an unpaid demo challan
    const existingRes = await pool.query(
      `SELECT id, challan_number, total_amount, status FROM challans 
       WHERE organization_id = $1 AND status = 'generated' 
       ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    );
    
    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      console.log(`⚠️  Existing unpaid challan found:`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Number: ${existing.challan_number}`);
      console.log(`   Amount: ₹${(existing.total_amount / 100).toFixed(2)}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`\n   Use this challan for payment testing.`);
      await pool.end();
      return;
    }

    // 3. Create a demo challan
    const id = crypto.randomUUID();
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    const periodStart = new Date(Date.UTC(prevYear, prevMonth, 1));
    const periodEnd = new Date(Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999));
    
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    const shortOrg = org.id.slice(0, 6).toUpperCase();
    const challanNumber = `CH-${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${shortOrg}-DEMO`;
    
    // Demo amounts (in paise)
    const baseCost = 100000;     // ₹1,000
    const flowCount = 5;
    const flowCost = 2500;       // ₹25
    const userCount = 3;
    const userCost = 30000;      // ₹300
    const formCount = 12;
    const formCost = 2400;       // ₹24
    const storageMb = 0;
    const storageCost = 0;
    const subtotal = baseCost + flowCost + userCost + formCost + storageCost;
    const taxPercent = 18;
    const taxAmount = Math.round(subtotal * taxPercent / 100);
    const totalAmount = subtotal + taxAmount;

    await pool.query(
      `INSERT INTO challans (
        id, challan_number, organization_id,
        billing_period_start, billing_period_end,
        flow_count, flow_cost, user_count, user_cost,
        form_count, form_cost, storage_mb, storage_cost,
        base_cost, subtotal, tax_percent, tax_amount, total_amount,
        status, due_date, generated_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        'generated', $19, 'demo-script', NOW(), NOW()
      )`,
      [
        id, challanNumber, org.id,
        periodStart, periodEnd,
        flowCount, flowCost, userCount, userCost,
        formCount, formCost, storageMb, storageCost,
        baseCost, subtotal, taxPercent, taxAmount, totalAmount,
        dueDate,
      ]
    );

    console.log(`\n✅ Demo challan created!`);
    console.log(`   ID:       ${id}`);
    console.log(`   Number:   ${challanNumber}`);
    console.log(`   Period:   ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`);
    console.log(`   Base:     ₹${(baseCost / 100).toFixed(2)}`);
    console.log(`   Subtotal: ₹${(subtotal / 100).toFixed(2)}`);
    console.log(`   Tax (${taxPercent}%): ₹${(taxAmount / 100).toFixed(2)}`);
    console.log(`   Total:    ₹${(totalAmount / 100).toFixed(2)}`);
    console.log(`   Due:      ${dueDate.toISOString().slice(0, 10)}`);
    console.log(`   Status:   generated`);
    console.log(`\n🔗 Go to /payments in your app and click "Pay Now" on this challan.`);
    console.log(`   PayU test card: 5123456789012346, Expiry: any future, CVV: 123`);

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
