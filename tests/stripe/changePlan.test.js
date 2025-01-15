const { mockSupabase, mockStripe, mockSupabaseResponse } = require('../setup');
const { changePlan } = require('../../src/stripe');

describe('changePlan', () => {
    const fail = (message) => {
        throw new Error(message);
    };

    const config = {
        stripeSecretKey: 'test_key',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        debug: true,
        preserveTrialPeriods: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('throws error when user not found', async () => {
        mockSupabaseResponse(null, null);

        let thrownError;
        try {
            await changePlan(config, 'test@example.com', 'price_new');
            fail('Should have thrown an error');
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError.message).toBe('User not found');
    });

    it('successfully changes plan with trial preservation', async () => {
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

        const trialEnd = Math.floor(Date.now() / 1000) + 86400; // 1 day trial
        mockStripe.subscriptions.list.mockResolvedValueOnce({
            data: [{
                id: 'sub_123',
                status: 'active',
                trial_end: trialEnd,
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
            },
            trial_end: trialEnd
        });

        const result = await changePlan(config, 'test@example.com', 'price_new');

        expect(result.action).toBe('PLAN_CHANGED');
        expect(result.subscriptionId).toBe('sub_123');
    });

    it('handles same plan error', async () => {
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
            data: [{
                id: 'sub_123',
                items: {
                    data: [{
                        price: { id: 'price_basic' }
                    }]
                }
            }]
        });

        const result = await changePlan(config, 'test@example.com', 'price_basic');
        
        expect(result.action).toBe('ALREADY_ON_PLAN');
        expect(result.subscriptionId).toBe('sub_123');
    });
}); 