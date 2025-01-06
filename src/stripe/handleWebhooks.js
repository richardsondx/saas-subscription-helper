// Processes Stripe webhooks for subscription updates.

const stripe = require('stripe');
const updateUser = require('../supabase/updateUser');

async function handleWebhooks(config, req) {
    if (config.debug) console.log('[DEBUG] Starting webhook processing...');
    
    const stripeClient = stripe(config.stripeSecretKey);
    
    const { rawBody, stripeSignature, headers } = req;

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

        if (config.debug) console.log(`[DEBUG] Successfully constructed event: ${event.type}`);

        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
            try {
                const subscription = event.data.object;
                const email = subscription.customer_email ||
                             (await stripeClient.customers.retrieve(subscription.customer)).email;
                const status = subscription.status;
                const plan = subscription.items.data[0].price.id;

                if (!email) {
                    if (config.debug) console.log('[DEBUG] Error: No email found in webhook data');
                    throw new Error('No email found in webhook data');
                }

                const updateData = {
                    [config.subscriptionField]: status,
                    [config.planField || 'plan']: plan
                };

                if (config.debug) {
                    console.log(`[DEBUG] Updating user subscription details:`);
                    console.log(`- Email: ${email}`);
                    console.log(`- Update data:`, updateData);
                }

                const result = await updateUser(config, email, updateData);
                
                if (config.debug) {
                    console.log('[DEBUG] Update operation result:', result);
                }

                if (config.debug) console.log('[DEBUG] Successfully updated user subscription details');
            } catch (error) {
                if (config.debug) {
                    console.error('[DEBUG] Error in subscription update:', {
                        message: error.message,
                        stack: error.stack,
                        details: error.details
                    });
                }
                throw error;
            }
        }

        return { success: true };
    } catch (error) {
        if (config.debug) {
            console.log('[DEBUG] Error processing webhook:');
            console.log(error.message);
        }
        return { success: false, error: error.message };
    }
}

module.exports = handleWebhooks;
