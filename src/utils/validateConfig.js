/**
 * Validates the configuration object provided to the SubscriptionHelper class.
 * @param {Object} config - The configuration object.
 * @returns {Object} - The validated configuration object.
 * @throws {Error} - Throws an error if required fields are missing or invalid.
 */
function validateConfig(config) {
    const requiredFields = [
        'stripeSecretKey',    // Stripe secret key
        'stripeWebhookSecret', // Stripe webhook signing secret
        'supabaseUrl',        // Supabase project URL
        'supabaseKey',        // Supabase service role key
    ];

    const optionalFields = [
        'table',              // Custom table name (defaults to 'users')
        'emailField',         // Custom email field name (defaults to 'email')
        'subscriptionField',  // Custom subscription status field name (defaults to 'subscription_status')
        'planField',          // Custom plan field name (defaults to 'plan')
        'debug'              // Enable debug logging
    ];

    // Check required fields
    for (const field of requiredFields) {
        if (!config[field]) {
            throw new Error(`Missing required configuration field: ${field}`);
        }
    }

    // Set defaults for optional fields
    config.table = config.table || 'users';
    config.emailField = config.emailField || 'email';
    config.subscriptionField = config.subscriptionField || 'subscription_status';
    config.planField = config.planField || 'plan';
    config.debug = !!config.debug;

    return config;
}

module.exports = validateConfig;
