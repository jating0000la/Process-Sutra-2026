#!/usr/bin/env node
/**
 * MongoDB Index Setup Script
 * 
 * This script creates essential indexes on MongoDB collections for optimal performance.
 * Run this script after setting up MongoDB to ensure all required indexes are in place.
 * 
 * Usage:
 *   node scripts/setup-mongo-indexes.mjs
 * 
 * Environment Variables Required:
 *   - MONGODB_URI: MongoDB connection string
 *   - MONGODB_DB: Database name
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'processsutra';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function setupMongoIndexes() {
  console.log('🔧 Starting MongoDB index setup...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    const formResponsesCollection = db.collection('formResponses');
    
    // =========================================================================
    // CHECK EXISTING INDEXES
    // =========================================================================
    
    console.log('� Checking existing indexes...\n');
    const existingIndexes = await formResponsesCollection.indexes();
    const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));
    const existingIndexKeys = existingIndexes.map(idx => JSON.stringify(idx.key));
    
    console.log(`  Found ${existingIndexes.length} existing indexes\n`);
    
    // Helper function to create index safely
    async function createIndexSafely(keys, options, description) {
      const keySignature = JSON.stringify(keys);
      
      // Check if exact index already exists
      if (existingIndexNames.has(options.name)) {
        console.log(`  ⏭️  Skipping: ${description} (already exists)`);
        return 'skipped';
      }
      
      // Check if same keys exist with different name
      if (existingIndexKeys.includes(keySignature)) {
        console.log(`  ⚠️  Index keys exist with different name: ${description}`);
        console.log(`     Use dropIndex() manually if you want to recreate it`);
        return 'exists-different-name';
      }
      
      // Create new index
      try {
        console.log(`  ➤ Creating: ${description}...`);
        await formResponsesCollection.createIndex(keys, options);
        console.log(`    ✅ Created\n`);
        return 'created';
      } catch (error) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          console.log(`    ⚠️  Index conflict (already exists): ${description}\n`);
          return 'conflict';
        }
        throw error;
      }
    }
    
    // =========================================================================
    // FORM RESPONSES COLLECTION INDEXES
    // =========================================================================
    
    console.log('📊 Creating indexes on formResponses collection...\n');
    
    let created = 0, skipped = 0, errors = 0;
    
    // 1. Compound index for flow-based queries (EXISTING - from audit report)
    const result1 = await createIndexSafely(
      { orgId: 1, flowId: 1, taskId: 1, createdAt: -1 },
      { name: 'idx_formResponses_flow_lookup', background: true },
      '(orgId, flowId, taskId, createdAt)'
    );
    if (result1 === 'created') created++;
    else if (result1 === 'skipped' || result1 === 'exists-different-name') skipped++;
    if (result1 === 'created') created++;
    else if (result1 === 'skipped' || result1 === 'exists-different-name') skipped++;
    
    // 2. Compound index for form-specific queries (NEW - from audit recommendations)
    const result2 = await createIndexSafely(
      { orgId: 1, formId: 1, createdAt: -1 },
      { name: 'idx_formResponses_form_lookup', background: true },
      '(orgId, formId, createdAt)'
    );
    if (result2 === 'created') created++;
    else if (result2 === 'skipped' || result2 === 'exists-different-name') skipped++;
    
    // 3. Date-based queries for analytics (NEW - from audit recommendations)
    const result3 = await createIndexSafely(
      { orgId: 1, createdAt: -1 },
      { name: 'idx_formResponses_org_date', background: true },
      '(orgId, createdAt)'
    );
    if (result3 === 'created') created++;
    else if (result3 === 'skipped' || result3 === 'exists-different-name') skipped++;
    
    // 4. Task-specific lookups (for finding all responses for a task)
    const result4 = await createIndexSafely(
      { taskId: 1, createdAt: -1 },
      { name: 'idx_formResponses_task', background: true },
      '(taskId, createdAt)'
    );
    if (result4 === 'created') created++;
    else if (result4 === 'skipped' || result4 === 'exists-different-name') skipped++;
    
    // 5. Submitted by user for audit trail
    const result5 = await createIndexSafely(
      { orgId: 1, submittedBy: 1, createdAt: -1 },
      { name: 'idx_formResponses_user_submissions', background: true },
      '(orgId, submittedBy, createdAt)'
    );
    if (result5 === 'created') created++;
    else if (result5 === 'skipped' || result5 === 'exists-different-name') skipped++;
    
    // 6. System-based queries (for workflow analytics)
    const result6 = await createIndexSafely(
      { orgId: 1, system: 1, createdAt: -1 },
      { name: 'idx_formResponses_system', background: true, sparse: true },
      '(orgId, system, createdAt) [sparse]'
    );
    if (result6 === 'created') created++;
    else if (result6 === 'skipped' || result6 === 'exists-different-name') skipped++;
    
    // 7. Order number lookups (for case-based queries)
    const result7 = await createIndexSafely(
      { orgId: 1, orderNumber: 1, createdAt: -1 },
      { name: 'idx_formResponses_order', background: true, sparse: true },
      '(orgId, orderNumber, createdAt) [sparse]'
    );
    if (result7 === 'created') created++;
    else if (result7 === 'skipped' || result7 === 'exists-different-name') skipped++;
    if (result7 === 'created') created++;
    else if (result7 === 'skipped' || result7 === 'exists-different-name') skipped++;
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    
    console.log('\n📊 Index Creation Summary:');
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}\n`);
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}\n`);
    
    // =========================================================================
    // VERIFY INDEXES
    // =========================================================================
    
    console.log('🔍 Verifying indexes...\n');
    const indexes = await formResponsesCollection.indexes();
    
    console.log('📋 Current indexes on formResponses collection:');
    indexes.forEach((index, i) => {
      const sizeInfo = index.sparse ? ' [sparse]' : '';
      const ttlInfo = index.expireAfterSeconds ? ` [TTL: ${index.expireAfterSeconds}s]` : '';
      console.log(`  ${i + 1}. ${index.name}${sizeInfo}${ttlInfo}`);
      console.log(`     Keys: ${JSON.stringify(index.key)}`);
    });
    console.log('');
    
    // =========================================================================
    // COLLECTION STATISTICS
    // =========================================================================
    
    console.log('📊 Collection Statistics:\n');
    const stats = await db.command({ collStats: 'formResponses' });
    
    console.log(`  • Document count: ${stats.count.toLocaleString()}`);
    console.log(`  • Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  • Index count: ${stats.nindexes}`);
    console.log(`  • Total index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    
    // =========================================================================
    // PERFORMANCE RECOMMENDATIONS
    // =========================================================================
    
    if (created > 0) {
      console.log('💡 Performance Tips:');
      console.log('  • New indexes will improve query performance immediately');
      console.log('  • Monitor index usage with: db.formResponses.aggregate([{$indexStats:{}}])');
      console.log('  • Check slow queries with profiling enabled');
      console.log('  • Consider compound indexes for your most common queries\n');
    }
    
    if (skipped > 0) {
      console.log('ℹ️  Note: Some indexes were skipped (already exist)');
      console.log('   This is normal on subsequent runs.\n');
    }
    
    console.log('✅ MongoDB index setup completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error setting up MongoDB indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupMongoIndexes().catch(console.error);
