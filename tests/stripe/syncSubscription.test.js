const { mockSupabase, mockStripe, mockSupabaseResponse } = require('../setup');
const { syncSubscription } = require('../../src/stripe');

describe('syncSubscription', () => {
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

    it('throws error when user not found in Supabase', async () => {
        mockSupabaseResponse(null, null);

        let thrownError;
        try {
            await syncSubscription(config, 'nonexistent@example.com');
            fail('Should have thrown an error');
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError.message).toBe('User not found in Supabase');
    });

    it('successfully syncs active subscription', async () => {
        // Mock existing user
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'old_plan'
        });

        // Mock Stripe subscription data
        mockStripe.customers.list.mockResolvedValueOnce({
            data: [{ id: 'cus_123' }]
        });

        mockStripe.subscriptions.list.mockResolvedValueOnce({
            data: [{
                id: 'sub_123',
                status: 'active',
                items: {
                    data: [{
                        price: { id: 'price_new' }
                    }]
                },
                cancel_at_period_end: false
            }]
        });

        const result = await syncSubscription(config, 'test@example.com');

        expect(result.success).toBe(true);
        expect(result.synced).toBe(true);
        expect(result.current).toEqual({
            status: 'active',
            plan: 'price_new'
        });
    });

    it('handles case when no Stripe subscription exists', async () => {
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'price_basic'
        });

        mockStripe.customers.list.mockResolvedValueOnce({
            data: [{ id: 'cus_123' }]
        });

        mockStripe.subscriptions.list.mockResolvedValueOnce({
            data: []
        });

        const result = await syncSubscription(config, 'test@example.com');

        expect(result.success).toBe(true);
        expect(result.current).toEqual({
            status: 'inactive',
            plan: null
        });
    });
}); 