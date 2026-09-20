const https = require('https');
const fs = require('fs');

const SALESMATE_URL = 'https://visionsalesgroup.salesmate.io/api/v1/companies';
const ACCESS_KEY = process.env.SALESMATE_ACCESS_KEY;
const SECRET_KEY = process.env.SALESMATE_SECRET_KEY;

// Create Basic Auth header
const credentials = Buffer.from(`${ACCESS_KEY}:${SECRET_KEY}`).toString('base64');

async function fetchCompanies() {
  let allCompanies = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    
    try {
      const data = await new Promise((resolve, reject) => {
        const options = {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        };

        https.get(`${SALESMATE_URL}?page=${page}`, options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode !== 200) {
              console.error(`API Error: ${res.statusCode} ${body}`);
              reject(new Error(`API returned ${res.statusCode}`));
              return;
            }
            resolve(JSON.parse(body));
          });
        }).on('error', reject);
      });

      if (data.companies && data.companies.length > 0) {
        allCompanies = allCompanies.concat(data.companies);
        console.log(`Got ${data.companies.length} companies on page ${page}. Total so far: ${allCompanies.length}`);
        hasMore = !!data.next_page_url;
        page++;
      } else {
        hasMore = false;
        console.log('No more companies found.');
      }
    } catch (err) {
      console.error(`Error fetching page ${page}:`, err.message);
      hasMore = false;
    }
  }

  // Write to file
  const filename = `salesmate_companies_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(allCompanies, null, 2));
  console.log(`Saved ${allCompanies.length} companies to ${filename}`);
}

fetchCompanies();
