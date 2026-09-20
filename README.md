# Salesmate Sync

Fetch all Salesmate accounts via HTTP endpoint (Vercel serverless).

## Deployment

Deploy to Vercel:

```bash
vercel link
vercel deploy
```

Then set environment variables on Vercel dashboard:
- `SALESMATE_ACCESS_KEY`
- `SALESMATE_SECRET_KEY`

## Usage

From your phone, tap or curl:

```
https://salesmate-sync-<your-vercel-domain>.vercel.app/api/salesmate-fetch
```

Returns JSON with all accounts.
