# PayFast Live Payment Failure - Troubleshooting Guide

## 🔴 Common Issues (Works Local, Fails Live)

### Issue 1: Webhook URL Not Accessible ⚠️
**Problem:** PayFast cannot reach your IPN/webhook URL on live server

**Check:**
```bash
# Test if webhook is accessible
curl -X POST https://apps.dibnow.com/pricing/payfast/ipn \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Fix:**
1. Ensure your server firewall allows incoming POST requests
2. Check if route is registered in your routes file
3. Verify SSL certificate is valid (PayFast requires HTTPS)

---

### Issue 2: Live Credentials Mismatch ⚠️
**Current Config:**
```
PAYFAST_MERCHANT_ID=26995
PAYFAST_SECURED_KEY=fts432DwdbTzWo0q714sOTgb
PAYFAST_MODE=live
```

**Check:**
1. Login to PayFast merchant portal
2. Verify MERCHANT_ID matches exactly
3. Verify SECURED_KEY is correct for LIVE mode (not sandbox)
4. Ensure merchant account is activated for live transactions

---

### Issue 3: Amount Format Issue ⚠️
**Problem:** Live PayFast may reject incorrect amount format

**Current Code:**
```javascript
const pkrAmount = parseFloat(amount).toFixed(2);
```

**Fix:** Ensure amount is always 2 decimal places
```javascript
// In payfastController.js - already correct
const pkrAmount = parseFloat(amount).toFixed(2);
```

---

### Issue 4: Phone Number Format ⚠️
**Problem:** PayFast requires valid Pakistani phone format

**Current Code:**
```javascript
const customerPhone = user.phone_number || '03123456789';
```

**Fix:** Validate phone format
```javascript
// Must be: 03XXXXXXXXX (11 digits starting with 0)
const customerPhone = user.phone_number?.replace(/[^0-9]/g, '') || '03123456789';
if (customerPhone.length !== 11 || !customerPhone.startsWith('0')) {
  throw new Error('Invalid phone number format');
}
```

---

### Issue 5: Token Expiry ⚠️
**Problem:** PayFast access token expires quickly

**Current:** Token fetched once, may expire before payment

**Fix:** Already handled - token is fetched fresh for each payment

---

### Issue 6: SSL/HTTPS Certificate ⚠️
**Problem:** PayFast requires valid SSL on live

**Check:**
```bash
# Test SSL certificate
curl -I https://apps.dibnow.com
```

**Fix:** Ensure SSL certificate is:
- Valid (not expired)
- Trusted (not self-signed)
- Covers your domain

---

## 🔧 Quick Fixes to Apply

### Fix 1: Add Better Error Logging
