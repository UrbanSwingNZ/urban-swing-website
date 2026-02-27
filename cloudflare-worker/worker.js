/**
 * Cloudflare Worker - Spotify Token Management
 * Handles token exchange and refresh for Urban Swing
 */

// CORS headers for your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will restrict this to your domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Firestore REST API helper
async function firestoreRequest(method, path, data, env) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${path}?key=${env.FIREBASE_API_KEY}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return response.json();
}

// Exchange Spotify authorization code for tokens
async function exchangeToken(request, env) {
  try {
    const { code, redirectUri } = await request.json();
    
    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Exchange code for tokens with Spotify
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }
    
    const tokens = await tokenResponse.json();
    
    // Get Spotify user info to use as storage key
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to get Spotify user info');
    }
    
    const spotifyUser = await userResponse.json();
    const userId = spotifyUser.id;
    
    // Store refresh token in Firestore using Spotify user ID
    const firestoreDoc = {
      fields: {
        refreshToken: { stringValue: tokens.refresh_token },
        spotifyUserId: { stringValue: userId },
        // Note: spotifyUser.email removed from Spotify API (March 2026)
        // Display name is still available as a fallback identifier
        spotifyDisplayName: { stringValue: spotifyUser.display_name || '' },
        lastUpdated: { timestampValue: new Date().toISOString() },
      },
    };
    
    await firestoreRequest(
      'PATCH',
      `/admin_tokens/${userId}`,
      firestoreDoc,
      env
    );
    
    return new Response(JSON.stringify({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      userId: userId, // Return user ID for frontend to store
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Refresh Spotify access token
async function refreshToken(request, env) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get refresh token from Firestore
    const docData = await firestoreRequest(
      'GET',
      `/admin_tokens/${userId}`,
      null,
      env
    );
    
    if (!docData.fields || !docData.fields.refreshToken) {
      return new Response(JSON.stringify({ error: 'No refresh token found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const refreshToken = docData.fields.refreshToken.stringValue;
    
    // Refresh the access token with Spotify
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(error.error_description || 'Token refresh failed');
    }
    
    const tokens = await tokenResponse.json();
    
    // If Spotify returns a new refresh token, update it
    if (tokens.refresh_token) {
      const firestoreDoc = {
        fields: {
          refreshToken: { stringValue: tokens.refresh_token },
          lastUpdated: { timestampValue: new Date().toISOString() },
        },
      };
      
      await firestoreRequest(
        'PATCH',
        `/admin_tokens/${userId}`,
        firestoreDoc,
        env
      );
    }
    
    return new Response(JSON.stringify({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Main worker handler
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }
    
    const url = new URL(request.url);
    
    // Route requests
    if (url.pathname === '/exchange-token' && request.method === 'POST') {
      return exchangeToken(request, env);
    }
    
    if (url.pathname === '/refresh-token' && request.method === 'POST') {
      return refreshToken(request, env);
    }
    
    // Default response
    return new Response('Urban Swing Spotify Token Service', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  },
};
