// Stripe Configuration
// Get your publishable key from: https://dashboard.stripe.com/test/apikeys
// IMPORTANT: Use TEST key (pk_test_...) until ready for production

const stripeConfig = {
  // Publishable key - safe to expose in frontend code
  
  // Live key (comment out when testing)
  publishableKey: 'pk_live_51SPfib2MQLVEscGZySZULigFX7ivWq7XyjKjZRtecr3z0ROjbTUEODddTb31g03RFbVAJXAmUZhuG24awLvFOvHz00fyeKyjYi'

  // Test key for development (comment out when going live)
  // publishableKey: 'pk_test_51SPfib2MQLVEscGZezLfQYssQwPb8Byqhvz3nf5LzRkfXl5i21d3TOrhLpIUZjG3C8ssPL9rCteVD1dfnKKvwE9U00TbtXaQHn'
};

// Note: The secret key (sk_test_...) should NEVER be in frontend code
// It belongs in functions/.env and is only used server-side
