#!/usr/bin/env node
/**
 * MongoDB Index Cleanup Script
 * 
 * This script removes unused indexes to improve write performance and free up space.
 * Based on the performance analysis results.
 * 
 * ⚠️  WARNING: This will DROP indexes. Make sure you have a backup!
 * 
 * Usage:
 *   node scripts/cleanup-mongo-indexes.mjs [--dry-run]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
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
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// List of indexes to keep (these are actively used or essential)
const KEEP_INDEXES = [
  '_id_', // MongoDB default, cannot be dropped
  'orgId_1_flowId_1_createdAt_-1', // Active: 25 ops/day
  'orgId_1_formId_1_createdAt_-1', // Active: 14 ops/day
  'orgId_1_createdAt_-1', // Active: 1 op/day
];

// Indexes to drop (currently unused)
const DROP_INDEXES = [
  'idx_formResponses_order', // 0 ops - sparse index for orderNumber
  'idx_formResponses_task', // 0 ops - redundant with compound indexes
  'idx_org_system_created', // 0 ops - sparse index for system field
  'idx_org_taskname_created', // 0 ops - not used in current queries
  'idx_flow_created', // 0 ops - covered by orgId_1_flowId_1_createdAt_-1
  'idx_submitter_created', // 0 ops - not used in current queries
  'orgId_1_taskId_1', // 0 ops - not used
  'createdAt_-1', // 0 ops - not selective enough
  'orgId_1_flowId_1_taskId_1_createdAt_-1', // 0 ops - too specific, not used
  'taskName_text_formData_text_submittedBy_text', // 0 ops - text index not used
  'orgId_1_submittedBy_1_createdAt_-1', // 0 ops - not used in current queries
  'flowId_1_createdAt_-1', // 0 ops - covered by compound index
];

async function cleanupIndexes() {
  console.log('🧹 MongoDB Index Cleanup Script\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  LIVE MODE - Indexes will be DELETED!\n');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('=' .repeat(70) + '\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    const collection = db.collection('formResponses');
    
    // Get current indexes
    const indexes = await collection.indexes();
    
    console.log('📊 Current Index Status:\n');
    console.log(`  Total Indexes: ${indexes.length}`);
    console.log(`  Indexes to Keep: ${KEEP_INDEXES.length}`);
    console.log(`  Indexes to Drop: ${DROP_INDEXES.length}\n`);
    
    // Calculate space to be freed
    const stats = await db.command({ collStats: 'formResponses' });
    let spaceSaved = 0;
    
    DROP_INDEXES.forEach(idxName => {
      const size = stats.indexSizes?.[idxName] || 0;
      spaceSaved += size;
    });
    
    console.log(`  💾 Space to be freed: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('─'.repeat(70) + '\n');
    
    // Drop unused indexes
    let dropped = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const indexName of DROP_INDEXES) {
      const exists = indexes.some(idx => idx.name === indexName);
      
      if (!exists) {
        console.log(`  ⏭️  Skipped: ${indexName} (doesn't exist)`);
        skipped++;
        continue;
      }
      
      const indexInfo = indexes.find(idx => idx.name === indexName);
      const indexSize = stats.indexSizes?.[indexName] || 0;
      
      console.log(`  🗑️  Dropping: ${indexName}`);
      console.log(`     Keys: ${JSON.stringify(indexInfo.key)}`);
      console.log(`     Size: ${(indexSize / 1024).toFixed(2)} KB`);
      
      if (!DRY_RUN) {
        try {
          await collection.dropIndex(indexName);
          console.log(`     ✅ Dropped successfully\n`);
          dropped++;
        } catch (error) {
          console.log(`     ❌ Error: ${error.message}\n`);
          errors++;
        }
      } else {
        console.log(`     [DRY RUN] Would drop this index\n`);
        dropped++;
      }
    }
    
    console.log('─'.repeat(70) + '\n');
    
    // Summary
    console.log('📊 CLEANUP SUMMARY\n');
    console.log(`  Dropped: ${dropped}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Space Freed: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB\n`);
    
    if (DRY_RUN) {
      console.log('ℹ️  This was a dry run. No changes were made.');
      console.log('   Run without --dry-run to actually drop indexes.\n');
    } else {
      console.log('✅ Cleanup completed successfully!\n');
      
      // Verify remaining indexes
      const remainingIndexes = await collection.indexes();
      console.log('📋 Remaining Indexes:\n');
      remainingIndexes.forEach((idx, i) => {
        console.log(`  ${i + 1}. ${idx.name}`);
        console.log(`     Keys: ${JSON.stringify(idx.key)}`);
      });
      console.log('');
      
      // Show new stats
      const newStats = await db.command({ collStats: 'formResponses' });
      console.log('📈 Updated Statistics:\n');
      console.log(`  Total Indexes: ${newStats.nindexes}`);
      console.log(`  Total Index Size: ${(newStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Index to Data Ratio: ${((newStats.totalIndexSize / newStats.size) * 100).toFixed(1)}%\n`);
    }
    
    console.log('💡 Next Steps:\n');
    console.log('  1. Run analyze-mongo-performance.mjs to verify improvements');
    console.log('  2. Monitor application performance for any issues');
    console.log('  3. Check query logs to ensure no queries are affected');
    console.log('  4. Consider re-creating indexes if needed based on actual usage\n');
    
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the cleanup
cleanupIndexes().catch(console.error);
