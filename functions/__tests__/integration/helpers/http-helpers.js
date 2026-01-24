/**
 * HTTP Helpers for Integration Tests
 * 
 * Helper functions for making HTTP requests to Cloud Functions in emulator
 */

const axios = require('axios');

// Cloud Functions emulator URL
const FUNCTIONS_BASE_URL = 'http://localhost:5001/directed-curve-447204-j4/us-central1';

/**
 * Make a POST request to a Cloud Function
 */
async function callFunction(functionName, data = {}, options = {}) {
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      validateStatus: () => true, // Don't throw on any status
      ...options,
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message },
      headers: error.response?.headers || {},
      error: error.message,
    };
  }
}

/**
 * Make a GET request to a Cloud Function
 */
async function callFunctionGet(functionName, params = {}, options = {}) {
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        ...options.headers,
      },
      validateStatus: () => true,
      ...options,
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message },
      headers: error.response?.headers || {},
      error: error.message,
    };
  }
}

/**
 * Call a Callable Cloud Function (onCall)
 * @param {string} functionName - Name of the function
 * @param {object} data - Data to send to the function
 * @param {object|null} auth - Auth context { uid: 'user-id' } or null for unauthenticated
 * @param {object} options - Options like { throwOnError: false }
 */
async function callCallableFunction(functionName, data = {}, auth = null, options = {}) {
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  const { throwOnError = false } = options;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // For Firebase Callable functions in the emulator, we simulate auth
  // The emulator doesn't support real auth, so we need to structure the request differently
  // We'll pass auth data in the request body under a special __auth key
  let requestData = { data };
  
  if (auth && auth.uid) {
    // Pass auth context in the request - emulator will use this
    requestData = {
      data,
      context: {
        auth: {
          uid: auth.uid,
          token: {}
        }
      }
    };
  }
  
  try {
    const response = await axios.post(url, requestData, {
      headers,
      validateStatus: () => true,
    });
    
    // If throwOnError is true and the function threw an error, throw it here
    if (throwOnError && response.data?.error) {
      const error = new Error(response.data.error.message || 'Function error');
      error.code = response.data.error.status || response.data.error.code;
      error.details = response.data.error.details;
      throw error;
    }
    
    return {
      status: response.status,
      data: response.data?.result || response.data,
      headers: response.headers,
    };
  } catch (error) {
    // If it's our formatted error and throwOnError is true, rethrow it
    if (throwOnError && error.code) {
      throw error;
    }
    
    // Handle network/axios errors
    if (error.response?.data?.error) {
      if (throwOnError) {
        const funcError = new Error(error.response.data.error.message || 'Function error');
        funcError.code = error.response.data.error.status || error.response.data.error.code;
        funcError.details = error.response.data.error.details;
        throw funcError;
      }
      
      return {
        status: error.response?.status || 500,
        data: error.response?.data || { error: error.message },
        headers: error.response?.headers || {},
        error: error.message,
      };
    }
    
    if (throwOnError) {
      throw error;
    }
    
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message },
      headers: error.response?.headers || {},
      error: error.message,
    };
  }
}

/**
 * Wait for a condition to be true (polling)
 */
async function waitFor(conditionFn, options = {}) {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

module.exports = {
  callFunction,
  callFunctionGet,
  callCallableFunction,
  waitFor,
  FUNCTIONS_BASE_URL,
};
