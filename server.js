#!/usr/bin/env node
const http = require('http');
const url = require('url');

const ACCESS_KEY = process.env.SALESMATE_ACCESS_KEY || 'c7563ff0-7926-11ed-9dc1-9d6790bd7812';
const SECRET_KEY = process.env.SALESMATE_SECRET_KEY || 'c7563ff1-7926-11ed-9dc1-9d6790bd7812';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
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

async function analyzeWithClaude(accounts) {
  if (!ANTHROPIC_KEY) {
    return { error: 'Set ANTHROPIC_API_KEY env var to analyze' };
  }

  const accountList = accounts.map(a => `${a.name} (Owner: ${a.owner || 'unassigned'})`).join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze these Salesmate accounts and give me a quick summary:\n\n${accountList}\n\nProvide: total count, reps with most accounts, any patterns.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API returned ${response.status}`);
    }

    const data = await response.json();
    return { analysis: data.content[0].text };
  } catch (err) {
    return { error: err.message };
  }
}

const htmlPage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Salesmate + Claude</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
    button { padding: 12px 20px; font-size: 16px; background: #007AFF; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%; margin: 10px 0; }
    button:active { background: #0051D5; }
    #status { margin-top: 20px; padding: 12px; background: #f0f0f0; border-radius: 8px; min-height: 20px; }
    #accounts { margin-top: 20px; }
    #analysis { margin-top: 20px; padding: 12px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; white-space: pre-wrap; line-height: 1.6; }
    .account { padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; }
    .count { font-weight: bold; font-size: 24px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📱 Salesmate + Claude</h1>
  <button onclick="fetchAccounts()">📥 Load Accounts</button>
  <button onclick="analyzeAccounts()" style="background: #34C759;">🤖 Claude Analysis</button>
  <div id="status"></div>
  <div id="accounts"></div>
  <div id="analysis"></div>

  <script>
    let currentAccounts = null;

    async function fetchAccounts() {
      const status = document.getElementById('status');
      const accounts = document.getElementById('accounts');
      
      status.textContent = '⏳ Loading...';
      accounts.innerHTML = '';
      
      try {
        const response = await fetch('/api/salesmate-fetch');
        const data = await response.json();
        
        if (data.error) {
          status.textContent = '❌ Error: ' + data.error;
          return;
        }
        
        currentAccounts = data.data;
        status.innerHTML = \`✅ Loaded <strong>\${data.totalAccounts}</strong> accounts\`;
        
        const csv = ['Name,ID,Owner'].concat(
          data.data.map(a => \`"\${a.name}",\${a.id},\${a.owner || ''}\`)
        ).join('\\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        accounts.innerHTML = \`
          <div class="count">\${data.totalAccounts}</div>
          <a href="\${url}" download="salesmate_accounts.csv" style="display:block; padding: 12px 20px; background: #34C759; color: white; border-radius: 8px; text-align: center; text-decoration: none; margin-bottom: 20px;">
            ⬇️ Download CSV
          </a>
        \`;
        
      } catch (err) {
        status.textContent = '❌ ' + err.message;
      }
    }

    async function analyzeAccounts() {
      if (!currentAccounts) {
        alert('Load accounts first');
        return;
      }

      const analysis = document.getElementById('analysis');
      analysis.textContent = '🤖 Claude is thinking...';
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: currentAccounts }),
        });
        const data = await response.json();
        
        if (data.error) {
          analysis.textContent = '❌ ' + data.error;
        } else {
          analysis.textContent = data.analysis;
        }
      } catch (err) {
        analysis.textContent = '❌ ' + err.message;
      }
    }
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (parsedUrl.pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(htmlPage);
  } else if (parsedUrl.pathname === '/api/salesmate-fetch') {
    res.setHeader('Content-Type', 'application/json');
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
      console.log(`✅ Returned ${accounts.length} accounts`);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
      console.error('❌', err.message);
    }
  } else if (parsedUrl.pathname === '/api/analyze') {
    res.setHeader('Content-Type', 'application/json');
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { accounts } = JSON.parse(body);
        console.log('🤖 Sending to Claude...');
        const result = await analyzeWithClaude(accounts);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  console.log(`\n🚀 Salesmate + Claude running`);
  console.log(`📱 Open on phone: http://${localIP}:${PORT}`);
  console.log(`💻 Local: http://localhost:${PORT}\n`);
});
