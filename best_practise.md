## Security Best Practices

1. Never expose sensitive keys on the client side
   - Keep Stripe publishable key on client, secret key on server only
   - Store webhook secrets securely in environment variables

2. Authentication & Authorization
   - Implement authentication before processing subscription changes
   - Validate user permissions for subscription operations
   - Use middleware to protect subscription-related endpoints

3. API Security
   - Implement rate limiting on subscription endpoints
   - Validate webhook signatures for all incoming Stripe events
   - Set appropriate CORS policies for subscription endpoints

## Debugging

Enable debug mode for detailed logging:

```javascript
const subscriptionHelper = new SubscriptionHelper({
    // ... other config
    debug: true,
    debugHeaders: false, // Keep false in production
});
```

## Custom Implementation

Extend the webhook handling with your own custom logic:

```javascript
// Register custom webhook handlers
subscriptionHelper.on('customer.subscription.updated', async (event) => {
    // Your custom logic here
    console.log('Subscription updated:', event.data.object);
});

// Handle multiple events
subscriptionHelper.on(['invoice.paid', 'invoice.payment_failed'], async (event) => {
    // Custom invoice handling
});
```

### Best Practices for Custom Implementation
1. Keep webhook handlers lightweight
2. Use async/await for database operations
3. Implement proper error handling
4. Log important events for auditing