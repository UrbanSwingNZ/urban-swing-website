/**
 * Urban Swing Cloud Functions - Main Entry Point
 * 
 * This file orchestrates all Firebase Cloud Functions by importing
 * and re-exporting them from their respective modules.
 * 
 * Module Structure:
 * - spotify-auth.js: Spotify token exchange and refresh
 * - email-notifications.js: Automated email sending
 * - user-management.js: User account operations
 * - Stripe payment functions: Student payments and concessions
 */

const admin = require("firebase-admin");
const {setGlobalOptions} = require("firebase-functions/v2");

// Load environment variables
require('dotenv').config();

// Initialize Firebase Admin (only once)
admin.initializeApp();

// Set global options for all v2 functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// ========================================
// SPOTIFY AUTHENTICATION
// ========================================
const { 
  exchangeSpotifyToken, 
  refreshSpotifyToken 
} = require('./spotify-auth');

exports.exchangeSpotifyToken = exchangeSpotifyToken;
exports.refreshSpotifyToken = refreshSpotifyToken;

// ========================================
// EMAIL NOTIFICATIONS
// ========================================
const { 
  sendNewStudentEmail, 
  sendAccountSetupEmail,
  sendMerchOrderEmail,
  sendPortalInvitationEmail,
  sendLowBalanceEmail,
  sendExpiryWarningEmails
} = require('./email-notifications');

exports.sendNewStudentEmail = sendNewStudentEmail;
exports.sendAccountSetupEmail = sendAccountSetupEmail;
exports.sendMerchOrderEmail = sendMerchOrderEmail;
exports.sendPortalInvitationEmail = sendPortalInvitationEmail;
exports.sendLowBalanceEmail = sendLowBalanceEmail;
exports.sendExpiryWarningEmails = sendExpiryWarningEmails;

// ========================================
// USER MANAGEMENT
// ========================================
const { 
  disableUserAccount, 
  enableUserAccount,
  exportAuthUsers
} = require('./user-management');

exports.disableUserAccount = disableUserAccount;
exports.enableUserAccount = enableUserAccount;
exports.exportAuthUsers = exportAuthUsers;

// ========================================
// STRIPE PAYMENT FUNCTIONS
// ========================================
const { createStudentWithPayment } = require('./create-student-payment');
const { getAvailablePackages } = require('./get-available-packages');
const { processCasualPayment } = require('./process-casual-payment');
const { processConcessionPurchase } = require('./process-concession-purchase');

exports.createStudentWithPayment = createStudentWithPayment;
exports.getAvailablePackages = getAvailablePackages;
exports.processCasualPayment = processCasualPayment;
exports.processConcessionPurchase = processConcessionPurchase;

// ========================================
// TRANSACTION MANAGEMENT
// ========================================
const { updateClassDate } = require('./update-class-date');
const { processRefund } = require('./process-refund');

exports.updateClassDate = updateClassDate;
exports.processRefund = processRefund;

// ========================================
// DATABASE MANAGEMENT
// ========================================
const { listCollections } = require('./list-collections');
const { manageAuthUsers } = require('./manage-auth-users');

exports.listCollections = listCollections;
exports.manageAuthUsers = manageAuthUsers;
