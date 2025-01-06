// The main entry point for the package. Handles initialization and exposes helper functions.

const { handleWebhooks, upgradeSubscription, cancelSubscription } = require('./stripe');
const { updateUser, fetchUser } = require('./supabase');
const validateConfig = require('./utils/validateConfig');

class SubscriptionHelper {
    constructor(config) {
        this.config = validateConfig(config); // Validates the user-provided config
    }

    async handleWebhooks(req) {
        return handleWebhooks(this.config, req);
    }

    async upgradeUserSubscription(email, newPlan) {
        return upgradeSubscription(this.config, email, newPlan);
    }

    async cancelUserSubscription(email) {
        return cancelSubscription(this.config, email);
    }

    async updateUserInSupabase(email, subscriptionDetails) {
        return updateUser(this.config, email, subscriptionDetails);
    }

    async fetchUserFromSupabase(email) {
        return fetchUser(this.config, email);
    }
}

module.exports = SubscriptionHelper;
