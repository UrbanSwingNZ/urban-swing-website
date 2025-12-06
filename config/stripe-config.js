// Stripe Configuration
// Get your publishable key from: https://dashboard.stripe.com/test/apikeys
// IMPORTANT: Use TEST key (pk_test_...) until ready for production

const stripeConfig = {
  // Publishable key - safe to expose in frontend code
  publishableKey: 'pk_live_51SPfib2MQLVEscGZySZULigFX7ivWq7XyjKjZRtecr3z0ROjbTUEODddTb31g03RFbVAJXAmUZhuG24awLvFOvHz00fyeKyjYi'
};

// Note: The secret key (sk_test_...) should NEVER be in frontend code
// It belongs in functions/.env and is only used server-side
