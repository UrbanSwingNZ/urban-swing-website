/**
 * Spotify Authentication Cloud Functions
 * Handles Spotify token exchange and refresh operations
 * NOTE: Using v1 for compatibility with existing deployed functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

/**
 * Exchange Spotify authorization code for access and refresh tokens
 */
exports.exchangeSpotifyToken = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    console.error("Unauthenticated request to exchangeSpotifyToken");
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const {code, redirectUri} = data;

  if (!code) {
    console.error("Missing authorization code");
    throw new functions.https.HttpsError("invalid-argument", "Authorization code required");
  }

  console.log("Exchanging Spotify token for user:", context.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Spotify credentials not configured");
      throw new functions.https.HttpsError("failed-precondition", "Spotify credentials not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const tokens = tokenResponse.data;

    // Store refresh token in Firestore
    await admin.firestore()
        .collection("admin_tokens")
        .doc(context.auth.uid)
        .set({
          refreshToken: tokens.refresh_token,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

    console.log("Successfully exchanged and stored Spotify tokens for user:", context.auth.uid);

    // Return access token (short-lived) to client
    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  } catch (error) {
    console.error("Error exchanging Spotify token:", error);
    throw new functions.https.HttpsError("internal", `Token exchange failed: ${error.message}`);
  }
});

/**
 * Refresh Spotify access token using refresh token
 */
exports.refreshSpotifyToken = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    console.error("Unauthenticated request to refreshSpotifyToken");
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const {refreshToken} = data;

  if (!refreshToken) {
    console.error("Missing refresh token");
    throw new functions.https.HttpsError("invalid-argument", "Refresh token required");
  }

  console.log("Refreshing Spotify token for user:", context.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Spotify credentials not configured");
      throw new functions.https.HttpsError("failed-precondition", "Spotify credentials not configured");
    }

    // Refresh the access token
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const tokens = tokenResponse.data;

    console.log("Successfully refreshed Spotify token");

    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
    throw new functions.https.HttpsError("internal", `Token refresh failed: ${error.message}`);
  }
});
