# Cloudflare Workers Setup Guide

## Step 1: Install Wrangler (Cloudflare CLI)

```powershell
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```powershell
wrangler login
```

This will open a browser for authentication.

## Step 3: Create the Worker

Navigate to the cloudflare-worker directory:

```powershell
cd cloudflare-worker
```

## Step 4: Set Environment Variables

Set your secrets (these are encrypted and not visible in code):

```powershell
# Set Spotify credentials
wrangler secret put SPOTIFY_CLIENT_ID
# Paste: 6c90506e3e9340ddbe364a4bc6476086

wrangler secret put SPOTIFY_CLIENT_SECRET
# Paste: 192c61135a69407496b08f73844974c5

# Set Firebase credentials
wrangler secret put FIREBASE_PROJECT_ID
# Paste: directed-curve-447204-j4

wrangler secret put FIREBASE_API_KEY
# Paste: AIzaSyBxcbYQWNbrEqCYY_g8GMxwoZ7prSh7B0Y
```

## Step 5: Deploy the Worker

```powershell
wrangler deploy
```

This will give you a URL like: `https://urban-swing-spotify.YOUR-SUBDOMAIN.workers.dev`

## Step 6: Update Your Frontend

Update the worker URL in your frontend code (I'll provide the changes separately).

## Step 7: Test

Test the endpoints:

### Exchange Token:
```powershell
curl -X POST https://your-worker.workers.dev/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE","redirectUri":"YOUR_REDIRECT","userId":"USER_ID"}'
```

### Refresh Token:
```powershell
curl -X POST https://your-worker.workers.dev/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID"}'
```

## Notes

- The worker is completely free for up to 100,000 requests/day
- No CORS issues
- No organization policy restrictions
- Faster than Firebase Functions
- Deploy updates instantly with `wrangler deploy`

## Troubleshooting

### "wrangler: command not found"
Run: `npm install -g wrangler`

### Authentication errors
Run: `wrangler login` again

### Worker not updating
Run: `wrangler deploy` again and wait ~30 seconds
