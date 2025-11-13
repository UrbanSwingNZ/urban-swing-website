# Cloud Functions Structure

This directory contains all Firebase Cloud Functions for the Urban Swing application, organized into modular files for better maintainability.

## File Structure

### Main Entry Point
- **`index.js`** - Orchestrates all Cloud Functions by importing and re-exporting from modules

### Core Modules

#### `spotify-auth.js`
Handles Spotify integration for the playlist manager.
- `exchangeSpotifyToken` - Exchange authorization code for access/refresh tokens
- `refreshSpotifyToken` - Refresh an expired access token

#### `email-notifications.js`
Automated email sending for student events.
- `sendNewStudentEmail` - Triggered when a new student registers
- `sendAccountSetupEmail` - Triggered when existing student sets up portal account
- `sendTestEmail` - Test email sending from admin template manager

#### `user-management.js`
User account administration functions.
- `disableUserAccount` - Disable Firebase Auth user (used for soft delete)
- `enableUserAccount` - Re-enable Firebase Auth user (used for restore)
- `exportAuthUsers` - Export all auth users for admin tools

### Payment Functions
- `create-student-payment.js` - Handle student registration with payment
- `get-available-packages.js` - Fetch active concession packages
- `process-casual-payment.js` - Process casual entry payments
- `process-concession-purchase.js` - Process concession package purchases

### Supporting Files
- `.env` - Environment variables (not in git)
- `package.json` - Dependencies and scripts
- `index.js.old` - Backup of monolithic index.js (can be deleted after testing)

## Deployment

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Functions
```bash
# Deploy only user management functions
firebase deploy --only functions:disableUserAccount,functions:enableUserAccount

# Deploy only email notifications
firebase deploy --only functions:sendNewStudentEmail,functions:sendAccountSetupEmail

# Deploy only Spotify functions
firebase deploy --only functions:exchangeSpotifyToken,functions:refreshSpotifyToken
```

## Development

### Adding New Functions

1. **Create a new module file** (e.g., `new-feature.js`)
2. **Export your functions** from that module
3. **Import and re-export** in `index.js`:
   ```javascript
   const { myNewFunction } = require('./new-feature');
   exports.myNewFunction = myNewFunction;
   ```

### Module Template
```javascript
/**
 * Feature Name Cloud Functions
 * Description of what this module does
 */

const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Get Firestore
const getFirestore = () => {
  return admin.firestore();
};

/**
 * Function description
 */
exports.myFunction = onCall(async (request) => {
  // Your implementation
});
```

## Benefits of This Structure

1. **Maintainability** - Each module focuses on one area of functionality
2. **Readability** - Easy to find and understand related functions
3. **Testability** - Modules can be tested independently
4. **Deployability** - Deploy only what you need
5. **Scalability** - Easy to add new features without cluttering main file

## Migration Notes

The original monolithic `index.js` (700+ lines) has been split into focused modules:
- Spotify functions → `spotify-auth.js`
- Email functions → `email-notifications.js`
- User management → `user-management.js`
- Payment functions remain in their existing separate files

The old file is backed up as `index.js.old` and can be removed once everything is verified to work correctly.
