# Testing Guide - Plan Activation Feature

## Quick Test Scenarios

### Scenario 1: Online Payment (Stripe)
**Expected Behavior**: Plan activates automatically

1. Login as a user
2. Go to `/pricing`
3. Select "BASIC" plan
4. Choose "Stripe" as payment method
5. Complete payment on Stripe checkout
6. Redirected to `/index`
7. **Verify**:
   - Plan Status Card shows "BASIC" plan
   - Status badge shows "Active" (green)
   - Invoice Status shows "Paid" (green)
   - Amount shows "£20.88"
   - Expiry date is 30 days from today

### Scenario 2: Online Payment (PayPal)
**Expected Behavior**: Plan activates automatically

1. Login as a user
2. Go to `/pricing`
3. Select "STANDARD" plan
4. Choose "PayPal" as payment method
5. Complete payment on PayPal
6. Redirected to `/index`
7. **Verify**:
   - Plan Status Card shows "STANDARD" plan
   - Status badge shows "Active" (green)
   - Invoice Status shows "Paid" (green)
   - Amount shows "£35.88"
   - Expiry date is 30 days from today

### Scenario 3: Manual Payment (Bank Transfer)
**Expected Behavior**: Plan request created, awaiting admin approval

1. Login as a user
2. Go to `/pricing`
3. Select "PREMIUM" plan
4. Choose "Bank Transfer" as payment method
5. Fill in transfer details:
   - Transfer ID: "TXN123456"
   - Amount: "55.88"
6. Submit form
7. **Verify on User Dashboard** (`/index`):
   - Plan Status Card shows "PREMIUM" plan
   - Status badge shows "Pending" (yellow)
   - Invoice Status shows "Unpaid" (yellow)
   - Amount shows "£55.88"
   - Description mentions "awaiting admin verification"

8. **Admin Approval**:
   - Login as admin
   - Go to `/package-request`
   - Find the PREMIUM plan request
   - Click "Edit" button
   - Set:
     - Plan Status: "Active"
     - Invoice Status: "Paid"
     - Expiry Date: (30 days from today)
   - Click "Update Plan Request"

9. **Verify After Admin Approval**:
   - User dashboard now shows:
     - Status badge: "Active" (green)
     - Invoice Status: "Paid" (green)
     - Plan is fully activated

### Scenario 4: Manual Payment (JazzCash)
**Expected Behavior**: Plan request created, awaiting admin approval

1. Login as a user
2. Go to `/pricing`
3. Select "BASIC" plan
4. Choose "JazzCash" as payment method
5. Enter amount: "20.88"
6. Submit form
7. **Verify**:
   - Plan request created with "Pending + Unpaid"
   - User sees message: "Your manual payment for BASIC plan has been submitted"
   - Admin can approve from `/package-request`

### Scenario 5: Free Trial (New User)
**Expected Behavior**: Free trial auto-assigned

1. Register a new user account
2. Verify email and login
3. Go to `/index`
4. **Verify**:
   - Plan Status Card shows "Free Trial" plan
   - Status badge shows "Active" (green)
   - Invoice Status shows "Unpaid" (yellow)
   - Amount shows "£0"
   - Expiry date is 7 days from registration
   - Description: "Free Trial Plan - 7 days access"

### Scenario 6: Wallet Payment
**Expected Behavior**: Plan activates automatically (like online payment)

1. Login as a user
2. Top up wallet with sufficient balance (e.g., £50)
3. Go to `/pricing`
4. Select "BASIC" plan
5. Choose "Wallet" as payment method
6. Confirm payment
7. **Verify**:
   - Wallet balance deducted by £20.88
   - Plan Status Card shows "BASIC" plan
   - Status badge shows "Active" (green)
   - Invoice Status shows "Paid" (green)
   - Plan activated immediately

## Database Verification

### Check Payments Collection
```javascript
db.payments.find({ user: ObjectId("USER_ID") }).sort({ createdAt: -1 })
```

**Expected Fields**:
- `plan`: "BASIC", "STANDARD", or "PREMIUM"
- `status`: "active" (for online payments)
- `gateway`: "stripe", "paypal", "payfast", "wallet", or "manual"
- `amount`: Correct plan price
- `expiryDate`: 30 days from startDate

### Check PlanRequests Collection
```javascript
db.planrequests.find({ user: ObjectId("USER_ID") }).sort({ createdAt: -1 })
```

**Expected Fields**:
- `planName`: Plan name
- `status`: "Active" (online) or "Pending" (manual)
- `invoiceStatus`: "Paid" (online) or "Unpaid" (manual)
- `amount`: Correct plan price
- `expiryDate`: 30 days from startDate

### Check Users Collection
```javascript
db.users.findOne({ _id: ObjectId("USER_ID") })
```

**Expected Fields**:
- `plan_name`: Updated to selected plan
- `plan_limit`: Updated based on plan (300 for BASIC, 500 for STANDARD, 1000 for PREMIUM)

## Common Issues & Solutions

### Issue 1: Plan not activating after online payment
**Solution**: Check console logs for errors. Verify:
- Stripe/PayPal credentials are correct
- `APP_BASE_URL` is set correctly in .env
- Payment success callback is reaching `/success` route

### Issue 2: Manual payment not showing in admin panel
**Solution**: Verify:
- PlanRequest was created in database
- Admin is accessing `/package-request` route
- User is logged in when submitting manual payment

### Issue 3: Dashboard showing "No Plan Assigned"
**Solution**: Check:
- User has a record in `planrequests` collection
- If not, the system should auto-create Free Trial on dashboard access
- Check console logs for any errors during Free Trial creation

### Issue 4: Admin approval not activating plan
**Solution**: Verify:
- Both `status` is set to "Active" AND `invoiceStatus` is set to "Paid"
- Check console logs for activation errors
- Verify `Payments` record was created after approval

## Test Data

### Test Plan Prices
```javascript
{
  "FREE_TRIAL": "0.00",
  "BASIC": "20.88",
  "STANDARD": "35.88",
  "PREMIUM": "55.88"
}
```

### Test Plan Limits
```javascript
{
  "FREE_TRIAL": 30,
  "BASIC": 300,
  "STANDARD": 500,
  "PREMIUM": 1000
}
```

## API Endpoints to Test

### User Endpoints
- `GET /pricing` - View plans and payment options
- `POST /add-subscription` - Submit payment
- `GET /success?plan=BASIC&gateway=stripe` - Payment success callback
- `GET /cancel` - Payment cancellation
- `POST /transfer` - Submit manual payment details
- `GET /index` - View dashboard with plan status

### Admin Endpoints
- `GET /package-request` - View all plan requests
- `POST /update-plan-request` - Approve/update plan request
- `DELETE /plan-request/:id` - Delete plan request

## Success Criteria

✅ **Online Payments**:
- Plan activates immediately after payment
- Dashboard shows "Active + Paid"
- User can access features based on new plan

✅ **Manual Payments**:
- Plan request created with "Pending + Unpaid"
- Admin can view and approve
- After approval, plan shows "Active + Paid"

✅ **Free Trial**:
- Auto-assigned to new users
- Shows "Active + Unpaid"
- 7-day expiry

✅ **Admin Panel**:
- All plan requests visible
- Can update status and invoice status
- Changes reflect immediately on user dashboard

---

**Last Updated**: January 2025
**Status**: Ready for Testing
