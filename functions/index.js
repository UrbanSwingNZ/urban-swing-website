/**
 * Urban Swing - Spotify Token Exchange Functions
 * Securely exchanges Spotify authorization codes for access tokens
 */

const {onCall} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const axios = require("axios");

// Load environment variables
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

/**
 * Exchange Spotify authorization code for access and refresh tokens
 */
exports.exchangeSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to exchangeSpotifyToken");
    throw new Error("Authentication required");
  }

  const {code, redirectUri} = request.data;

  if (!code) {
    logger.error("Missing authorization code");
    throw new Error("Authorization code required");
  }

  logger.info("Exchanging Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
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
        .doc(request.auth.uid)
        .set({
          refreshToken: tokens.refresh_token,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

    logger.info("Successfully exchanged and stored Spotify tokens for user:", request.auth.uid);

    // Return access token (short-lived) to client
    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  } catch (error) {
    logger.error("Error exchanging Spotify token:", error);
    throw new Error(`Token exchange failed: ${error.message}`);
  }
});

/**
 * Refresh Spotify access token using refresh token
 */
exports.refreshSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to refreshSpotifyToken");
    throw new Error("Authentication required");
  }

  const {refreshToken} = request.data;

  if (!refreshToken) {
    logger.error("Missing refresh token");
    throw new Error("Refresh token required");
  }

  logger.info("Refreshing Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
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

    logger.info("Successfully refreshed Spotify token");

    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    logger.error("Error refreshing Spotify token:", error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
});
