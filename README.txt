Admin-Configurable Payment Gateways Implementation

Testing Instructions
1. Start the app: node index.js or npm start
2. Login as admin (use /admin)
3. Navigate to /admin/payment-settings
4. Configure gateways: enable/disable, set modes, enter credentials (use test values)
5. Save settings - should see success message, only changed fields updated
6. Go to /pricing as user - should see only enabled gateways in modal
7. If no gateways enabled, fallback to Stripe/PayPal/Bank using env vars
8. Test "Buy Now" for each: should call existing backend routes
9. For bank, submit transfer details - should post to /transfer
10. Verify DB: mongo shell, db.paymentSettings.find() - check enabled, credentials merged

Sample DB Records
db.paymentSettings.insertMany([
  {
    gateway: "stripe",
    enabled: true,
    mode: "sandbox",
    credentials: {
      publishable_key: "pk_test_...",
      secret_key: "sk_test_..."
    },
    updatedAt: ISODate()
  },
  {
    gateway: "paypal",
    enabled: true,
    mode: "sandbox",
    credentials: {
      client_id: "test_client_id",
      client_secret: "test_secret"
    },
    updatedAt: ISODate()
  },
  {
    gateway: "bank",
    enabled: true,
    credentials: {
      instructions: "Transfer to Bank of Punjab, Account 1234567890"
    },
    updatedAt: ISODate()
  },
  {
    gateway: "jazzcash",
    enabled: false,
    mode: "live",
    credentials: {
      merchant_id: "test_id",
      password: "test_pass"
    },
    updatedAt: ISODate()
  },
  {
    gateway: "payfast",
    enabled: true,
    mode: "sandbox",
    credentials: {
      merchant_key: "test_key",
      merchant_secret: "test_secret"
    },
    updatedAt: ISODate()
  }
]);

Security Notes
- Secret keys never exposed to frontend (only publishable/client_id)
- Input validation in controllers (add joi or express-validator for production)
- Consider encrypting credentials in DB (mongoose-encryption plugin)
- Admin routes protected by isAdmin middleware
- Log admin changes with user ID and timestamp (add in savePaymentSettings)
- Use HTTPS in production
- Rate limit API endpoints
- Validate gateway configs on save (e.g., test stripe key validity)