// Updates the user record in Supabase with subscription details.

const { createClient } = require('@supabase/supabase-js');

async function updateUser(config, email, subscriptionDetails) {
    if (config.debug) {
        console.log('[DEBUG] UpdateUser called with:', {
            email,
            subscriptionDetails,
            table: config.table,
            emailField: config.emailField
        });
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseKey);

    try {
        // First check if the user exists
        const { data: existingUser, error: fetchError } = await supabase
            .from(config.table)
            .select('*')
            .eq(config.emailField, email)
            .single();

        if (fetchError) {
            if (config.debug) {
                console.error('[DEBUG] Error checking existing user:', {
                    error: fetchError,
                    email
                });
            }
            throw new Error(`User check failed: ${fetchError.message}`);
        }

        if (!existingUser) {
            if (config.debug) {
                console.error('[DEBUG] User not found:', { email });
            }
            throw new Error(`User with email ${email} not found`);
        }

        // Perform the update
        const { data, error } = await supabase
            .from(config.table)
            .update(subscriptionDetails)
            .eq(config.emailField, email)
            .select();

        if (error) {
            if (config.debug) {
                console.error('[DEBUG] Supabase update error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            }
            throw error;
        }

        if (!data || data.length === 0) {
            if (config.debug) {
                console.error('[DEBUG] Update failed - no rows affected:', {
                    email,
                    subscriptionDetails
                });
            }
            throw new Error('Update failed - no rows were affected');
        }

        if (config.debug) {
            console.log('[DEBUG] Update successful:', {
                updatedData: data[0],
                rowsAffected: data.length
            });
        }

        return data[0];
    } catch (error) {
        if (config.debug) {
            console.error('[DEBUG] Error in updateUser:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                stack: error.stack
            });
        }
        throw error;
    }
}

module.exports = updateUser;
