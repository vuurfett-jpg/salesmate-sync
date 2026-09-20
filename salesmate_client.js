#!/usr/bin/env node

/**
 * Salesmate CRM API Client
 * Fetches all companies/accounts with full pagination and error handling
 * Uses Salesmate API v2 with Basic Auth (AccessKey:SecretKey)
 */

const https = require('https');
const fs = require('fs');

// Configuration
const CONFIG = {
  INSTANCE: process.env.SALESMATE_INSTANCE || 'visionsalesgroup.salesmate.io',
  ACCESS_KEY: process.env.SALESMATE_ACCESS_KEY,
  SECRET_KEY: process.env.SALESMATE_SECRET_KEY,
  API_VERSION: 'v2',
  BATCH_SIZE: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Validation
if (!CONFIG.ACCESS_KEY || !CONFIG.SECRET_KEY) {
  console.error('❌ ERROR: Missing Salesmate credentials');
  console.error('  Required: SALESMATE_ACCESS_KEY, SALESMATE_SECRET_KEY');
  process.exit(1);
}

// Build Basic Auth header
const authHeader = Buffer.from(`${CONFIG.ACCESS_KEY}:${CONFIG.SECRET_KEY}`).toString('base64');

/**
 * Make authenticated HTTPS request to Salesmate API
 */
function makeRequest(path, method = 'GET', retryCount = 0) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.INSTANCE,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Salesmate-Sync/1.0',
      },
      timeout: 10000,
    };

    console.log(`[API] ${method} https://${CONFIG.INSTANCE}${path}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`[API] Status: ${res.statusCode}, Response size: ${data.length} bytes`);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              data: parsed,
            });
          } else {
            // API returned an error status
            console.error(`[API] Error response:`, parsed);
            reject(new Error(`API returned ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (parseErr) {
          console.error(`[API] Failed to parse response:`, data.substring(0, 200));
          reject(parseErr);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.warn(`[API] Timeout, retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
        setTimeout(() => {
          makeRequest(path, method, retryCount + 1).then(resolve).catch(reject);
        }, CONFIG.RETRY_DELAY);
      } else {
        reject(new Error('Request timeout after retries'));
      }
    });

    req.on('error', (err) => {
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.warn(`[API] Error (${err.message}), retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
        setTimeout(() => {
          makeRequest(path, method, retryCount + 1).then(resolve).catch(reject);
        }, CONFIG.RETRY_DELAY);
      } else {
        reject(err);
      }
    });

    req.end();
  });
}

/**
 * Test Salesmate API connection
 */
async function testConnection() {
  console.log('\n📋 Testing Salesmate API connection...\n');

  try {
    // Test 1: Verify auth
    console.log('1️⃣  Verifying authentication...');
    const userRes = await makeRequest('/api/v2/user');
    console.log(`   ✅ Auth successful. User: ${userRes.data.data?.name || userRes.data.data?.email || 'Unknown'}\n`);

    // Test 2: Fetch sample accounts
    console.log('2️⃣  Fetching sample accounts...');
    const sampleRes = await makeRequest(`/api/v2/accounts?offset=0&limit=5`);
    const count = sampleRes.data.data?.length || 0;
    console.log(`   ✅ Retrieved ${count} sample accounts\n`);

    if (count > 0) {
      console.log('   Sample account structure:');
      console.log('   ', JSON.stringify(sampleRes.data.data[0], null, 2).split('\n').slice(0, 5).join('\n   '));
    }

    return true;
  } catch (err) {
    console.error(`   ❌ Connection test failed: ${err.message}\n`);
    return false;
  }
}

/**
 * Fetch all accounts with pagination
 */
async function fetchAllAccounts() {
  console.log('\n📥 Fetching all Salesmate accounts...\n');

  let allAccounts = [];
  let offset = 0;
  let batchNum = 0;

  try {
    while (true) {
      batchNum++;
      const path = `/api/v2/accounts?offset=${offset}&limit=${CONFIG.BATCH_SIZE}`;
      
      console.log(`   Batch ${batchNum}: offset ${offset}...`);
      const res = await makeRequest(path);

      const accounts = res.data.data || [];
      if (!Array.isArray(accounts)) {
        console.error(`   ❌ Unexpected response format:`, accounts);
        break;
      }

      allAccounts = allAccounts.concat(accounts);
      console.log(`   ✅ Added ${accounts.length} accounts (total: ${allAccounts.length})`);

      // Check if we've reached the end
      if (accounts.length < CONFIG.BATCH_SIZE) {
        console.log(`   ✅ Pagination complete (${accounts.length} < ${CONFIG.BATCH_SIZE})\n`);
        break;
      }

      offset += CONFIG.BATCH_SIZE;

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return allAccounts;
  } catch (err) {
    console.error(`\n❌ Failed to fetch accounts: ${err.message}\n`);
    throw err;
  }
}

/**
 * Save accounts to JSON file
 */
function saveToJSON(accounts) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `salesmate_accounts_${timestamp}.json`;

  const output = {
    timestamp: new Date().toISOString(),
    instance: CONFIG.INSTANCE,
    totalAccounts: accounts.length,
    data: accounts,
  };

  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${accounts.length} accounts to: ${filename}\n`);

  return filename;
}

/**
 * Generate CSV export for reference
 */
function saveToCSV(accounts) {
  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No accounts to export to CSV');
    return;
  }

  // Get all unique keys
  const allKeys = new Set();
  accounts.forEach(acc => {
    Object.keys(acc).forEach(k => allKeys.add(k));
  });
  const headers = Array.from(allKeys).sort();

  // Build CSV
  const csvLines = [headers.map(h => `"${h}"`).join(',')];

  accounts.forEach(acc => {
    const row = headers.map(h => {
      const val = acc[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvLines.push(row.join(','));
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `salesmate_accounts_${timestamp}.csv`;
  fs.writeFileSync(filename, csvLines.join('\n'));
  console.log(`✅ Saved CSV reference to: ${filename}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Salesmate API Client v1.0');
  console.log(`  Instance: ${CONFIG.INSTANCE}`);
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Fetch all accounts
    const accounts = await fetchAllAccounts();

    if (accounts.length === 0) {
      console.log('⚠️  No accounts returned from Salesmate API');
    }

    // Save outputs
    saveToJSON(accounts);
    saveToCSV(accounts);

    console.log('✅ Integration complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
