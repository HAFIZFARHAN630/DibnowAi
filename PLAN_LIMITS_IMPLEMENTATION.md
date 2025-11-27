# Plan-Based Feature Limits Implementation

## Overview
This implementation adds plan-based feature limits across the application, restricting users based on their subscription plan.

## Files Modified

### 1. Middleware Created
**File:** `src/middlewares/checkLimitMiddleware.js`
- Generic reusable middleware
- Checks user's plan limits before allowing resource creation
- Returns 403 with appropriate message when limit is reached

### 2. User Model Updated
**File:** `src/models/user.js`
- Added `planLimits` object with 5 feature limits:
  - `repairCustomer`: Number
  - `category`: Number
  - `brand`: Number
  - `teams`: Number
  - `inStock`: Number

### 3. Routes Updated (POST only)

#### Category Routes
**File:** `src/routes/categoryRoutes.js`
- POST `/category` → Protected with `checkLimit("category", Category)`

#### Repair Routes
**File:** `src/routes/repairRoutes.js`
- POST `/repair` → Protected with `checkLimit("repairCustomer", Repair)`

#### Brand Routes
**File:** `src/routes/BrandRoutes.js`
- POST `/Brand` → Protected with `checkLimit("brand", Brand)`

#### Team Routes
**File:** `src/routes/UserTeamsRoutes.js`
- POST `/userteam/add` → Protected with `checkLimit("teams", AddUser)`

#### InStock Routes
**File:** `src/routes/in_stockRoutes.js`
- POST `/in_stock` → Protected with `checkLimit("inStock", Inventory)`

## How It Works

### 1. Middleware Logic
```javascript
checkLimit(featureName, Model)
```

**Steps:**
1. Extracts userId from session/request
2. Fetches user from database
3. Reads `user.planLimits[featureName]`
4. Counts existing records: `Model.countDocuments({ user_id: userId })`
5. Compares count vs limit:
   - If limit = 0: Feature not allowed → 403
   - If count >= limit: Limit reached → 403
   - Otherwise: Allow creation → next()

### 2. Error Responses

**Feature Not Allowed (limit = 0):**
```json
{
  "success": false,
  "message": "Your plan does not allow this feature. Please upgrade your plan."
}
```

**Limit Reached:**
```json
{
  "success": false,
  "message": "Your limit is completed. Please upgrade your plan."
}
```

## How New Plans Auto-Work

### When Admin Creates a New Plan:
1. Admin sets limits in plan creation form:
   - repairCustomer: 50
   - category: 10
   - brand: 5
   - teams: 3
   - inStock: 100

2. When user purchases this plan, copy these limits to `user.planLimits`:
```javascript
user.planLimits = {
  repairCustomer: selectedPlan.repairCustomer,
  category: selectedPlan.category,
  brand: selectedPlan.brand,
  teams: selectedPlan.teams,
  inStock: selectedPlan.inStock
};
await user.save();
```

3. Middleware automatically enforces these limits
4. No code changes needed for new plans

### Example Plan Configurations:

**Free Plan:**
```javascript
planLimits: {
  repairCustomer: 5,
  category: 2,
  brand: 2,
  teams: 0,      // Feature disabled
  inStock: 10
}
```

**Pro Plan:**
```javascript
planLimits: {
  repairCustomer: 100,
  category: 20,
  brand: 15,
  teams: 5,
  inStock: 500
}
```

**Enterprise Plan:**
```javascript
planLimits: {
  repairCustomer: 999999,  // Unlimited
  category: 999999,
  brand: 999999,
  teams: 999999,
  inStock: 999999
}
```

## Integration with Plan Purchase

Add this code to your plan purchase/activation logic:

```javascript
// In pricingController.js or wherever plan is activated
async function activatePlan(userId, planId) {
  const plan = await planModel.findById(planId);
  const user = await User.findById(userId);
  
  // Copy plan limits to user
  user.planLimits = {
    repairCustomer: plan.repairCustomer || 0,
    category: plan.category || 0,
    brand: plan.brand || 0,
    teams: plan.teams || 0,
    inStock: plan.inStock || 0
  };
  
  user.plan_name = plan.plan_name;
  await user.save();
}
```

## Testing

### Test Scenarios:

1. **Feature Disabled (limit = 0):**
   - Try to create category when `planLimits.category = 0`
   - Should return: "Your plan does not allow this feature"

2. **Limit Reached:**
   - User has `planLimits.brand = 3`
   - User already created 3 brands
   - Try to create 4th brand
   - Should return: "Your limit is completed"

3. **Within Limit:**
   - User has `planLimits.repairCustomer = 10`
   - User created 5 repair customers
   - Try to create 6th
   - Should succeed

## Benefits

✅ **No Hard-Coding:** No plan names in code
✅ **Reusable:** Single middleware for all features
✅ **Scalable:** Add new features easily
✅ **Future-Proof:** New plans work automatically
✅ **Clean Code:** Minimal changes to existing routes
✅ **Production-Ready:** Error handling included

## Notes

- Only POST (create) routes are protected
- GET, PUT, DELETE routes remain unrestricted
- Users can view/edit/delete existing records regardless of limits
- Limits only prevent creating NEW records beyond the allowed count
