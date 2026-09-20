# Salesmate API Integration Setup

Complete guide to pulling owner account data from Salesmate CRM for frequency analysis and territory reviews.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Salesmate CRM (visionsalesgroup.salesmate.io)               │
│  ├─ All Accounts                                            │
│  ├─ Owner Assignments                                       │
│  └─ Call Activity (queried separately)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ Basic Auth + /api/v2/accounts
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions (Daily @ 6 AM UTC or Manual)                 │
│  └─ salesmate_client.js                                     │
│     ├─ Fetches all accounts (paginated)                     │
│     ├─ Generates JSON output                                │
│     └─ Commits to repo (vuurfett-jpg/salesmate-sync)        │
└────────────────────┬────────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
        salesmate_     salesmate_
        accounts_      accounts_
        2026-09-20     2026-09-20
        .json          .csv
              │             │
         ┌────┴─────────────┴────┐
         ▼                       ▼
    Claude Session        Local Reference
    (Query by owner)      (Excel import)
```

---

## Setup Steps

### 1. Credentials (Already Done ✅)

**Stored in GitHub Secrets** (repo: vuurfett-jpg/salesmate-sync):
```
SALESMATE_ACCESS_KEY = c7563ff0-7926-11ed-9dc1-9d6790bd7812
SALESMATE_SECRET_KEY = c7563ff1-7926-11ed-9dc1-9d6790bd7812
```

### 2. Repository Files

Copy these files to your GitHub repo:

**File 1: `salesmate_client.js`** (Main fetcher)
- Uses Salesmate API v2
- Handles pagination, retries, errors
- Outputs JSON and CSV
- Place in repo root

**File 2: `.github/workflows/sync.yml`** (GitHub Actions)
- Runs daily + manual trigger
- Uses secrets automatically
- Commits output files
- Place in `.github/workflows/` directory

### 3. Verify Setup

#### Option A: Manual Trigger
1. Go to: `github.com/vuurfett-jpg/salesmate-sync`
2. Click **Actions** tab
3. Select **Salesmate Data Sync**
4. Click **Run workflow**
5. Check logs (should complete in ~30 seconds)

#### Option B: Check Daily Run
- Scheduled for 6 AM UTC daily
- Check repo for new `salesmate_accounts_*.json` files
- Each commit tagged with date

---

## Usage Patterns

### Pattern 1: Query Accounts by Owner

Once data is synced, you can ask Claude:

```
"How many accounts does Garrett own?"
"What's the call frequency for Jorge's territory?"
"Show me Benjamin Supply and its owner from Salesmate"
```

### Pattern 2: Download & Import

1. Go to GitHub repo → latest run output
2. Download `salesmate_accounts_*.json`
3. Upload to Claude session
4. Query by owner, territory, or custom fields

### Pattern 3: Automate Reports

Ask Claude to generate owner-scoped reports:
```
"Pull all accounts for [Owner Name] and show call frequency"
```

---

## Troubleshooting

### Issue: Workflow shows red ❌

**Check:**
1. Go to **Actions** → Latest run
2. Click the failed step
3. Look for error message

**Common fixes:**
```
❌ "Missing credentials"
   → Check GitHub Secrets are set in repo settings

❌ "API returned 401"
   → Credentials are wrong; verify in Salesmate Admin

❌ "Empty data returned"
   → API call succeeded but no accounts; check Salesmate has data

❌ "Timeout"
   → Temporary network issue; re-run workflow
```

### Issue: No files in repo

**Check:**
1. Workflow completed successfully (green ✅)
2. Commit was pushed
3. Check with: `git log --oneline | head -5`

**Fix:** Manually run workflow:
- Actions tab → Salesmate Data Sync → Run workflow

---

## Local Testing (Without GitHub)

If you want to test locally:

```bash
# Install Node.js (v18+)
# Download salesmate_client.js to your computer

# Set credentials
export SALESMATE_ACCESS_KEY="c7563ff0-7926-11ed-9dc1-9d6790bd7812"
export SALESMATE_SECRET_KEY="c7563ff1-7926-11ed-9dc1-9d6790bd7812"

# Run it
node salesmate_client.js

# Output files
ls -la salesmate_accounts_*.json
```

Output:
```
✅ Saved 142 accounts to: salesmate_accounts_2026-09-20.json
✅ Saved CSV reference to: salesmate_accounts_2026-09-20.csv
```

Then upload the JSON to Claude.

---

## Daily Workflow

1. **Morning (auto):** GitHub Actions syncs data at 6 AM UTC
2. **Query:** Ask Claude about accounts by owner
3. **Export:** Download CSV for Excel/Sheets if needed
4. **Analyze:** Match against frequency data for reports

---

## API Endpoints Used

The client automatically uses these endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/user` | Verify authentication |
| `GET /api/v2/accounts?offset=0&limit=100` | Fetch paginated accounts |
| `GET /api/v2/users` | Get owner/user list (optional) |

See `SALESMATE_API_DOCS.md` for full API reference.

---

## Fields Available in Each Account

After sync, each account includes:
- `id` — Account ID
- `name` — Company/account name
- `owner` — Owner/rep assigned
- `email` — Primary contact email
- `phone` — Contact phone
- `address` — Full mailing address
- `website` — Company website
- `industry` — Industry classification
- `employeeCount` — Number of employees
- Custom fields (varies by Salesmate config)

---

## Integration with Frequency Data

**Combine with existing frequency data:**

1. Salesmate provides: Account name, Owner, Contact info
2. Project files provide: Call frequency, Territory, Rep assignments
3. **Join on:** Account name or Owner name
4. **Output:** Owner-scoped frequency reports

Example query:
```
"Show me:
- All Benjamin Supply accounts
- Their current owner from Salesmate
- Their call frequency from our project data"
```

---

## Next Steps

1. ✅ Verify GitHub Actions workflow runs (manual trigger)
2. ✅ Download generated JSON file
3. ✅ Upload to Claude in your Sales Reports project
4. ✅ Query by owner: "How many accounts for [Owner]?"

---

## Support & Debugging

**Quick checklist:**
- [ ] GitHub repo connected
- [ ] Secrets configured (Settings → Secrets)
- [ ] `.github/workflows/sync.yml` in place
- [ ] `salesmate_client.js` in repo root
- [ ] Workflow has run at least once
- [ ] Output files exist (check Actions artifacts)

**If stuck:**
1. Check GitHub Actions logs (full error output)
2. Run `SALESMATE_ACCESS_KEY=... SALESMATE_SECRET_KEY=... node salesmate_client.js` locally
3. Verify credentials in Salesmate Admin
4. Test with cURL: see `SALESMATE_API_DOCS.md`

