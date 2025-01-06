const { createClient } = require('@supabase/supabase-js');

async function fetchUser(config, email) {
    if (config.debug) console.log(`[DEBUG] Attempting to fetch user with email: ${email}`);
    
    if (!email) {
        if (config.debug) console.log('[DEBUG] Error: Email is required');
        throw new Error('Email is required to fetch user');
    }

    if (config.debug) console.log('[DEBUG] Creating Supabase client...');
    const supabase = createClient(
        config.supabaseUrl,
        config.supabaseKey
    );

    try {
        if (config.debug) console.log(`[DEBUG] Querying table: ${config.table || 'users'}`);
        const { data, error } = await supabase
            .from(config.table || 'users')
            .select('*')
            .eq(config.emailField || 'email', email)
            .single();

        if (error) {
            if (config.debug) console.log('[DEBUG] Error fetching user:', error.message);
            throw new Error(`Error fetching user: ${error.message}`);
        }

        if (config.debug) console.log('[DEBUG] User fetched successfully');
        return data;
    } catch (error) {
        if (config.debug) console.log('[DEBUG] Error in fetchUser:', error.message);
        throw error;
    }
}

module.exports = fetchUser;
