const { mockSupabase, mockStripe } = require('../setup');
const {
    handleWebhooks,
    upgradeSubscription,
    cancelSubscription,
    changePlan,
    fetchSubscription,
    syncSubscription
} = require('../../src/stripe');

describe('stripe/index.js exports', () => {
    const config = {
        stripeSecretKey: 'test_key',
        stripeWebhookSecret: 'test_webhook_secret',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        debug: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleWebhooks', () => {
        it('exports handleWebhooks function', async () => {
            const rawBody = JSON.stringify({ type: 'test' });
            const headers = { 'stripe-signature': 'test_sig' };
            
            // Mock customer data
            mockStripe.customers.retrieve.mockResolvedValueOnce({
                id: 'cus_123',
                email: 'test@example.com'
            });

            mockStripe.webhooks.constructEvent.mockReturnValueOnce({
                type: 'customer.subscription.updated',
                data: { 
                    object: {
                        customer: 'cus_123',
                        status: 'active',
                        items: {
                            data: [{
                                price: { id: 'price_basic' }
                            }]
                        }
                    }
                }
            });

            await expect(handleWebhooks(config, rawBody, headers))
                .resolves.not.toThrow();
        });
    });

    describe('upgradeSubscription', () => {
        it('exports upgradeSubscription function', async () => {
            // Mock existing subscription
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: {
                        data: [{
                            price: { id: 'price_basic' }
                        }]
                    }
                }]
            });

            // Mock subscription update
            mockStripe.subscriptions.update.mockResolvedValueOnce({
                id: 'sub_123',
                status: 'active'
            });

            await expect(upgradeSubscription(config, 'test@example.com', 'price_new'))
                .resolves.not.toThrow();
        });
    });

    describe('cancelSubscription', () => {
        it('exports cancelSubscription function', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active'
                }]
            });

            await expect(cancelSubscription(config, 'test@example.com'))
                .resolves.not.toThrow();
        });
    });

    describe('changePlan', () => {
        it('exports changePlan function', async () => {
            // Mock existing subscription
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: {
                        data: [{
                            id: 'si_123',
                            price: { id: 'price_basic' }
                        }]
                    }
                }]
            });

            // Mock subscription update
            mockStripe.subscriptions.update.mockResolvedValueOnce({
                id: 'sub_123',
                status: 'active'
            });

            await expect(changePlan(config, 'test@example.com', 'price_new'))
                .resolves.not.toThrow();
        });
    });

    describe('fetchSubscription', () => {
        it('exports fetchSubscription function', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: {
                        data: [{
                            price: { id: 'price_basic' }
                        }]
                    }
                }]
            });

            const result = await fetchSubscription(config, 'test@example.com');
            expect(result).toBeDefined();
            expect(result.status).toBe('active');
        });
    });

    describe('syncSubscription', () => {
        it('exports syncSubscription function', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: {
                        data: [{
                            price: { id: 'price_basic' }
                        }]
                    }
                }]
            });

            await expect(syncSubscription(config, 'test@example.com'))
                .resolves.not.toThrow();
        });
    });

    describe('error handling', () => {
        it('handles missing config', async () => {
            await expect(handleWebhooks()).rejects.toThrow();
            await expect(upgradeSubscription()).rejects.toThrow();
            await expect(cancelSubscription()).rejects.toThrow();
            await expect(changePlan()).rejects.toThrow();
            await expect(fetchSubscription()).rejects.toThrow();
            await expect(syncSubscription()).rejects.toThrow();
        });

        it('handles invalid config', async () => {
            const invalidConfig = {};

            // Reset default mocks
            mockStripe.subscriptions.list.mockReset();
            mockStripe.customers.retrieve.mockReset();

            // Mock errors for invalid config
            mockStripe.subscriptions.list.mockRejectedValue(new Error('Invalid API key'));
            mockStripe.customers.retrieve.mockRejectedValue(new Error('Invalid API key'));

            await expect(handleWebhooks(invalidConfig, '{}', {}))
                .rejects.toThrow();
            await expect(upgradeSubscription(invalidConfig, 'test@example.com', 'price_new'))
                .rejects.toThrow();
            await expect(cancelSubscription(invalidConfig, 'test@example.com'))
                .rejects.toThrow();
            await expect(changePlan(invalidConfig, 'test@example.com', 'price_new'))
                .rejects.toThrow();
            await expect(fetchSubscription(invalidConfig, 'test@example.com'))
                .rejects.toThrow();
            await expect(syncSubscription(invalidConfig, 'test@example.com'))
                .rejects.toThrow();
        });
    });
}); 