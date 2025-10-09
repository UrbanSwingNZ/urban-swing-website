/**
 * Urban Swing - Spotify Token Exchange Functions
 * Securely exchanges Spotify authorization codes for access tokens
 */

const {onCall} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({
  maxInstances: 10,
  region: "australia-southeast1", // Closest to NZ
});

// Note: Set your Spotify credentials using:
// firebase functions:config:set spotify.client_id="YOUR_CLIENT_ID"
// firebase functions:config:set spotify.client_secret="YOUR_CLIENT_SECRET"

/**
 * Exchange Spotify authorization code for access and refresh tokens
 */
exports.exchangeSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to exchangeSpotifyToken");
    throw new Error("User must be authenticated");
  }

  const {code, redirectUri} = request.data;

  if (!code) {
    logger.error("Missing authorization code");
    throw new Error("Authorization code required");
  }

  logger.info("Exchanging Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error("Spotify token exchange failed:", error);
      throw new Error("Failed to exchange token with Spotify");
    }

    const tokens = await tokenResponse.json();

    logger.info("Successfully exchanged Spotify token");

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    };
  } catch (error) {
    logger.error("Token exchange error:", error);
    throw new Error("Failed to exchange token: " + error.message);
  }
});

/**
 * Refresh Spotify access token using refresh token
 */
exports.refreshSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to refreshSpotifyToken");
    throw new Error("User must be authenticated");
  }

  const {refreshToken} = request.data;

  if (!refreshToken) {
    logger.error("Missing refresh token");
    throw new Error("Refresh token required");
  }

  logger.info("Refreshing Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
    }

    // Refresh the access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error("Spotify token refresh failed:", error);
      throw new Error("Failed to refresh token with Spotify");
    }

    const tokens = await tokenResponse.json();

    logger.info("Successfully refreshed Spotify token");

    return {
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    };
  } catch (error) {
    logger.error("Token refresh error:", error);
    throw new Error("Failed to refresh token: " + error.message);
  }
});
