const https = require('https');
const fs = require('fs');

const SALESMATE_URL = 'https://visionsalesgroup.salesmate.io/api/v3/companies';
const ACCESS_KEY = process.env.SALESMATE_ACCESS_KEY;
const SECRET_KEY = process.env.SALESMATE_SECRET_KEY;

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
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        };

        https.get(`${SALESMATE_URL}?page=${page}&rows=500`, options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            console.log(`Response status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
              console.error(`API Error: ${res.statusCode}`);
              console.error(`Response: ${body.substring(0, 200)}`);
              reject(new Error(`API returned ${res.statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              console.error(`Parse error: ${e.message}`);
              console.error(`Body: ${body.substring(0, 200)}`);
              reject(e);
            }
          });
        }).on('error', reject);
      });

      if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
        allCompanies = allCompanies.concat(data.data);
        console.log(`Got ${data.data.length} companies on page ${page}. Total: ${allCompanies.length}`);
        hasMore = data.data.length === 500;
        page++;
      } else {
        console.log('No more data or unexpected format');
        hasMore = false;
      }
    } catch (err) {
      console.error(`Error on page ${page}: ${err.message}`);
      hasMore = false;
    }
  }

  const filename = `salesmate_companies_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(allCompanies, null, 2));
  console.log(`Saved ${allCompanies.length} companies to ${filename}`);
}

fetchCompanies();
