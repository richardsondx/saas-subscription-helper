// Processes Stripe webhooks for subscription updates.

const stripe = require('stripe');
const updateUser = require('../supabase/updateUser');

async function handleWebhooks(config, rawBody, headers) {
    if (config.debug) console.log('[DEBUG] Starting webhook processing...');
    
    const stripeClient = stripe(config.stripeSecretKey);
    
    // Get stripe signature from headers
    const stripeSignature = headers?.['stripe-signature'];

    if (config.debug) {
        console.log('Implementation received:', { 
            rawBody, 
            headers, 
            signature: stripeSignature 
        });
    }

    if (config.debug && config.debugHeaders && headers) {
        console.log('[DEBUG] Received headers:', headers);
    }

    if (!stripeSignature) {
        if (config.debug) {
            console.log('[DEBUG] Error: Missing Stripe signature');
            if (headers && config.debugHeaders) {
                console.log('Available headers:', Object.keys(headers));
            }
        }
        throw new Error('No Stripe signature found in request');
    }

    if (!rawBody) {
        if (config.debug) console.log('[DEBUG] Error: Missing raw request body');
        throw new Error('No request body found');
    }

    if (config.debug) {
        console.log('[DEBUG] Verifying webhook:');
        console.log('- Signature:', stripeSignature);
        console.log('- Secret starts with:', config.stripeWebhookSecret?.slice(0, 8));
        console.log('- Raw body length:', rawBody.length);
        try {
            // Try to parse and log the body for debugging
            const parsedBody = JSON.parse(rawBody);
            console.log('- Event type:', parsedBody.type);
        } catch (e) {
            console.log('- Could not parse body for debugging');
        }
    }

    try {
        const event = stripeClient.webhooks.constructEvent(
            rawBody,
            stripeSignature,
            config.stripeWebhookSecret
        );

        if (config.debug) console.log(`[DEBUG] Processing event: ${event.type}`);

        // Handle new subscription creation from payment link
        if (event.type === 'customer.subscription.created') {
            const newSubscription = event.data.object;
            const customer = await stripeClient.customers.retrieve(newSubscription.customer);
            
            // Check for other active subscriptions that need cancellation
            const existingSubscriptions = await stripeClient.subscriptions.list({
                customer: newSubscription.customer,
                status: 'active'
            });

            // Cancel any old subscriptions immediately if we find a new one
            for (const sub of existingSubscriptions.data) {
                if (sub.id !== newSubscription.id) {
                    await stripeClient.subscriptions.cancel(sub.id, {
                        prorate: true
                    });
                }
            }
        }

        if (event.type === 'customer.subscription.updated' || 
            event.type === 'customer.subscription.deleted' ||
            event.type === 'customer.subscription.cancelled') {
            try {
                const subscription = event.data.object;
                const email = subscription.customer_email ||
                             (await stripeClient.customers.retrieve(subscription.customer)).email;
                
                // Get the correct status - important for cancellations
                const status = subscription.cancel_at_period_end ? 'canceled' : subscription.status;
                const plan = subscription.items.data[0].price.id;

                if (!email) {
                    if (config.debug) console.log('[DEBUG] Error: No email found in webhook data');
                    throw new Error('No email found in webhook data');
                }

                let updateData;
                if (event.type === 'customer.subscription.deleted') {
                    // For deleted subscriptions, set status to inactive and clear the plan
                    updateData = {
                        [config.subscriptionField]: 'inactive',
                        [config.planField || 'plan']: null
                    };
                } else {
                    // For other subscription events, use the values from Stripe
                    updateData = {
                        [config.subscriptionField]: status,
                        [config.planField || 'plan']: plan
                    };
                }

                // Add trial status if configured
                if (config.syncedStripeFields?.trial) {
                    updateData.trial = !!subscription.trial_end;
                    if (subscription.trial_end) {
                        updateData.trial_end = new Date(subscription.trial_end * 1000);
                    }
                }

                if (config.debug) {
                    console.log(`[DEBUG] Updating user subscription details:`);
                    console.log(`- Email: ${email}`);
                    console.log(`- Status: ${status}`);
                    console.log(`- Plan: ${plan}`);
                    console.log(`- Event type: ${event.type}`);
                    console.log(`- Update data:`, updateData);
                }

                const result = await updateUser(config, email, updateData);
            } catch (e) {
                if (config.debug) console.log('[DEBUG] Error: Failed to update user subscription details');
                throw e;
            }
        }
    } catch (e) {
        if (config.debug) console.log('[DEBUG] Error: Failed to process webhook');
        throw e;
    }
}

module.exports = handleWebhooks;