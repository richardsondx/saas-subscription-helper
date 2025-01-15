const { mockSupabase, mockStripe, mockSupabaseResponse } = require('../setup');
const { cancelSubscription } = require('../../src/stripe');

describe('cancelSubscription', () => {
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
        // Mock no user found
        mockSupabaseResponse(null, null);

        let thrownError;
        try {
            await cancelSubscription(config, 'nonexistent@example.com');
            fail('Should have thrown an error');
        } catch (error) {
            thrownError = error;
        }

        // Verify error properties
        expect(thrownError).toBeDefined();
        expect(thrownError.message).toBe('User not found');
        expect(thrownError.code).toBe('USER_NOT_FOUND');

        // Verify Supabase was called correctly
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('successfully cancels subscription for existing user', async () => {
        // Mock existing user
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'price_basic'
        });

        // Mock Stripe responses
        mockStripe.customers.list.mockResolvedValueOnce({
            data: [{ id: 'cus_123' }]
        });

        mockStripe.subscriptions.list.mockResolvedValueOnce({
            data: [{ id: 'sub_123' }]
        });

        mockStripe.subscriptions.update.mockResolvedValueOnce({
            id: 'sub_123',
            status: 'active',
            cancel_at_period_end: true
        });

        const result = await cancelSubscription(config, 'test@example.com');

        expect(result.success).toBe(true);
        expect(result.subscription.cancel_at_period_end).toBe(true);
    });

    it('handles Stripe customer not found', async () => {
        // Mock existing user but no Stripe customer
        mockSupabaseResponse({
            id: 1,
            email: 'test@example.com'
        });

        mockStripe.customers.list.mockResolvedValueOnce({ data: [] });

        await expect(
            cancelSubscription(config, 'test@example.com')
        ).rejects.toThrow('No Stripe customer found for this email');
    });
}); 