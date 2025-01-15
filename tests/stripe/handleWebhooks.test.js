const { mockSupabase, mockStripe } = require('../setup');
const { handleWebhooks } = require('../../src/stripe');

describe('handleWebhooks', () => {
    const config = {
        stripeSecretKey: 'test_key',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        debug: true,
        stripeWebhookSecret: 'whsec_test'
    };

    let updateMock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset webhook mocks for each test
        mockStripe.webhooks.constructEvent.mockReset();
        mockStripe.webhooks.constructEvent.mockImplementation((body, signature, secret) => {
            if (signature === 'invalid_signature') {
                throw new Error('Invalid signature');
            }
            return {
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
            };
        });

        // Mock customer email lookup
        mockStripe.customers.retrieve.mockResolvedValue({
            id: 'cus_123',
            email: 'test@example.com'
        });

        // Setup Supabase mocks
        const mockData = {
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'price_premium'
        };

        updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    data: [mockData],
                    error: null
                })
            })
        });

        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockData,
                        error: null
                    })
                })
            }),
            update: updateMock
        }));
    });

    it('handles subscription.updated event', async () => {
        const rawBody = JSON.stringify({
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_123',
                    customer: 'cus_123',
                    status: 'active'
                }
            }
        });

        const headers = {
            'stripe-signature': 'test_signature'
        };

        // Mock successful webhook verification
        mockStripe.webhooks.constructEvent.mockImplementationOnce(() => ({
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
        }));

        const result = await handleWebhooks(config, rawBody, headers);

        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
            rawBody,
            headers['stripe-signature'],
            config.stripeWebhookSecret
        );
        expect(result.success).toBe(true);
    });

    it('handles subscription.deleted event', async () => {
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockImplementationOnce((body, signature) => {
            if (!signature) {
                throw new Error('No Stripe signature found in request');
            }
            return {
                type: 'customer.subscription.deleted',
                data: {
                    object: {
                        id: 'sub_123',
                        customer: 'cus_123',
                        status: 'canceled'
                    }
                }
            };
        });

        const rawBody = JSON.stringify({
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_123',
                    customer: 'cus_123'
                }
            }
        });

        const result = await handleWebhooks(config, rawBody, headers);

        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            subscription_status: 'inactive',
            plan: null
        }));
        expect(result.success).toBe(true);
    });

    it('handles invalid webhook signature', async () => {
        const headers = {
            'stripe-signature': 'invalid_signature'
        };

        mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
            throw new Error('Invalid signature');
        });

        await expect(
            handleWebhooks(
                config,
                'invalid_body',
                headers
            )
        ).rejects.toThrow('Invalid signature');
    });

    it('ignores unsupported event types', async () => {
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockReturnValueOnce({
            type: 'payment_intent.succeeded',
            data: { object: {} }
        });

        const result = await handleWebhooks(config, '{}', headers);

        expect(result.success).toBe(true);
        expect(result.ignored).toBe(true);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it('handles database errors', async () => {
        const headers = {
            'stripe-signature': 'test_signature'
        };

        // Mock successful webhook verification first
        mockStripe.webhooks.constructEvent.mockReturnValueOnce({
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_123',
                    customer: 'cus_123'
                }
            }
        });

        // Mock database error
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Database error' }
                    })
                })
            })
        }));

        await expect(
            handleWebhooks(config, '{}', headers)
        ).rejects.toThrow('Database error');
    });
}); 