#!/usr/bin/env node
/**
 * MongoDB Index Performance Analyzer
 * 
 * This script analyzes index usage and provides performance recommendations.
 * Run this periodically to identify unused indexes and optimization opportunities.
 * 
 * Usage:
 *   node scripts/analyze-mongo-performance.mjs
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

async function analyzePerformance() {
  console.log('🔍 MongoDB Performance Analyzer\n');
  console.log('=' .repeat(70) + '\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    const collection = db.collection('formResponses');
    
    // =========================================================================
    // COLLECTION STATISTICS
    // =========================================================================
    
    console.log('📊 COLLECTION STATISTICS');
    console.log('─'.repeat(70) + '\n');
    
    const stats = await db.command({ collStats: 'formResponses' });
    const avgDocSize = stats.count > 0 ? (stats.size / stats.count / 1024).toFixed(2) : 0;
    
    console.log(`  Collection: formResponses`);
    console.log(`  Documents: ${stats.count.toLocaleString()}`);
    console.log(`  Total Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Avg Document Size: ${avgDocSize} KB`);
    console.log(`  Indexes: ${stats.nindexes}`);
    console.log(`  Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Index to Data Ratio: ${((stats.totalIndexSize / stats.size) * 100).toFixed(1)}%\n`);
    
    // =========================================================================
    // INDEX USAGE STATISTICS
    // =========================================================================
    
    console.log('📈 INDEX USAGE STATISTICS');
    console.log('─'.repeat(70) + '\n');
    
    const indexStats = await collection.aggregate([
      { $indexStats: {} }
    ]).toArray();
    
    // Sort by usage (accesses)
    indexStats.sort((a, b) => {
      const aAccesses = (a.accesses?.ops || 0) + (a.accesses?.since?.getTime() || 0);
      const bAccesses = (b.accesses?.ops || 0) + (b.accesses?.since?.getTime() || 0);
      return bAccesses - aAccesses;
    });
    
    console.log('  Index Usage (sorted by operations):');
    console.log('  ' + '─'.repeat(68) + '\n');
    
    indexStats.forEach((stat, i) => {
      const ops = stat.accesses?.ops || 0;
      const since = stat.accesses?.since || new Date();
      const daysSince = Math.max(1, (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
      const opsPerDay = (ops / daysSince).toFixed(1);
      
      let status = '✅';
      if (ops === 0) status = '❌';
      else if (opsPerDay < 1) status = '⚠️';
      
      console.log(`  ${status} ${i + 1}. ${stat.name}`);
      console.log(`     Operations: ${ops.toLocaleString()} (${opsPerDay}/day)`);
      console.log(`     Keys: ${JSON.stringify(stat.key)}`);
      console.log('');
    });
    
    // =========================================================================
    // UNUSED INDEXES REPORT
    // =========================================================================
    
    const unusedIndexes = indexStats.filter(stat => 
      stat.name !== '_id_' && (stat.accesses?.ops || 0) === 0
    );
    
    if (unusedIndexes.length > 0) {
      console.log('⚠️  UNUSED INDEXES (Candidates for Removal)');
      console.log('─'.repeat(70) + '\n');
      
      let totalUnusedSize = 0;
      
      for (const idx of unusedIndexes) {
        const indexInfo = stats.indexSizes?.[idx.name] || 0;
        totalUnusedSize += indexInfo;
        
        console.log(`  ❌ ${idx.name}`);
        console.log(`     Keys: ${JSON.stringify(idx.key)}`);
        console.log(`     Size: ${(indexInfo / 1024).toFixed(2)} KB`);
        console.log(`     Command: db.formResponses.dropIndex("${idx.name}")`);
        console.log('');
      }
      
      console.log(`  💾 Total space that could be freed: ${(totalUnusedSize / 1024 / 1024).toFixed(2)} MB\n`);
    } else {
      console.log('✅ All indexes are being used!\n');
    }
    
    // =========================================================================
    // LOW-USAGE INDEXES WARNING
    // =========================================================================
    
    const lowUsageIndexes = indexStats.filter(stat => {
      if (stat.name === '_id_') return false;
      const ops = stat.accesses?.ops || 0;
      const since = stat.accesses?.since || new Date();
      const daysSince = Math.max(1, (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
      const opsPerDay = ops / daysSince;
      return ops > 0 && opsPerDay < 1;
    });
    
    if (lowUsageIndexes.length > 0) {
      console.log('⚠️  LOW-USAGE INDEXES (Less than 1 operation/day)');
      console.log('─'.repeat(70) + '\n');
      
      lowUsageIndexes.forEach(stat => {
        const ops = stat.accesses?.ops || 0;
        const since = stat.accesses?.since || new Date();
        const daysSince = Math.max(1, (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
        const opsPerDay = (ops / daysSince).toFixed(2);
        
        console.log(`  ⚠️  ${stat.name}`);
        console.log(`     Keys: ${JSON.stringify(stat.key)}`);
        console.log(`     Usage: ${ops} ops in ${daysSince.toFixed(0)} days (${opsPerDay}/day)`);
        console.log('');
      });
    }
    
    // =========================================================================
    // DUPLICATE/REDUNDANT INDEX DETECTION
    // =========================================================================
    
    console.log('🔎 REDUNDANT INDEX DETECTION');
    console.log('─'.repeat(70) + '\n');
    
    const indexes = await collection.indexes();
    const redundantPairs = [];
    
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const idx1Keys = Object.keys(indexes[i].key);
        const idx2Keys = Object.keys(indexes[j].key);
        
        // Check if one index is a prefix of another
        if (idx1Keys.length < idx2Keys.length) {
          const isPrefix = idx1Keys.every((key, k) => 
            idx2Keys[k] === key && indexes[i].key[key] === indexes[j].key[key]
          );
          if (isPrefix) {
            redundantPairs.push({
              redundant: indexes[i].name,
              covered_by: indexes[j].name,
              redundant_keys: indexes[i].key,
              covering_keys: indexes[j].key
            });
          }
        } else if (idx2Keys.length < idx1Keys.length) {
          const isPrefix = idx2Keys.every((key, k) => 
            idx1Keys[k] === key && indexes[i].key[key] === indexes[j].key[key]
          );
          if (isPrefix) {
            redundantPairs.push({
              redundant: indexes[j].name,
              covered_by: indexes[i].name,
              redundant_keys: indexes[j].key,
              covering_keys: indexes[i].key
            });
          }
        }
      }
    }
    
    if (redundantPairs.length > 0) {
      console.log('  ⚠️  Found potentially redundant indexes:\n');
      redundantPairs.forEach(pair => {
        console.log(`  ❌ "${pair.redundant}" may be redundant`);
        console.log(`     Keys: ${JSON.stringify(pair.redundant_keys)}`);
        console.log(`     Covered by: "${pair.covered_by}"`);
        console.log(`     Keys: ${JSON.stringify(pair.covering_keys)}`);
        console.log(`     💡 Consider dropping: db.formResponses.dropIndex("${pair.redundant}")`);
        console.log('');
      });
    } else {
      console.log('  ✅ No redundant indexes detected\n');
    }
    
    // =========================================================================
    // RECOMMENDATIONS
    // =========================================================================
    
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(70) + '\n');
    
    const recommendations = [];
    
    // Check index to data ratio
    if (stats.totalIndexSize / stats.size > 0.5) {
      recommendations.push({
        priority: '⚠️  MEDIUM',
        issue: 'High index to data ratio (> 50%)',
        action: 'Review if all indexes are necessary. Consider dropping unused indexes.'
      });
    }
    
    // Check number of indexes
    if (stats.nindexes > 15) {
      recommendations.push({
        priority: '⚠️  MEDIUM',
        issue: `Large number of indexes (${stats.nindexes})`,
        action: 'Too many indexes can slow down write operations. Review necessity of each index.'
      });
    }
    
    // Check for unused indexes
    if (unusedIndexes.length > 0) {
      recommendations.push({
        priority: '🔴 HIGH',
        issue: `${unusedIndexes.length} unused index(es) found`,
        action: 'Drop unused indexes to free space and improve write performance.'
      });
    }
    
    // Check for redundant indexes
    if (redundantPairs.length > 0) {
      recommendations.push({
        priority: '🟠 MEDIUM',
        issue: `${redundantPairs.length} potentially redundant index(es)`,
        action: 'Review and drop redundant indexes. Compound indexes can cover prefix queries.'
      });
    }
    
    // Check collection size
    if (stats.count > 100000) {
      recommendations.push({
        priority: 'ℹ️  INFO',
        issue: `Large collection (${stats.count.toLocaleString()} documents)`,
        action: 'Consider implementing data archival strategy for old records.'
      });
    }
    
    // Check average document size
    if (avgDocSize > 500) {
      recommendations.push({
        priority: 'ℹ️  INFO',
        issue: `Large average document size (${avgDocSize} KB)`,
        action: 'Consider storing large fields separately or compressing data.'
      });
    }
    
    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.priority}`);
        console.log(`     Issue: ${rec.issue}`);
        console.log(`     Action: ${rec.action}`);
        console.log('');
      });
    } else {
      console.log('  ✅ No issues found. Collection is well-optimized!\n');
    }
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    
    console.log('📋 SUMMARY');
    console.log('─'.repeat(70) + '\n');
    
    const activeIndexes = indexStats.filter(s => (s.accesses?.ops || 0) > 0).length;
    const healthScore = Math.max(0, 100 - 
      (unusedIndexes.length * 10) - 
      (redundantPairs.length * 5) - 
      (lowUsageIndexes.length * 3)
    );
    
    console.log(`  Total Indexes: ${stats.nindexes}`);
    console.log(`  Active Indexes: ${activeIndexes}`);
    console.log(`  Unused Indexes: ${unusedIndexes.length}`);
    console.log(`  Low-Usage Indexes: ${lowUsageIndexes.length}`);
    console.log(`  Redundant Indexes: ${redundantPairs.length}`);
    console.log(`  Health Score: ${healthScore}/100`);
    console.log('');
    
    if (healthScore >= 90) {
      console.log('  ✅ Excellent! Your indexes are well-optimized.\n');
    } else if (healthScore >= 70) {
      console.log('  ⚠️  Good, but there are some optimization opportunities.\n');
    } else {
      console.log('  ❌ Action needed! Review and optimize your indexes.\n');
    }
    
    console.log('=' .repeat(70));
    console.log('✅ Analysis complete!\n');
    
  } catch (error) {
    console.error('❌ Error analyzing performance:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the analysis
analyzePerformance().catch(console.error);
