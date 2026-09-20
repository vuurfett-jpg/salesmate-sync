#!/usr/bin/env node
const http = require('http');
const url = require('url');

const ACCESS_KEY = process.env.SALESMATE_ACCESS_KEY || 'c7563ff0-7926-11ed-9dc1-9d6790bd7812';
const SECRET_KEY = process.env.SALESMATE_SECRET_KEY || 'c7563ff1-7926-11ed-9dc1-9d6790bd7812';
const PORT = process.env.PORT || 3000;

const auth = Buffer.from(`${ACCESS_KEY}:${SECRET_KEY}`).toString('base64');

async function fetchAllAccounts() {
  let allAccounts = [];
  let offset = 0;

  while (true) {
    const path = `https://visionsalesgroup.salesmate.io/api/v2/accounts?offset=${offset}&limit=100`;
    
    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const accounts = data.data || [];

      if (!Array.isArray(accounts) || accounts.length === 0) break;

      allAccounts = allAccounts.concat(accounts);
      offset += 100;
    } catch (err) {
      throw new Error(`Failed to fetch: ${err.message}`);
    }
  }

  return allAccounts;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (parsedUrl.pathname === '/api/salesmate-fetch') {
    try {
      console.log('📥 Fetching accounts...');
      const accounts = await fetchAllAccounts();
      
      const result = {
        timestamp: new Date().toISOString(),
        totalAccounts: accounts.length,
        data: accounts,
      };

      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (parsedUrl.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', endpoint: '/api/salesmate-fetch' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Salesmate API server running at http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/salesmate-fetch\n`);
});
