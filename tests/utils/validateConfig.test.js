const validateConfig = require('../../src/utils/validateConfig');

describe('validateConfig', () => {
    const validConfig = {
        stripeSecretKey: 'sk_test_123',
        stripeWebhookSecret: 'whsec_123',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key'
    };

    test('accepts valid configuration', () => {
        const result = validateConfig(validConfig);
        expect(result).toMatchObject({
            ...validConfig,
            table: 'users',
            emailField: 'email',
            subscriptionField: 'subscription_status',
            planField: 'plan',
            debug: false,
            preserveTrialPeriods: true
        });
    });

    test('throws error on missing required fields', () => {
        const invalidConfig = { ...validConfig };
        delete invalidConfig.stripeSecretKey;

        expect(() => validateConfig(invalidConfig))
            .toThrow('Missing required configuration field: stripeSecretKey');
    });

    test('validates syncedStripeFields', () => {
        const configWithInvalidField = {
            ...validConfig,
            syncedStripeFields: {
                invalid_field: true
            }
        };

        expect(() => validateConfig(configWithInvalidField))
            .toThrow('Invalid Stripe field to sync: invalid_field');
    });
}); 