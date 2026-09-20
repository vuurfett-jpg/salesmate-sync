# Deploy to Vercel from Your Phone

## Step 1: Go to Vercel
Open on your phone: **vercel.com**

## Step 2: Sign In / Create Account
Use GitHub login if you have it, or email.

## Step 3: Import Project
- Tap "Add New" → "Project"
- Select repository: `vuurfett-jpg/salesmate-sync`
- Vercel auto-detects settings

## Step 4: Add Environment Variables
Before deploying, tap "Environment Variables" and add:

```
SALESMATE_ACCESS_KEY = c7563ff0-7926-11ed-9dc1-9d6790bd7812
SALESMATE_SECRET_KEY = c7563ff1-7926-11ed-9dc1-9d6790bd7812
```

## Step 5: Deploy
Tap "Deploy" button.

Wait ~2 minutes. You'll get a URL like:
```
https://salesmate-sync-XXXXX.vercel.app
```

## Step 6: Access from Phone
Open the URL in your browser. Tap "Load Accounts" → "Download CSV".

Done. No laptop needed.
