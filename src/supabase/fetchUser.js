const { createClient } = require('@supabase/supabase-js');

// Cache the Supabase client
let supabaseClient = null;

async function fetchUser(config, email) {
    if (config.debug) console.log(`[DEBUG] Attempting to fetch user with email: ${email}`);
    
    if (!email) {
        if (config.debug) console.log('[DEBUG] Error: Email is required');
        throw new Error('Email is required to fetch user');
    }

    try {
        // Initialize or reuse client with cross-fetch
        if (!supabaseClient) {
            if (config.debug) console.log('[DEBUG] Creating Supabase client...');
            
            // Use cross-fetch for compatibility
            const customFetch = (...args) => {
                // Use global fetch with error handling
                return fetch(...args).catch(err => {
                    console.error('[DEBUG] Fetch error:', err);
                    throw new Error(`Fetch failed: ${err.message}`);
                });
            };

            supabaseClient = createClient(
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
                        },
                        fetch: customFetch
                    }
                }
            );
        }

        if (config.debug) console.log(`[DEBUG] Querying table: ${config.table || 'users'}`);
        const { data, error } = await supabaseClient
            .from(config.table || 'users')
            .select('*')
            .eq(config.emailField || 'email', email)
            .single();

        if (error) {
            if (config.debug) console.log('[DEBUG] Error fetching user:', error.message);
            throw new Error(`Error fetching user: ${error.message}`);
        }

        if (!data) {
            if (config.debug) console.log('[DEBUG] No user found');
            return null;
        }

        if (config.debug) console.log('[DEBUG] User fetched successfully');
        return data;
    } catch (error) {
        if (config.debug) console.log('[DEBUG] Error in fetchUser:', error);
        throw error;
    }
}

module.exports = fetchUser;
