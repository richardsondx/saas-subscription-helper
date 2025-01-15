const { mockSupabase, mockStripe } = require('./setup');
const {
    SubscriptionHelper,
    handleWebhooks,
    upgradeSubscription,
    cancelSubscription,
    changePlan,
    syncSubscription,
    fetchSubscription
} = require('../src');

describe('SubscriptionHelper class', () => {
    const config = {
        stripeSecretKey: 'test_key',
        stripeWebhookSecret: 'test_webhook_secret',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        debug: true
    };

    let helper;

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new SubscriptionHelper(config);
    });

    describe('constructor', () => {
        it('creates instance with valid config', () => {
            expect(helper).toBeInstanceOf(SubscriptionHelper);
            expect(helper.config).toEqual(expect.objectContaining(config));
        });

        it('throws error with invalid config', () => {
            expect(() => new SubscriptionHelper({})).toThrow(/required/i);
        });
    });

    describe('instance methods', () => {
        it('handles webhooks', async () => {
            jest.spyOn(console, 'log').mockImplementation(() => {});

            const req = {
                rawBody: 'test-body',
                headers: {
                    'stripe-signature': 'test-signature'
                }
            };

            mockStripe.webhooks.constructEvent.mockReturnValueOnce({
                type: 'customer.subscription.updated',
                data: {
                    object: {
                        id: 'sub_123',
                        customer: 'cus_123',
                        status: 'active',
                        items: {
                            data: [{
                                price: { id: 'price_premium' }
                            }]
                        }
                    }
                }
            });

            mockStripe.customers.retrieve.mockResolvedValueOnce({
                email: 'test@example.com'
            });

            await expect(helper.handleWebhooks(req)).resolves.not.toThrow();

            expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
                'test-body',
                'test-signature',
                config.stripeWebhookSecret
            );
        });

        it('changes user plan', async () => {
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

            mockStripe.subscriptions.update.mockResolvedValueOnce({
                id: 'sub_123',
                status: 'active',
                items: {
                    data: [{
                        price: { id: 'price_new' }
                    }]
                }
            });

            await expect(helper.changeUserPlan('test@example.com', 'price_new'))
                .resolves.not.toThrow();
        });

        it('cancels user subscription', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{ id: 'sub_123', status: 'active' }]
            });

            await expect(helper.cancelUserSubscription('test@example.com'))
                .resolves.not.toThrow();
        });

        it('updates user in Supabase', async () => {
            const details = { status: 'active', plan: 'premium' };
            await expect(helper.updateUserInSupabase('test@example.com', details))
                .resolves.not.toThrow();
        });

        it('fetches user from Supabase', async () => {
            mockSupabase.from().select().eq().single.mockResolvedValueOnce({
                data: { email: 'test@example.com' },
                error: null
            });

            const result = await helper.fetchUserFromSupabase('test@example.com');
            expect(result).toBeDefined();
            expect(result.email).toBe('test@example.com');
        });

        it('fetches subscription', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: { data: [{ price: { id: 'price_basic' } }] }
                }]
            });

            const result = await helper.fetchSubscription('test@example.com');
            expect(result).toBeDefined();
            expect(result.status).toBe('active');
        });

        it('syncs subscription', async () => {
            mockStripe.subscriptions.list.mockResolvedValueOnce({
                data: [{
                    id: 'sub_123',
                    status: 'active',
                    items: { data: [{ price: { id: 'price_basic' } }] }
                }]
            });

            await expect(helper.syncSubscription('test@example.com'))
                .resolves.not.toThrow();
        });
    });

    describe('standalone exports', () => {
        it('exports all required functions', () => {
            expect(handleWebhooks).toBeDefined();
            expect(upgradeSubscription).toBeDefined();
            expect(cancelSubscription).toBeDefined();
            expect(changePlan).toBeDefined();
            expect(syncSubscription).toBeDefined();
            expect(fetchSubscription).toBeDefined();
        });
    });
}); 