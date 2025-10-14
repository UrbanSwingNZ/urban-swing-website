# Spotify Playlist Manager Setup Guide

Complete guide to set up Spotify authentication for your Urban Swing Playlist Manager.

---

## Prerequisites

- Active Spotify account (with your Urban Swing playlists)
- Firebase project already set up (from admin portal setup)
- Admin portal working and accessible

---

## Step 1: Create Spotify Developer App

1. **Go to Spotify Developer Dashboard**: 
   https://developer.spotify.com/dashboard

2. **Log in** with your Spotify account (the one that has Urban Swing playlists)

3. **Click "Create app"**

4. **Fill in app details**:
   - **App name**: `Urban Swing Playlist Manager`
   - **App description**: `Internal playlist management tool for Urban Swing dance classes`
   - **Redirect URIs**: Add these URLs (one per line):
     - `http://localhost:5500/playlist-manager/index.html` (for local testing)
     - `https://urbanswing.co.nz/playlist-manager/index.html` (your production URL)
     - `https://www.urbanswing.co.nz/playlist-manager/index.html` (with www)
   - **Which API/SDKs are you planning to use?**: Select `Web API`
   - **Check the terms of service box**

5. **Click "Save"**

6. **You'll see your app dashboard** - keep this page open!

---

## Step 2: Get Your Credentials

1. In your Spotify app dashboard, click **"Settings"**

2. **Copy your credentials**:
   - **Client ID**: Copy this value
   - **Client Secret**: Click "View client secret" and copy this value

3. **⚠️ IMPORTANT**: Keep these values secret! Never commit them to public GitHub.

---

## Step 3: Update Your Configuration

1. **Open** `playlist-manager/spotify-config.js` in your project

2. **Replace** `'YOUR_SPOTIFY_CLIENT_ID_HERE'` with your actual Client ID

3. **Verify** the `redirectUri` matches one of the URLs you added in Step 1:
   ```javascript
   redirectUri: window.location.origin + '/playlist-manager/index.html'
   ```

4. **Save the file**

---

## Step 4: Set Up Token Exchange Backend

Spotify requires a **server-side token exchange** for security. You have two options:

### Option A: Firebase Cloud Functions (Recommended - Free Tier)

1. **Install Firebase CLI** (if not already installed):
   ```powershell
   npm install -g firebase-tools
   ```

2. **Initialize Cloud Functions**:
   ```powershell
   cd "C:\Users\lance_wgv1o9l\OneDrive\L&N - Urban Swing\Website"
   firebase init functions
   ```
   - Select JavaScript
   - Install dependencies: Yes

3. **Create token exchange function** - Edit `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// Store your Client Secret in Firebase config
// Run: firebase functions:config:set spotify.client_id="YOUR_CLIENT_ID" spotify.client_secret="YOUR_CLIENT_SECRET"

exports.exchangeSpotifyToken = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { code, redirectUri } = data;

  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'Authorization code required');
  }

  try {
    // Exchange code for tokens
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: functions.config().spotify.client_id,
        client_secret: functions.config().spotify.client_secret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };

  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error);
    throw new functions.https.HttpsError('internal', 'Failed to exchange token');
  }
});

exports.refreshSpotifyToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { refreshToken } = data;

  if (!refreshToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Refresh token required');
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: functions.config().spotify.client_id,
        client_secret: functions.config().spotify.client_secret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };

  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh token');
  }
});
```

4. **Install axios** in functions folder:
   ```powershell
   cd functions
   npm install axios
   cd ..
   ```

5. **Set environment variables**:
   ```powershell
   firebase functions:config:set spotify.client_id="YOUR_CLIENT_ID_HERE"
   firebase functions:config:set spotify.client_secret="YOUR_CLIENT_SECRET_HERE"
   ```

6. **Deploy functions**:
   ```powershell
   firebase deploy --only functions
   ```

7. **Update `playlist-manager.js`** - Replace the `handleAuthCallback` function:

