const https = require('https');
const fs = require('fs');

const accessKey = process.env.SALESMATE_ACCESS_KEY;
const secretKey = process.env.SALESMATE_SECRET_KEY;
const instanceUrl = 'visionsalesgroup.salesmate.io';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: instanceUrl,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessKey}:${secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchAllCompanies() {
  let allCompanies = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await makeRequest(`/api/v3/companies?page=${page}&rows=500`);
      if (response.data && Array.isArray(response.data)) {
        allCompanies = allCompanies.concat(response.data);
        page++;
        hasMore = response.data.length === 500;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }

  return allCompanies;
}

async function run() {
  try {
    console.log('Fetching all Salesmate companies...');
    const companies = await fetchAllCompanies();
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `salesmate_companies_${date}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(companies, null, 2));
    console.log(`Saved ${companies.length} companies to ${filename}`);
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    process.exit(1);
  }
}

run();
