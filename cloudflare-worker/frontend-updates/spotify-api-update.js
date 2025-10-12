// Update spotify-api.js after Cloudflare Worker is deployed
// Replace the refreshAccessToken function with this:

async refreshAccessToken() {
  try {
    console.log('Refreshing access token via Cloudflare Worker...');
    
    // Get current Firebase user ID
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
      console.error('No Firebase user authenticated');
      return false;
    }
    
    // Call Cloudflare Worker
    const response = await fetch('https://YOUR-WORKER-URL.workers.dev/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Refresh failed:', error.error);
      return false;
    }
    
    const tokens = await response.json();
    
    // Update tokens (refresh token stays server-side in Firestore)
    this.setTokens(tokens.accessToken, null, tokens.expiresIn);
    
    console.log('Successfully refreshed access token');
    return true;
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}
