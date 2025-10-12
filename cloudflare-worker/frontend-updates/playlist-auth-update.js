// Update playlist-auth.js after Cloudflare Worker is deployed
// Replace the exchangeCodeForTokens function with this:

export async function exchangeCodeForTokens(code) {
  try {
    console.log('Exchanging authorization code via Cloudflare Worker...');
    
    // Get current Firebase user ID
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated with Firebase');
    }
    
    // Call Cloudflare Worker
    const response = await fetch('https://YOUR-WORKER-URL.workers.dev/exchange-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirectUri: spotifyConfig.redirectUri,
        userId: userId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token exchange failed');
    }
    
    const tokens = await response.json();
    
    // Store tokens (refresh token is stored server-side in Firestore)
    spotifyAPI.setTokens(tokens.accessToken, null, tokens.expiresIn);
    
    console.log('Successfully exchanged authorization code for tokens');
    
  } catch (error) {
    console.error('Token exchange error:', error);
    throw new Error(error.message || 'Failed to exchange authorization code');
  }
}
