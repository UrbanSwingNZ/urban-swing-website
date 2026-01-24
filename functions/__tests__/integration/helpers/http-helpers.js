/**
 * HTTP Helpers for Integration Tests
 * 
 * Helper functions for making HTTP requests to Cloud Functions in emulator
 */

const axios = require('axios');

// Cloud Functions emulator URL
const FUNCTIONS_BASE_URL = 'http://localhost:5001/urban-swing-test/us-central1';

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
 */
async function callCallableFunction(functionName, data = {}, auth = null) {
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add auth header if provided
  if (auth) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }
  
  try {
    const response = await axios.post(url, { data }, {
      headers,
      validateStatus: () => true,
    });
    
    return {
      status: response.status,
      data: response.data?.result || response.data,
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
