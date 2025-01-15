// Mock Supabase client with proper data structure
const mockSupabase = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({
            eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                    data: {
                        id: 1,
                        email: 'test@example.com',
                        subscription_status: 'active',
                        plan: 'basic'
                    },
                    error: null
                }))
            }))
        })),
        // Fix update chain to support .eq().select()
        update: jest.fn(() => ({
            eq: jest.fn(() => ({
                select: jest.fn(() => Promise.resolve({
                    data: {
                        id: 1,
                        email: 'test@example.com',
                        subscription_status: 'active',
                        plan: 'price_basic'
                    },
                    error: null
                }))
            }))
        }))
    }))
};

// Mock Stripe client with complete subscription data
const mockStripe = {
    customers: {
        list: jest.fn(() => Promise.resolve({
            data: [{
                id: 'cus_123',
                email: 'test@example.com'
            }]
        })),
        search: jest.fn(() => Promise.resolve({
            data: [{
                id: 'cus_123',
                email: 'test@example.com'
            }]
        })),
        retrieve: jest.fn()
    },
    prices: {
        retrieve: jest.fn((priceId) => Promise.resolve({
            id: priceId,
            unit_amount: priceId === 'price_premium' ? 2000 : 1000,
            currency: 'usd',
            recurring: {
                interval: 'month'
            }
        }))
    },
    webhooks: {
        constructEvent: jest.fn(),
        signature: {
            verifyHeader: jest.fn()
        }
    },
    subscriptions: {
        list: jest.fn(() => Promise.resolve({
            data: [{
                id: 'sub_123',
                status: 'active',
                customer: 'cus_123',
                items: {
                    data: [{
                        id: 'si_123',
                        price: { id: 'price_basic' }
                    }]
                },
                current_period_end: 1703980799,
                cancel_at_period_end: false
            }]
        })),
        update: jest.fn(() => Promise.resolve({
            id: 'sub_123',
            status: 'active',
            items: {
                data: [{
                    price: { id: 'price_new' }
                }]
            }
        })),
        cancel: jest.fn()
    }
};

// Mock module imports
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

jest.mock('stripe', () => jest.fn(() => mockStripe));

// Export mocks
module.exports = {
    mockSupabase,
    mockStripe,
    // Helper to simulate different Supabase responses
    mockSupabaseResponse: (data = null, error = null) => {
        // Reset the chain of mocks but preserve structure for all tests
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data, error })
                })
            }),
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({ data, error })
                })
            })
        }));
    }
};

mockStripe.webhooks.constructEvent.mockImplementation((rawBody, signature, secret) => {
    console.log('Mock received:', { rawBody, signature, secret }); // Debug log
    // ... rest of mock
}); 