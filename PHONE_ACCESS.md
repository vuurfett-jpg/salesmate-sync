# Access Salesmate from Your Phone

## Quick Start

Run the server on any machine with network access:

```bash
node server.js
```

Server starts on `http://localhost:3000`.

## From Your Phone

1. **On same WiFi**: Open browser and go to:
   ```
   http://<your-laptop-ip>:3000/api/salesmate-fetch
   ```
   
2. **From anywhere**: Use ngrok for secure tunneling:
   ```bash
   npm install -g ngrok
   ngrok http 3000
   ```
   Then use the HTTPS URL from ngrok (valid for 2 hours).

## Response

Returns JSON with all Salesmate accounts:
```json
{
  "timestamp": "2026-09-20T...",
  "totalAccounts": 6789,
  "data": [
    { "id": "...", "name": "...", "owner": "..." },
    ...
  ]
}
```

## Save to Phone

- iOS: Long-press endpoint → Share → Save to Files
- Android: Long-press → Copy link → Open Files app → Save

Or use curl:
```bash
curl http://localhost:3000/api/salesmate-fetch > accounts.json
```
