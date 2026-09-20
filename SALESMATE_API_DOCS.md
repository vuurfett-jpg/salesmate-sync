# Salesmate API Integration Guide

**Instance:** `visionsalesgroup.salesmate.io`  
**API Version:** v2  
**Auth Method:** Basic Auth (AccessKey:SecretKey)

---

## Quick Reference

### Credentials
```
AccessKey: c7563ff0-7926-11ed-9dc1-9d6790bd7812
SecretKey: c7563ff1-7926-11ed-9dc1-9d6790bd7812
```

### Authentication Header
```
Authorization: Basic <base64(AccessKey:SecretKey)>
```

Example in JavaScript:
```javascript
const authHeader = Buffer.from(`${accessKey}:${secretKey}`).toString('base64');
const headers = { 'Authorization': `Basic ${authHeader}` };
```

---

## API Endpoints

### 1. Get Current User (Auth Test)
**GET** `/api/v2/user`

Verify authentication and get current user info.

**Response:**
```json
{
  "data": {
    "id": "...",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

### 2. List All Accounts/Companies
**GET** `/api/v2/accounts?offset={offset}&limit={limit}`

Paginated list of all accounts.

**Parameters:**
- `offset` (int): Starting position (default: 0)
- `limit` (int): Records per batch (max: 100, recommended: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Company Name",
      "owner": "Owner Name",
      "email": "contact@company.com",
      "phone": "...",
      "address": "...",
      "...": "other fields"
    }
  ]
}
```

### 3. List All Users/Owners
**GET** `/api/v2/users`

Get list of all team members/owners.

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Owner Name",
      "email": "owner@example.com",
      "role": "..."
    }
  ]
}
```

---

## Pagination Pattern

Salesmate uses offset-based pagination:

```javascript
let allData = [];
let offset = 0;
const limit = 100;

while (true) {
  const response = await fetch(
    `https://visionsalesgroup.salesmate.io/api/v2/accounts?offset=${offset}&limit=${limit}`,
    { headers: { 'Authorization': `Basic ${authHeader}` } }
  );
  const { data } = await response.json();
  
  allData = allData.concat(data);
  
  if (data.length < limit) break; // Last page
  offset += limit;
}
```

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (auth failed) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Server error |

---

## Error Handling

Always check the response status and parse error messages:

```javascript
if (!response.ok) {
  const error = await response.json();
  console.error(`API Error ${response.status}:`, error.message || error);
}
```

---

## Rate Limiting

- No documented rate limit, but use reasonable delays between requests
- Recommended: 200ms pause between paginated batches
- Implement retry logic with exponential backoff for timeouts

---

## Network Considerations

- **Cowork environment:** Salesmate egress blocked (use GitHub Actions or local machine)
- **GitHub Actions:** Full access ✅
- **Local machine:** Runs directly ✅
- **Claude Cowork session:** Blocked (use GitHub Actions output)

---

## Implementation Examples

### Node.js (Recommended for Automation)

See `salesmate_client.js` in this repo for full implementation with:
- Basic auth
- Pagination
- Retry logic
- Error handling
- JSON and CSV output

Run with:
```bash
SALESMATE_ACCESS_KEY=... SALESMATE_SECRET_KEY=... node salesmate_client.js
```

### cURL (Quick Testing)

```bash
ACCESS_KEY="c7563ff0-7926-11ed-9dc1-9d6790bd7812"
SECRET_KEY="c7563ff1-7926-11ed-9dc1-9d6790bd7812"
AUTH=$(echo -n "$ACCESS_KEY:$SECRET_KEY" | base64)

curl -H "Authorization: Basic $AUTH" \
  "https://visionsalesgroup.salesmate.io/api/v2/accounts?offset=0&limit=10"
```

### Python

```python
import requests
import base64
from itertools import count

ACCESS_KEY = "c7563ff0-7926-11ed-9dc1-9d6790bd7812"
SECRET_KEY = "c7563ff1-7926-11ed-9dc1-9d6790bd7812"

auth = base64.b64encode(f"{ACCESS_KEY}:{SECRET_KEY}".encode()).decode()
headers = {"Authorization": f"Basic {auth}"}

all_accounts = []
for offset in count(0, 100):
    response = requests.get(
        f"https://visionsalesgroup.salesmate.io/api/v2/accounts?offset={offset}&limit=100",
        headers=headers
    )
    accounts = response.json()["data"]
    if not accounts:
        break
    all_accounts.extend(accounts)
```

---

## Troubleshooting

### 401 Unauthorized
- ❌ Check AccessKey and SecretKey are correct
- ❌ Verify Base64 encoding: `base64(AccessKey:SecretKey)`
- ❌ Check `Authorization` header format: `Basic <base64>`

### Empty Results
- ✅ Verify account exists in Salesmate UI
- ✅ Check user/API key has proper permissions
- ✅ Try `/api/v2/user` first to confirm auth works

### Network Blocked
- ✅ If in Cowork: Use GitHub Actions (see workflow file)
- ✅ If local: Run Node.js script directly
- ✅ If other: Check network egress allowlist

### Timeout
- ✅ Implement retry logic (max 3 retries)
- ✅ Add 200ms delay between batches
- ✅ Increase request timeout to 10+ seconds

---

## Automation

### GitHub Actions (Recommended)
- Runs daily at 6 AM UTC
- Manual dispatch available
- Commits results to repo
- No local machine needed

See `.github/workflows/sync.yml` for configuration.

### Local Cron Job
```bash
# Add to crontab
0 6 * * * /usr/bin/node /path/to/salesmate_client.js
```

---

## Data Available

Each account record includes:
- `id` — Unique account ID
- `name` — Company/account name
- `owner` — Assigned owner/rep
- `email` — Contact email
- `phone` — Contact phone
- `address` — Full address
- `customField_*` — Custom fields (depends on Salesmate config)

---

## Contact & Support

For API issues:
1. Check credentials in repo secrets
2. Review GitHub Actions workflow logs
3. Test auth with `/api/v2/user` endpoint
4. Check Salesmate UI for data consistency

