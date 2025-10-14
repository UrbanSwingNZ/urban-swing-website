# Fixing Spotify Redirect URI for Production

## The Problem
When you deployed to production (urbanswing.co.nz), Spotify was still trying to redirect to `127.0.0.1:5500` (your local development URL).

## The Solution

### 1. ✅ Code Fixed
I've updated `spotify-config.js` to automatically detect whether you're running locally or on production:

- **Local:** `http://127.0.0.1:5500/playlist-manager/index.html`
- **Production:** `https://urbanswing.co.nz/playlist-manager/index.html`

### 2. ⚠️ Update Spotify Developer Dashboard (CRITICAL!)

You **must** add the production URL to your Spotify app settings:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your app (Client ID: `6c90506e3e9340ddbe364a4bc6476086`)
3. Click **"Edit Settings"**
4. Find **"Redirect URIs"** section
5. Add this new URI:
   ```
   https://urbanswing.co.nz/playlist-manager/index.html
   ```
6. Click **"Add"**
7. Click **"Save"** at the bottom

### Current Redirect URIs (should have both):
- ✅ `http://127.0.0.1:5500/playlist-manager/index.html` (for local development)
- ✅ `https://urbanswing.co.nz/playlist-manager/index.html` (for production)

## Testing

### After adding the production URI:

1. **Clear your browser cache** (important!)
2. Go to `https://urbanswing.co.nz/admin.html`
3. Click "Open Playlist Manager"
4. Click "Connect Spotify"
5. Authorize the app
6. **Should now redirect to** `https://urbanswing.co.nz/playlist-manager/index.html` ✅

## Troubleshooting

### "Invalid redirect URI" error
**Cause:** Production URI not added to Spotify Dashboard  
**Fix:** Follow steps above to add the production URI

### Still redirecting to localhost
**Cause:** Browser cache  
**Fix:** 
- Clear cache completely
- Try in incognito/private mode
- Hard refresh (Ctrl+Shift+R)

### Works locally but not in production
**Cause:** HTTPS vs HTTP mismatch  
**Check:** Make sure production URL uses `https://` (with the 's')

## Notes

- The code now automatically detects your environment
- No need to change config when switching between local and production
- Both URIs must be registered in Spotify Developer Dashboard
- Changes to Spotify Dashboard are instant (no waiting)

## Summary

1. ✅ Code updated (automatic environment detection)
2. ⏳ Add production URI to Spotify Dashboard
3. 🧪 Clear cache and test

Once you add the production URI to Spotify, everything should work perfectly!
