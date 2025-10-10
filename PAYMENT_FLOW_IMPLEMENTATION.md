# Payment Flow Implementation - Complete Guide

## Overview
This document describes the complete implementation of manual and automatic payment flows for plan activation in the Dibnow project.

---

## 1️⃣ Manual Payment Flow (PKR-based)

### Price Structure (Testing)
- **Basic** → ₨1
- **Standard** → ₨2
- **Premium** → ₨3

### Step-by-Step Flow

#### Step 1: User Submits Manual Payment
When a user selects a plan and chooses "Manual Payment":
- User enters transaction ID and amount
- System validates amount against plan price
- Creates a `PlanRequest` record with status: `Pending`, invoiceStatus: `Unpaid`
- Stores transaction details in user record

**File**: `src/controllers/pricingController.js` (addSubscription function)

#### Step 2: Request Appears in Admin Panel
Manual payment requests appear in:
**Location**: `view/Request/request.ejs`

**Displays**:
- User name / email
- Phone number
- Plan name (Basic/Standard/Premium)
- Amount (PKR)
- Transaction ID
- Payment status ("Pending")
- Two action buttons: **Accept** / **Deny**

**Controller**: `src/controllers/requestController.js` (allusers function)
- Fetches all pending manual payment requests from PlanRequest model
- Populates user details
- Renders the request page

#### Step 3: Admin Clicks "Accept"
When admin clicks Accept button:
1. Sends notification to user: "Your payment has been verified. Please wait, your plan will activate within 1–2 hours."
2. Redirects admin to `/package-request` page
3. User receives notification via Socket.IO

**Endpoint**: `POST /admin/notify/manual-payment/:userId`
**Controller**: `src/controllers/requestController.js` (acceptManualPayment function)

#### Step 4: Plan Activation
The verified manual payment appears in:
**Location**: `view/PlanRequest/request.ejs`

Admin can now:
1. Update Package Status to "Active"
2. Set Invoice Status to "Paid"
3. Set expiry date
4. Click "Update Plan Request"

**Endpoint**: `POST /update-plan-request`
**Controller**: `src/controllers/adminrequestController.js` (updatePlanRequest function)

When admin activates:
- Creates Payment record with status: `active`
- Updates user's plan_name
- Updates plan_limit based on plan type
- Creates transaction record
- User's Free Trial status is replaced with new active package

---

## 2️⃣ Automatic Payment Flow (Stripe / PayPal / PayFast)

### Price Structure (Production)
- **Basic** → £20.88
- **Standard** → £35.88
- **Premium** → £55.88

### Step-by-Step Flow

#### Step 1: User Selects Plan and Gateway
User chooses Stripe, PayPal, or PayFast and completes payment

#### Step 2: Payment Success Callback
After successful transaction confirmation:

**Endpoint**: `GET /success?plan=PLAN_NAME&gateway=GATEWAY_NAME`
**Controller**: `src/controllers/pricingController.js` (paymentSuccess function)

**Automatic Actions**:
1. Creates Payment record with status: `active`
2. Creates/Updates PlanRequest with status: `Active`, invoiceStatus: `Paid`
3. Updates user's plan_name in database
4. Updates plan_limit automatically:
   - Basic: +300
   - Standard: +500
   - Premium: +1000
5. Creates transaction record with status: `success`
6. Sends notification: "Plan Activated"
7. User sees: "Your plan is active. Enjoy your premium features!"

**No manual approval required** - Plan activates instantly!

---

## 3️⃣ Technical Implementation Details

### Database Models

#### PlanRequest Model
```javascript
{
  user: ObjectId (ref: User),
  planName: String (BASIC/STANDARD/PREMIUM),
  status: String (Active/Expired/Pending/Paid/Cancelled),
  startDate: Date,
  expiryDate: Date,
  invoiceStatus: String (Paid/Unpaid),
  amount: Number,
  description: String
}
```

#### Payments Model
```javascript
{
  user: ObjectId (ref: User),
  plan: String,
  amount: Number,
  gateway: String (stripe/paypal/payfast/manual),
  startDate: Date,
  expiryDate: Date,
  status: String (active/expired/pending)
}
```

### Key Routes

#### Manual Payment Routes
- `GET /request` - View manual payment requests
- `POST /admin/notify/manual-payment/:userId` - Send notification to user
- `GET /package-request` - View all plan requests for activation
- `POST /update-plan-request` - Activate plan

#### Automatic Payment Routes
- `POST /add-subscription` - Initiate payment
- `GET /success` - Payment success callback
- `GET /cancel` - Payment cancellation

### Plan Limits
When a plan is activated, the following limits are added to user's account:
- **FREE_TRIAL**: 30 items
- **BASIC**: 300 items
- **STANDARD**: 500 items
- **PREMIUM**: 1000 items

---

## 4️⃣ Testing Guide

### Manual Payment Testing (PKR)
1. Go to pricing page
2. Select a plan (Basic/Standard/Premium)
3. Choose "Manual Payment"
4. Enter transaction ID: `TEST123`
5. Enter amount: `1` (for Basic), `2` (for Standard), or `3` (for Premium)
6. Submit payment
7. Login as admin
8. Go to `/request` page
9. Click "Accept" button
10. Go to `/package-request` page
11. Update plan status to "Active" and invoice to "Paid"
12. User's plan should now be active

### Automatic Payment Testing (Stripe/PayPal)
1. Go to pricing page
2. Select a plan
3. Choose Stripe or PayPal
4. Complete payment on gateway
5. After success, user is redirected to `/success`
6. Plan should be automatically active
7. User should see success message
8. Check user dashboard - plan should be active immediately

---

## 5️⃣ Key Features

### Manual Payment
✅ Admin verification required
✅ Notification system for user updates
✅ Two-step process: Accept → Activate
✅ PKR pricing for testing
✅ Transaction ID tracking

### Automatic Payment
✅ Instant activation (no admin approval)
✅ Automatic plan limit updates
✅ Transaction recording
✅ GBP pricing for production
✅ Support for Stripe, PayPal, PayFast

---

## 6️⃣ Files Modified

1. `src/controllers/requestController.js` - Manual payment request handling
2. `src/controllers/pricingController.js` - Payment processing
3. `src/controllers/adminrequestController.js` - Plan activation
4. `src/routes/requestRoutes.js` - Manual payment routes
5. `view/Request/request.ejs` - Manual payment request display
6. `view/PlanRequest/request.ejs` - Plan activation interface

---

## 7️⃣ Important Notes

- Manual payment is only for PKR testing
- Stripe, PayPal, and PayFast remain in GBP
- Manual payment requires admin verification
- Auto gateways self-verify and auto-activate
- All payments create transaction records
- Notifications are sent via Socket.IO
- Plan limits are cumulative (add to existing limit)

---

## Support

For issues or questions, check the console logs:
- Manual payment logs: Look for "Creating Manual Payment PlanRequest"
- Auto payment logs: Look for "✅ Auto-payment created"
- Plan activation logs: Look for "✅ Plan activated for user"
