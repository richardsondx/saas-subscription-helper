// Updates the user record in Supabase with subscription details.

const { createClient } = require('@supabase/supabase-js');

// Cache the Supabase client
let supabaseClient = null;

async function updateUser(config, email, subscriptionDetails) {
    if (config.debug) {
        console.log('[DEBUG] UpdateUser called with:', {
            email,
            subscriptionDetails,
            table: config.table,
            emailField: config.emailField
        });
    }

    try {
        // Initialize client for each request
        const supabaseClient = createClient(
            config.supabaseUrl, 
            config.supabaseKey,
            {
                auth: { 
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: {
                        'X-Client-Info': '@supabase/auth-helpers-nextjs'
                    }
                }
            }
        );

        // First check if the user exists
        const { data: existingUser, error: fetchError } = await supabaseClient
            .from(config.table)
            .select('*')
            .eq(config.emailField, email)
            .single();

        // Handle the case where user doesn't exist
        if (fetchError?.code === 'PGRST116') {
            if (config.debug) {
                console.log('[DEBUG] User not found in database:', { 
                    email,
                    table: config.table
                });
            }

            // If createUserIfNotExists is enabled, create the user
            if (config.createUserIfNotExists) {
                if (config.debug) console.log('[DEBUG] Attempting to create user...');
                
                const { data: newUser, error: createError } = await supabaseClient
                    .from(config.table)
                    .insert({
                        [config.emailField]: email,
                        ...subscriptionDetails
                    })
                    .select()
                    .single();

                if (createError) {
                    if (config.debug) {
                        console.error('[DEBUG] Error creating user:', {
                            error: createError,
                            email
                        });
                    }
                    throw new Error(`Failed to create user: ${createError.message}`);
                }

                if (config.debug) console.log('[DEBUG] User created successfully');
                return newUser;
            } else {
                // If auto-creation is disabled, throw a more specific error
                throw new Error(`User with email ${email} not found in ${config.table}`);
            }
        } else if (fetchError) {
            // Handle other fetch errors
            if (config.debug) {
                console.error('[DEBUG] Error checking existing user:', {
                    error: fetchError,
                    email
                });
            }
            throw new Error(`User check failed: ${fetchError.message}`);
        }

        // Proceed with update if user exists
        const { data, error } = await supabaseClient
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
