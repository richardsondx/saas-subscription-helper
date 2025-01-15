const { mockSupabase, mockStripe } = require('../setup');
const { handleWebhooks } = require('../../src/stripe');

describe('handleWebhooks', () => {
    const config = {
        stripeSecretKey: 'test_key',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test_key',
        table: 'users',
        emailField: 'email',
        subscriptionField: 'subscription_status',
        planField: 'plan',
        debug: true,
        stripeWebhookSecret: 'whsec_test'
    };

    let updateMock;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup Stripe webhook mocks
        mockStripe.webhooks.constructEvent.mockImplementation((rawBody, signature, secret) => {
            if (!signature) {
                throw new Error('No Stripe signature found in request');
            }
            if (signature === 'invalid_signature') {
                throw new Error('Invalid signature');
            }
            // Return default event
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

        // Mock customer retrieval
        mockStripe.customers.retrieve.mockResolvedValue({
            id: 'cus_123',
            email: 'test@example.com'
        });

        // Setup Supabase mocks
        updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    data: [{
                        id: 1,
                        email: 'test@example.com',
                        subscription_status: 'active',
                        plan: 'price_premium'
                    }],
                    error: null
                })
            })
        });

        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: {
                            id: 1,
                            email: 'test@example.com'
                        },
                        error: null
                    })
                })
            }),
            update: updateMock
        }));
    });

    it('handles subscription.updated event', async () => {
        const event = {
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

        const rawBody = JSON.stringify(event);
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockImplementationOnce(() => event);

        const result = await handleWebhooks(config, rawBody, headers);

        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
            rawBody,
            headers['stripe-signature'],
            config.stripeWebhookSecret
        );
    });

    it('handles subscription.deleted event', async () => {
        const event = {
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_123',
                    customer: 'cus_123',
                    status: 'canceled',
                    items: {
                        data: [{
                            price: { id: 'price_basic' }
                        }]
                    }
                }
            }
        };

        const rawBody = JSON.stringify(event);
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockImplementationOnce(() => event);
        mockStripe.customers.retrieve.mockResolvedValueOnce({
            email: 'test@example.com'
        });

        await handleWebhooks(config, rawBody, headers);

        expect(updateMock).toHaveBeenCalledWith({
            [config.subscriptionField]: 'inactive',
            [config.planField]: null
        });
    });

    it('handles invalid webhook signature', async () => {
        mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
            throw new Error('Invalid signature');
        });

        const headers = {
            'stripe-signature': 'invalid_signature'
        };

        await expect(
            handleWebhooks(config, 'invalid_body', headers)
        ).rejects.toThrow('Invalid signature');
    });

    it('ignores unsupported event types', async () => {
        const event = {
            type: 'payment_intent.succeeded',
            data: { 
                object: {
                    id: 'pi_123',
                    customer: 'cus_123'
                }
            }
        };

        const rawBody = JSON.stringify(event);
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockReturnValueOnce(event);
        mockStripe.customers.retrieve.mockResolvedValueOnce({
            email: 'test@example.com'
        });

        await handleWebhooks(config, rawBody, headers);

        expect(updateMock).not.toHaveBeenCalled();
    });

    it('handles database errors', async () => {
        const event = {
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

        const rawBody = JSON.stringify(event);
        const headers = {
            'stripe-signature': 'test_signature'
        };

        mockStripe.webhooks.constructEvent.mockReturnValueOnce(event);
        mockStripe.customers.retrieve.mockResolvedValueOnce({
            email: 'test@example.com'
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
            handleWebhooks(config, rawBody, headers)
        ).rejects.toThrow('Database error');
    });
}); 