```javascript
async function handleAuthCallback(authCode) {
  showLoading(true);
  
  try {
    // Call Firebase Cloud Function to exchange code for tokens
    const exchangeToken = firebase.functions().httpsCallable('exchangeSpotifyToken');
    const result = await exchangeToken({ 
      code: authCode, 
      redirectUri: spotifyConfig.redirectUri 
    });
    
    const { access_token, refresh_token, expires_in } = result.data;
    
    spotifyAPI.setTokens(access_token, refresh_token, expires_in);
    await showAuthenticatedState();
    
  } catch (error) {
    console.error('Auth callback error:', error);
    showError('Failed to authenticate with Spotify. Please try again.');
    showConnectPrompt();
  } finally {
    showLoading(false);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
```

8. **Update `spotify-api.js`** - Replace the `refreshAccessToken` function:

```javascript
async function refreshAccessToken() {
  if (!this.refreshToken) return false;
  
  try {
    const refreshToken = firebase.functions().httpsCallable('refreshSpotifyToken');
    const result = await refreshToken({ refreshToken: this.refreshToken });
    
    const { access_token, expires_in } = result.data;
    this.setTokens(access_token, this.refreshToken, expires_in);
    
    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}
```

### Option B: Alternative - Manual Token Entry (Quick Test)

If you want to test quickly without setting up Cloud Functions:

1. **Get tokens manually** using Spotify's web console

2. **Store tokens** directly in Firestore:
   - Go to Firebase Console → Firestore
   - Collection: `admin_tokens`
   - Document ID: Your Firebase user UID
   - Fields:
     - `spotifyAccessToken`: (your access token)
     - `spotifyRefreshToken`: (your refresh token)
     - `spotifyTokenExpiry`: (current timestamp + 3600000)

3. **Skip OAuth flow** - tokens will be loaded from Firestore on page load

---

## Step 5: Update Firestore Security Rules

1. **Go to Firebase Console** → Firestore Database → Rules

2. **Add rules for admin_tokens** collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // Admin tokens (Spotify credentials)
    match /admin_tokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. **Publish** the rules

---

## Step 6: Test the Playlist Manager

1. **Start your development server** (if using Live Server, it should auto-reload)

2. **Go to Admin Dashboard**: `http://localhost:5500/admin.html`

3. **Click "Playlist Manager" tile**

4. **Click "Connect with Spotify"**

5. **You'll be redirected to Spotify** - Click "Agree" to authorize

6. **You'll be redirected back** - Playlist manager should now load your playlists!

7. **Test features**:
   - ✅ View playlists in sidebar
   - ✅ Click a playlist to see tracks
   - ✅ See BPM, duration, explicit markers
   - ✅ Drag tracks to reorder (save button appears)
   - ✅ Click 3-dot menu to copy/move tracks

---

## Troubleshooting

### Error: "Invalid redirect URI"
- Make sure your redirect URI in `spotify-config.js` exactly matches one in Spotify Developer Dashboard
- Check for trailing slashes, http vs https, www vs non-www

### Error: "Failed to authenticate with Spotify"
- Check browser console for detailed error messages
- Verify Client ID is correct
- Make sure Cloud Functions are deployed

### Playlists not loading
- Check if Spotify tokens are saved in Firestore
- Try disconnecting and reconnecting
- Check browser console for API errors

### BPM not showing
- This is normal - audio features API takes time to load
- If consistently missing, check Spotify API quota

### Can't reorder tracks
- Make sure playlist is not collaborative or owned by someone else
- Check that you have edit permissions

---

## Cost Estimate

**Spotify API**: Free (generous limits)
**Firebase Cloud Functions**: Free tier includes:
- 125,000 invocations/month
- 40,000 GB-seconds compute time
- 5GB egress

**Estimated usage**: ~100-500 function calls/month (well within free tier)

---

## Security Notes

✅ **Never commit your Spotify Client Secret to Git**
✅ **Use environment variables or Firebase config for secrets**
✅ **Tokens are encrypted in Firestore**
✅ **Only authenticated admin users can access playlist manager**
✅ **Spotify OAuth requires user consent**

---

## Next Steps

Once everything is working:

1. **Deploy to production**:
   ```powershell
   firebase deploy
   ```

2. **Update Spotify app redirect URIs** to include production URL

3. **Test on production** environment

4. **Add more playlists** and enjoy managing your Urban Swing music! 🎵

---

## Quick Reference

**Spotify Developer Dashboard**: https://developer.spotify.com/dashboard  
**Spotify API Docs**: https://developer.spotify.com/documentation/web-api  
**Firebase Functions Docs**: https://firebase.google.com/docs/functions  

---

*Last updated: October 9, 2025*
