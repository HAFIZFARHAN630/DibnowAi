# Payment Flow Testing Checklist

## ✅ Manual Payment Flow Testing

### Test 1: Submit Manual Payment Request
- [ ] Navigate to `/pricing`
- [ ] Select **Basic Plan**
- [ ] Choose **Manual Payment** option
- [ ] Enter Transaction ID: `TEST-BASIC-001`
- [ ] Enter Amount: `1` (PKR)
- [ ] Click Submit
- [ ] Verify success message appears
- [ ] Verify redirect to index page

### Test 2: View Request in Admin Panel
- [ ] Login as admin
- [ ] Navigate to `/request`
- [ ] Verify manual payment request appears
- [ ] Check displayed information:
  - [ ] User name and email
  - [ ] Phone number
  - [ ] Plan name: **BASIC**
  - [ ] Amount: **₨1**
  - [ ] Transaction ID: **TEST-BASIC-001**
  - [ ] Accept and Deny buttons visible

### Test 3: Accept Manual Payment
- [ ] Click **Accept** button
- [ ] Verify alert: "Notification sent successfully! Now go to Plan Request page to activate the plan."
- [ ] Verify automatic redirect to `/package-request`
- [ ] Check user received notification (if logged in as user in another tab)

### Test 4: Activate Plan
- [ ] On `/package-request` page, find the pending request
- [ ] Click **Edit** button
- [ ] Set **Plan Status** to: `Active`
- [ ] Set **Invoice Status** to: `Paid`
- [ ] Set **Expiry Date**: 30 days from today
- [ ] Click **Update Plan Request**
- [ ] Verify success message
- [ ] Check user's plan is now active

### Test 5: Verify User Account
- [ ] Login as the user
- [ ] Navigate to dashboard/index
- [ ] Verify plan shows as **BASIC** (not Free Trial)
- [ ] Verify plan limit increased by 300
- [ ] Check transaction history shows the payment

---

## ✅ Automatic Payment Flow Testing (Stripe)

### Test 1: Initiate Stripe Payment
- [ ] Navigate to `/pricing`
- [ ] Select **Standard Plan**
- [ ] Choose **Stripe** payment method
- [ ] Click Submit
- [ ] Verify redirect to Stripe checkout page

### Test 2: Complete Stripe Payment
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Enter any future expiry date
- [ ] Enter any 3-digit CVC
- [ ] Complete payment
- [ ] Verify redirect to success page

### Test 3: Verify Automatic Activation
- [ ] Check success message: "Your STANDARD plan is now active! Enjoy your premium features."
- [ ] Navigate to dashboard
- [ ] Verify plan shows as **STANDARD**
- [ ] Verify plan limit increased by 500
- [ ] Check no admin approval was needed

### Test 4: Verify Database Records
- [ ] Check `payments` collection:
  - [ ] Record exists with status: `active`
  - [ ] Gateway: `stripe`
  - [ ] Amount: correct
- [ ] Check `planrequests` collection:
  - [ ] Status: `Active`
  - [ ] Invoice Status: `Paid`
- [ ] Check `transactions` collection:
  - [ ] Transaction recorded with status: `success`

---

## ✅ Automatic Payment Flow Testing (PayPal)

### Test 1: Initiate PayPal Payment
- [ ] Navigate to `/pricing`
- [ ] Select **Premium Plan**
- [ ] Choose **PayPal** payment method
- [ ] Click Submit
- [ ] Verify redirect to PayPal checkout

### Test 2: Complete PayPal Payment
- [ ] Login to PayPal sandbox account
- [ ] Approve payment
- [ ] Verify redirect to success page

### Test 3: Verify Automatic Activation
- [ ] Check success message appears
- [ ] Verify plan shows as **PREMIUM**
- [ ] Verify plan limit increased by 1000
- [ ] Check instant activation (no admin approval)

---

## ✅ Edge Cases Testing

### Test 1: Insufficient Amount (Manual Payment)
- [ ] Select Basic Plan (requires ₨1)
- [ ] Enter amount: `0.5`
- [ ] Submit
- [ ] Verify error message: "Amount too low!"
- [ ] Verify payment not created

### Test 2: Missing Transaction ID (Manual Payment)
- [ ] Select any plan
- [ ] Leave Transaction ID empty
- [ ] Submit
- [ ] Verify error message
- [ ] Verify redirect back to pricing

### Test 3: Deny Manual Payment
- [ ] Submit a manual payment request
- [ ] Admin clicks **Deny** button
- [ ] Verify denial notification sent to user
- [ ] Verify request remains in pending state

### Test 4: Multiple Plan Purchases
- [ ] User already has Basic plan
- [ ] Purchase Standard plan
- [ ] Verify plan upgraded to Standard
- [ ] Verify plan limits are cumulative (300 + 500 = 800)

---

## ✅ Notification Testing

### Test 1: Manual Payment Acceptance Notification
- [ ] Submit manual payment as user
- [ ] Accept as admin
- [ ] Check user receives notification
- [ ] Verify notification message: "Your payment has been verified. Please wait, your plan will activate within 1–2 hours."

### Test 2: Automatic Payment Notification
- [ ] Complete Stripe/PayPal payment
- [ ] Check user receives "Plan Activated" notification
- [ ] Verify notification appears in notification panel

---

## ✅ Admin Panel Testing

### Test 1: Request Page Display
- [ ] Navigate to `/request`
- [ ] Verify only pending manual payments show
- [ ] Verify table columns:
  - [ ] First Name
  - [ ] Email
  - [ ] Phone Number
  - [ ] Plan Name
  - [ ] Amount (PKR)
  - [ ] Transaction ID
  - [ ] Actions

### Test 2: Package Request Page Display
- [ ] Navigate to `/package-request`
- [ ] Verify all plan requests show (manual + auto)
- [ ] Verify filter and search functionality
- [ ] Verify edit and delete buttons work

### Test 3: Plan Activation Form
- [ ] Click Edit on any pending request
- [ ] Verify modal opens
- [ ] Verify all fields populate correctly
- [ ] Test dropdown color changes
- [ ] Submit form
- [ ] Verify plan activates successfully

---

## 🎯 Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Proper database records created
- ✅ Correct plan limits applied
- ✅ Notifications sent successfully
- ✅ User experience is smooth
- ✅ Admin can manage requests easily

---

## 🐛 Common Issues & Solutions

### Issue: Manual payment not appearing in `/request`
**Solution**: Check PlanRequest status is "Pending" and invoiceStatus is "Unpaid"

### Issue: Automatic payment not activating
**Solution**: Check console logs for errors, verify gateway configuration

### Issue: Plan limits not updating
**Solution**: Check subscribePlan function in pricingController.js

### Issue: Notifications not sending
**Solution**: Verify Socket.IO connection, check notificationService

### Issue: Modal not opening
**Solution**: Check Bootstrap version, verify data-toggle/data-bs-toggle attributes

---

## 📝 Test Results Log

| Test Case | Status | Date | Notes |
|-----------|--------|------|-------|
| Manual Payment - Basic | ⬜ | | |
| Manual Payment - Standard | ⬜ | | |
| Manual Payment - Premium | ⬜ | | |
| Stripe Payment | ⬜ | | |
| PayPal Payment | ⬜ | | |
| PayFast Payment | ⬜ | | |
| Admin Accept Flow | ⬜ | | |
| Admin Deny Flow | ⬜ | | |
| Plan Activation | ⬜ | | |
| Notifications | ⬜ | | |

---

**Last Updated**: January 2025
**Version**: 1.0
