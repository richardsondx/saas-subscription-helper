const { mockSupabase, mockStripe, mockSupabaseResponse } = require('../setup');
const { upgradeSubscription } = require('../../src/stripe');

describe('upgradeSubscription', () => {
    const config = {
        stripeSecretKey: 'test_key',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        debug: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('successfully upgrades subscription', async () => {
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'price_basic'
        });

        mockStripe.customers.search.mockResolvedValueOnce({
            data: [{ id: 'cus_123' }]
        });

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
                    price: { id: 'price_premium' }
                }]
            }
        });

        const result = await upgradeSubscription(config, 'test@example.com', 'price_premium');

        expect(result.subscription).toBeDefined();
        expect(result.subscription.items.data[0].price.id).toBe('price_premium');
        expect(result.subscription.status).toBe('active');
    });

    it('handles no active subscription', async () => {
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com'
        });

        mockStripe.customers.search.mockResolvedValueOnce({
            data: [{ id: 'cus_123' }]
        });

        mockStripe.subscriptions.list.mockResolvedValueOnce({
            data: []
        });

        let thrownError;
        try {
            await upgradeSubscription(config, 'test@example.com', 'price_premium');
            fail('Should have thrown an error');
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError.message).toBe('Active subscription not found');
    });
}); 