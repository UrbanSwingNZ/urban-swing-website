# Cloudflare Worker Deployment Guide

## Purpose
This Cloudflare Worker handles Spotify token exchange and refresh for the Playlist Manager, keeping refresh tokens secure on the server side.

## Why It's Needed
- Spotify access tokens expire after 1 hour
- The Playlist Manager needs to refresh tokens without requiring the user to re-authenticate
- Refresh tokens must be stored securely server-side (not in browser localStorage)

## Prerequisites
1. Cloudflare account (free tier works)
2. Wrangler CLI installed: `npm install -g wrangler`
3. Your Spotify app credentials (Client ID and Client Secret)
4. Firebase project ID and API key

## Setup Steps

### 1. Install Wrangler (if not already installed)
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```
This will open a browser window to authenticate.

### 3. Configure Environment Variables
You need to set these secrets in Cloudflare (recommended for production):

```bash
cd cloudflare-worker

# Set Spotify credentials
wrangler secret put SPOTIFY_CLIENT_ID
# Paste your Spotify Client ID when prompted

wrangler secret put SPOTIFY_CLIENT_SECRET
# Paste your Spotify Client Secret when prompted

# Set Firebase credentials
wrangler secret put FIREBASE_PROJECT_ID
# Enter: directed-curve-447204-j4

wrangler secret put FIREBASE_API_KEY
# Paste your Firebase API key when prompted
```

**To get your Firebase API key:**
1. Go to Firebase Console
2. Project Settings > General
3. Look for "Web API Key" under "Your apps"

### 4. Deploy the Worker
```bash
wrangler deploy
```

This will deploy the worker to: `https://urban-swing-spotify.urban-swing.workers.dev`

### 5. Verify Deployment
After deployment, you should see output like:
```
✨ Deployment complete!
https://urban-swing-spotify.urban-swing.workers.dev
```

Test the worker is running:
```bash
curl https://urban-swing-spotify.urban-swing.workers.dev
```
You should get: "Urban Swing Spotify Token Service"

## Endpoints

### POST /exchange-token
Exchanges Spotify authorization code for access token
- Stores refresh token in Firestore
- Returns access token to client

### POST /refresh-token
Refreshes expired access token
- Retrieves refresh token from Firestore
- Gets new access token from Spotify
- Returns new access token to client

## Troubleshooting

### 404 Error on /refresh-token
- Worker not deployed or deployment failed
- Run `wrangler deploy` to deploy/redeploy

### "No refresh token found" Error
- User hasn't authenticated yet with the new system
- User needs to disconnect and reconnect to Spotify
- Check that Firestore collection `admin_tokens` exists

### Authentication Errors
- Check that environment variables are set correctly
- Verify Spotify Client ID and Secret are correct
- Ensure Firebase API key is valid

## Testing the Refresh Flow

1. Connect to Spotify in the Playlist Manager
2. Wait 55+ minutes for the token expiry warning
3. Click "Refresh Token" button
4. Should see "Token refreshed successfully!" message
5. Can continue using the app without re-authenticating

## Updating the Worker

When you make changes to `worker.js`:
```bash
cd cloudflare-worker
wrangler deploy
```

## Costs
- Free tier includes 100,000 requests per day
- More than sufficient for this use case
