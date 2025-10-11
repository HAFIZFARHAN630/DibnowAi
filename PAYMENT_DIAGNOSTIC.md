# Payment Auto-Activation Diagnostic Guide

## 🔍 What to Check When "Not Working"

### Step 1: Check Server Logs
```bash
# View live logs
pm2 logs dibnow --lines 100

# Or if using npm
npm start
```

**Look for:**
- ✅ "PayFast Success callback:" - Success handler triggered
- ✅ "Payment activated via success callback:" - Plan activated
- ❌ Any error messages
- ❌ "Payment not found" errors

---

### Step 2: Check Database After Payment

**Open MongoDB and check:**

```javascript
// 1. Check Payments collection
db.payments.find({ user: ObjectId("USER_ID") }).sort({ createdAt: -1 }).limit(1)
// Should show: status: 'active'

// 2. Check PlanRequest collection
db.planrequests.find({ user: ObjectId("USER_ID") }).sort({ createdAt: -1 }).limit(1)
// Should show: status: 'Active', invoiceStatus: 'Paid'

// 3. Check User model
db.users.findOne({ _id: ObjectId("USER_ID") })
// Should show: plan_name, plan_status: 'Active', invoice_status: 'Paid'

// 4. Check Transaction
db.transactions.find({ user: ObjectId("USER_ID") }).sort({ createdAt: -1 }).limit(1)
// Should show: status: 'success'
```

---

### Step 3: Test Payment Flow

**PayFast Test:**
```
1. Go to: https://apps.dibnow.com/pricing
2. Select BASIC plan
3. Choose PayFast
4. Complete payment
5. Check URL after redirect: Should be /success?plan=BASIC&gateway=payfast
6. Check /index page: Should show Active/Paid
```

**If redirects to /cancel:**
- Payment failed at PayFast gateway
- Check PayFast credentials
- Check amount format

**If redirects to /success but plan not active:**
- Success handler not executing properly
- Check logs for errors
- Check database records

---

### Step 4: Common Issues & Fixes

#### Issue 1: Success Handler Not Triggered
**Symptom:** Payment completes but plan stays Pending

**Check:**
```bash
# Check if route exists
grep -r "handleSuccess" src/routes/
```

**Fix:** Route already configured in pricingRoutes.js ✅

---

#### Issue 2: Database Not Updating
**Symptom:** Logs show success but database unchanged

**Possible Causes:**
1. User ID mismatch
2. Database connection issue
3. Model validation error

**Debug:**
Add console logs to see what's happening:
```javascript
console.log('🔍 Payment found:', payment);
console.log('🔍 User ID:', payment.user);
console.log('🔍 Plan:', payment.plan);
```

---

#### Issue 3: Redirect Loop
**Symptom:** Page keeps redirecting

**Fix:** Check session handling in success route

---

## 🛠️ Quick Fix Script

Run this to verify setup:
