# CORS Troubleshooting Guide

## Overview
CORS (Cross-Origin Resource Sharing) errors occur when web browsers block requests from one domain to another for security reasons. This commonly happens when calling Firebase Cloud Functions from the frontend.

## Common Error Messages
- `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- `Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present`
- `net::ERR_FAILED`

## Root Cause
Firebase Cloud Functions v2 (2nd gen) require explicit IAM permissions to be invoked. Even if your function has CORS configured in code, the function won't be reachable unless the Cloud Run service allows unauthenticated invocations.

## Solution: Enable Unauthenticated Invocations

### For Functions Using `onCall` (Callable Functions)

1. **Deploy the function** with proper configuration:
   ```javascript
   exports.yourFunction = onCall(
     { 
       region: 'us-central1',
       cors: true,
       invoker: 'public',
       // ... other options
     },
     async (request) => {
       // Your function code
     }
   );
   ```

2. **If deployment fails to set IAM policy** (common error):
   ```
   Unable to set the invoker for the IAM policy on the following functions
   ```
   
   The function is deployed but not publicly accessible. Fix this manually:

3. **Enable public access via Google Cloud Console**:
   
   a. Go to **Cloud Run** (NOT Cloud Functions):
      - https://console.cloud.google.com/run?project=YOUR-PROJECT-ID
      - OR from Firebase Console > Functions > Click "Go to Cloud Run"
   
   b. Find your function service (lowercase name, e.g., `sendtestemail`)
   
   c. Click on the service name
   
   d. Go to the **SECURITY** tab
   
   e. Under "Authentication", select **"Allow unauthenticated invocations"**
   
   f. Click **SAVE**

4. **Test the function** - CORS errors should now be resolved

### For Functions Using `onRequest` (HTTP Functions)

1. **Include CORS middleware**:
   ```javascript
   const cors = require('cors')({ origin: true });
   
   exports.yourFunction = onRequest(
     { 
       region: 'us-central1',
       invoker: 'public'
     },
     async (request, response) => {
       return cors(request, response, async () => {
         // Your function code here
       });
     }
   );
   ```

2. **Follow steps 2-4 above** if IAM policy fails to set

## Security Considerations

### "Won't this make my function publicly accessible?"
Yes, but you handle authentication **inside** the function code:

**For `onCall` functions:**
```javascript
async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  // Restrict to specific users
  if (request.auth.token.email !== 'admin@example.com') {
    throw new Error('Unauthorized');
  }
  
  // Function logic here
}
```

**For `onRequest` functions:**
```javascript
async (request, response) => {
  return cors(request, response, async () => {
    // Verify auth token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(401).send('Authentication required');
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check permissions
    if (decodedToken.email !== 'admin@example.com') {
      response.status(403).send('Unauthorized');
      return;
    }
    
    // Function logic here
  });
}
```

## Frontend Code

**For `onCall` functions (recommended):**
```javascript
// Use the pre-configured functions variable from firebase-config.js
const yourFunction = functions.httpsCallable('yourFunction');
const result = await yourFunction({ 
  data: 'your data' 
});
```

**For `onRequest` functions:**
```javascript
const token = await auth.currentUser.getIdToken();
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ data: yourData })
});
```

## Verification

After enabling unauthenticated invocations:
1. The function should respond (even if it returns an auth error)
2. CORS errors should disappear from browser console
3. You should see your function's authentication error messages instead of CORS errors

## Additional Resources
- [Firebase Cloud Functions v2 Documentation](https://firebase.google.com/docs/functions)
- [Cloud Run Authentication](https://cloud.google.com/run/docs/authenticating/public)
- [CORS in Express.js](https://expressjs.com/en/resources/middleware/cors.html)
