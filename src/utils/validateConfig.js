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
        'debug',             // Enable debug logging
        'syncedStripeFields', // Stripe fields to sync with database
        'prorationBehavior',   // How to handle proration
        'preserveTrialPeriods' // Whether to preserve trial periods during changes
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
    config.preserveTrialPeriods = config.preserveTrialPeriods !== false; // Default to true
    config.syncedStripeFields = config.syncedStripeFields || {};

    // Validate syncedStripeFields if provided
    const validStripeFields = [
        'stripe_customer_id',
        'default_payment_method',
        'payment_last4',
        'payment_brand',
        'payment_exp_month',
        'payment_exp_year',
        'current_period_start',
        'current_period_end',
        'cancel_at_period_end',
        'canceled_at',
        'trial',
        'trial_start',
        'trial_end',
        'subscription_created_at'
    ];

    // Convert all provided fields to boolean values and validate field names
    if (config.syncedStripeFields) {
        for (const field in config.syncedStripeFields) {
            if (!validStripeFields.includes(field)) {
                throw new Error(`Invalid Stripe field to sync: ${field}`);
            }
            config.syncedStripeFields[field] = !!config.syncedStripeFields[field];
        }
    }

    return config;
}

module.exports = validateConfig;
