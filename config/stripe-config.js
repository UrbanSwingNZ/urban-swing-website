// Stripe Configuration
// Get your publishable key from: https://dashboard.stripe.com/test/apikeys
// IMPORTANT: Use TEST key (pk_test_...) until ready for production

const stripeConfig = {
  // Publishable key - safe to expose in frontend code
  publishableKey: 'pk_test_51SPfiuRuiBO9iHXpZD7jXFIGOQDrnaMF9M8lyd7q78F3Ah3ixEHfKpii3iU3bBQ0FVGx9KD88jnliuLKwGFzcW7b00vynuctMH'
};

// Note: The secret key (sk_test_...) should NEVER be in frontend code
// It belongs in functions/.env and is only used server-side
