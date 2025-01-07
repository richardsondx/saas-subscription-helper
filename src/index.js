// The main entry point for the package. Handles initialization and exposes helper functions.

const { handleWebhooks, upgradeSubscription, cancelSubscription, changePlan, fetchSubscription, syncSubscription } = require('./stripe');
const { updateUser, fetchUser } = require('./supabase');
const validateConfig = require('./utils/validateConfig');

class SubscriptionHelper {
    constructor(config) {
        this.config = validateConfig(config); // Validates the user-provided config
    }

    async handleWebhooks(req) {
        return handleWebhooks(this.config, req);
    }

    async changeUserPlan(email, newPlan, options = {}) {
        return changePlan(this.config, email, newPlan, options);
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

    async fetchSubscription(email) {
        return fetchSubscription(this.config, email);
    }

    async syncSubscription(email) {
        return syncSubscription(this.config, email);
    }
}

module.exports = SubscriptionHelper;
