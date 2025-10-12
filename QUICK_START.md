# Quick Start - Cloudflare Worker Setup

## 1️⃣ Install & Login
```powershell
npm install -g wrangler
wrangler login
```

## 2️⃣ Go to Worker Directory
```powershell
cd c:\projects\urban-swing-website\cloudflare-worker
```

## 3️⃣ Set Secrets (run each one)
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

## 4️⃣ Deploy
```powershell
wrangler deploy
```

## 5️⃣ Copy the URL
You'll see something like:
`https://urban-swing-spotify.YOUR-NAME.workers.dev`

**COPY THIS URL AND TELL ME!** I'll update your frontend with it.

---

That's it! No circles, no org policies, just works. 🎉
