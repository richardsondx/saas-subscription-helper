const fetchSubscription = require('../../src/stripe/fetchSubscription');
const stripe = require('stripe');

describe('fetchSubscription', () => {
    const mockConfig = {
        stripeSecretKey: 'test_key',
        debug: true
    };
    
    const mockEmail = 'test@example.com';
    const mockStripeClient = {
        customers: {
            list: jest.fn()
        },
        subscriptions: {
            list: jest.fn()
        }
    };

    beforeEach(() => {
        stripe.mockImplementation(() => mockStripeClient);
        jest.clearAllMocks();
    });

    test('successfully fetches active subscription', async () => {
        // Mock customer response
        mockStripeClient.customers.list.mockResolvedValue({
            data: [{ id: 'cus_123' }]
        });

        // Mock subscription response
        const mockSubscription = {
            id: 'sub_123',
            status: 'active',
            cancel_at_period_end: false,
            items: {
                data: [{
                    price: {
                        id: 'price_123'
                    }
                }]
            }
        };
        mockStripeClient.subscriptions.list.mockResolvedValue({
            data: [mockSubscription]
        });

        const result = await fetchSubscription(mockConfig, mockEmail);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeClient.customers.list).toHaveBeenCalledWith({
            email: mockEmail,
            limit: 1
        });
        expect(mockStripeClient.subscriptions.list).toHaveBeenCalledWith({
            customer: 'cus_123',
            limit: 1,
            status: 'active'
        });
    });

    test('returns null when no customer found', async () => {
        mockStripeClient.customers.list.mockResolvedValue({ data: [] });

        const result = await fetchSubscription(mockConfig, mockEmail);

        expect(result).toBeNull();
        expect(mockStripeClient.subscriptions.list).not.toHaveBeenCalled();
    });

    test('returns null when no active subscription found', async () => {
        mockStripeClient.customers.list.mockResolvedValue({
            data: [{ id: 'cus_123' }]
        });
        mockStripeClient.subscriptions.list.mockResolvedValue({ data: [] });

        const result = await fetchSubscription(mockConfig, mockEmail);

        expect(result).toBeNull();
    });

    test('throws error when Stripe API fails', async () => {
        const mockError = new Error('Stripe API Error');
        mockStripeClient.customers.list.mockRejectedValue(mockError);

        await expect(fetchSubscription(mockConfig, mockEmail))
            .rejects
            .toThrow('Stripe API Error');
    });
}); 