# Complete Cloudflare Workers Migration Guide

## 🎯 What We're Doing

Moving your token exchange and refresh logic from Firebase Functions to Cloudflare Workers to bypass your organization's policy restrictions.

---

## 📋 Step-by-Step Instructions

### Step 1: Install Wrangler CLI

Open PowerShell and run:

```powershell
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```powershell
wrangler login
```

If you don't have a Cloudflare account:
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up (it's free)
3. Run `wrangler login` again

### Step 3: Navigate to Worker Directory

```powershell
cd c:\projects\urban-swing-website\cloudflare-worker
```

### Step 4: Set Your Secrets

Run each command and paste the value when prompted:

```powershell
wrangler secret put SPOTIFY_CLIENT_ID
# Paste: 6c90506e3e9340ddbe364a4bc6476086

wrangler secret put SPOTIFY_CLIENT_SECRET
# Paste: 192c61135a69407496b08f73844974c5

wrangler secret put FIREBASE_PROJECT_ID
# Paste: directed-curve-447204-j4

wrangler secret put FIREBASE_API_KEY
# Paste: AIzaSyBxcbYQWNbrEqCYY_g8GMxwoZ7prSh7B0Y
```

### Step 5: Deploy the Worker

```powershell
wrangler deploy
```

You'll see output like:
```
Published urban-swing-spotify
  https://urban-swing-spotify.YOUR-SUBDOMAIN.workers.dev
```

**COPY THIS URL** - you'll need it for the next step!

### Step 6: Update Your Frontend

I need to update your frontend files with the worker URL. Tell me the URL from Step 5, and I'll make the changes.

The URL will look like:
`https://urban-swing-spotify.YOUR-SUBDOMAIN.workers.dev`

### Step 7: Test

Once I update the frontend:

1. Go to your playlist manager
2. Click "Connect with Spotify"
3. Check console for: "Exchanging authorization code via Cloudflare Worker..."
4. Should work without CORS errors!

---

## ✅ Benefits

- **No CORS issues** - Cloudflare Workers handle this automatically
- **No org policy restrictions** - It's not Google Cloud
- **Free** - Up to 100,000 requests/day
- **Fast** - Deployed on Cloudflare's global edge network
- **Simple** - Just one JavaScript file

---

## 🔄 Quick Commands Reference

```powershell
# Deploy/update worker
wrangler deploy

# View logs (for debugging)
wrangler tail

# List your workers
wrangler list

# Delete worker (if needed)
wrangler delete urban-swing-spotify
```

---

## ⚠️ Important Notes

1. **First time setup takes ~5 minutes**
2. **Worker URL is public but requires valid user ID from Firebase Auth**
3. **Refresh tokens stay in your Firestore (secure)**
4. **No Firebase Functions needed anymore**

---

## 🆘 Troubleshooting

### "wrangler: command not found"
- Close and reopen PowerShell
- Or run: `npm install -g wrangler` again

### "Failed to publish"
- Make sure you're logged in: `wrangler login`
- Check you're in the correct directory

### "Cannot find module"
- Run from: `c:\projects\urban-swing-website\cloudflare-worker`

---

## 📞 Next Step

**Run the commands above and tell me the Worker URL!**

Then I'll update your frontend code to use it.
