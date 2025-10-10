# Currency Testing Guide - GBP to PKR Temporary Switch

## ✅ Changes Made for PKR Testing

### Files Modified:
1. **pricingController.js** - Updated plan prices and currency codes
2. **payfastController.js** - Removed GBP to PKR conversion
3. **pricing.ejs** - Updated currency display symbols

---

## 🔄 Current Testing Configuration

### Plan Prices (PKR):
- **FREE_TRIAL**: ₨0.00
- **BASIC**: ₨50.00
- **STANDARD**: ₨100.00
- **PREMIUM**: ₨150.00

**Note**: Stripe requires minimum 30 PKR for transactions

### Currency Changes:
- **Stripe**: Changed from `gbp` to `pkr`
- **PayPal**: Changed from `GBP` to `PKR`
- **PayFast**: Using PKR directly (no conversion)
- **Manual Payments**: Display ₨ symbol instead of £

---

## 🧪 Testing Instructions

1. **Test PayFast**: Try ₨50, ₨100, ₨150 payments
2. **Test Stripe**: ₨50, ₨100, ₨150 (meets 30 PKR minimum)
3. **Test PayPal**: ₨50, ₨100, ₨150
4. **Test Manual**: ₨50, ₨100, ₨150

---

## 🔙 How to Revert Back to GBP

### Step 1: Update pricingController.js

Find and replace:
```javascript
// TEMPORARY PKR FOR TESTING
const planPrices = {
  FREE_TRIAL: "0.00",
  BASIC: "50.00",
  STANDARD: "100.00",
  PREMIUM: "150.00",
};
```

With:
```javascript
const planPrices = {
  FREE_TRIAL: "0.00",
  BASIC: "20.88",
  STANDARD: "35.88",
  PREMIUM: "55.88",
};
```

Change currency codes:
- `currency: "pkr"` → `currency: "gbp"`
- `currency: "PKR"` → `currency: "GBP"`
- `₨` → `£`

### Step 2: Update payfastController.js

Restore GBP to PKR conversion:
```javascript
const gbpAmount = parseFloat(amount);
const pkrAmount = (gbpAmount * 397.1863).toFixed(2);
```

Restore payment info display with both currencies.

### Step 3: Update pricing.ejs

Change all `₨` symbols back to `£` and restore dual currency display.

---

## 📝 Summary

**Current State**: System uses PKR for all gateways with test amounts (₨50, ₨100, ₨150)

**After Testing**: Revert to GBP with production prices (£20.88, £35.88, £55.88)

**PayFast**: Will convert GBP to PKR automatically after revert

---

**Testing Period**: Temporary only
**Production Currency**: GBP (£)
