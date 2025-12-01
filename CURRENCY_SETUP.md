# Dynamic Currency System Setup

## Overview
The system now uses **database-driven currency rates** instead of hardcoded values. This allows you to update exchange rates without modifying code.

## Setup Instructions

### 1. Run the Currency Seeder
This populates the database with initial currency rates:

```bash
node currencySeeder.js
```

Expected output:
```
✅ Connected to MongoDB
✅ PKR - Pakistani Rupee: 397.1863
✅ INR - Indian Rupee: 103.50
✅ USD - US Dollar: 1.27
✅ GBP - British Pound: 1.0
✅ EUR - Euro: 1.17
✅ CAD - Canadian Dollar: 1.78
✅ AUD - Australian Dollar: 1.95

✅ Currency rates seeded successfully!
```

### 2. Verify Database
Check MongoDB to ensure the `currencyrates` collection was created with 7 currencies.

### 3. Test the System
1. Visit `/pricing` page
2. Currency rates will be fetched from database automatically
3. Use the currency selector dropdown to switch between currencies

## How It Works

### Backend (GPA Currency)
- All prices stored in database in **GPA** (base currency, equivalent to GBP)
- All payment processing uses **GPA**
- All calculations use **GPA**

### Frontend (Display Currency)
- Prices displayed in user's local currency
- Conversion rates fetched from database via `/api/currency-rates`
- User can manually select currency using dropdown

### Currency Detection
1. **Auto-detection**: Uses GeoIP to detect user's country
2. **Manual selection**: User can override with dropdown
3. **Session storage**: Selected currency saved in session

## Updating Currency Rates

### Method 1: API Endpoint (Recommended)
```bash
curl -X POST http://localhost:3000/api/currency-rates/update \
  -H "Content-Type: application/json" \
  -d '{"code": "PKR", "rate": 400.50}'
```

### Method 2: Direct Database Update
```javascript
db.currencyrates.updateOne(
  { code: "PKR" },
  { $set: { rate: 400.50, lastUpdated: new Date() } }
)
```

### Method 3: Admin Panel (Future Enhancement)
Create an admin interface to manage currency rates through the UI.

## API Endpoints

### Get All Currency Rates
```
GET /api/currency-rates
```

Response:
```json
{
  "success": true,
  "rates": {
    "PKR": { "symbol": "Rs", "rate": 397.1863 },
    "INR": { "symbol": "₹", "rate": 103.50 },
    "USD": { "symbol": "$", "rate": 1.27 },
    "GBP": { "symbol": "£", "rate": 1.0 },
    "EUR": { "symbol": "€", "rate": 1.17 },
    "CAD": { "symbol": "C$", "rate": 1.78 },
    "AUD": { "symbol": "A$", "rate": 1.95 }
  }
}
```

### Update Currency Rate
```
POST /api/currency-rates/update
Content-Type: application/json

{
  "code": "PKR",
  "rate": 400.50
}
```

### Get All Currencies (Admin)
```
GET /api/currencies
```

## Database Schema

```javascript
{
  code: String,        // "PKR", "USD", etc.
  name: String,        // "Pakistani Rupee"
  symbol: String,      // "Rs", "$", etc.
  rate: Number,        // Conversion rate from GPA
  lastUpdated: Date,   // Last update timestamp
  isActive: Boolean,   // Enable/disable currency
  timestamps: true     // createdAt, updatedAt
}
```

## Files Modified

1. **src/models/currencyRate.js** - New model for currency rates
2. **src/middlewares/currencyMiddleware.js** - Fetches rates from database
3. **src/controllers/currencyController.js** - API endpoints for currency management
4. **src/controllers/pricingController.js** - Uses dynamic rates
5. **src/routes/pricingRoutes.js** - Added currency API routes
6. **view/pricing/pricing.ejs** - Fetches rates via AJAX
7. **currencySeeder.js** - Seeder script for initial data

## Benefits

✅ **No hardcoded rates** - All rates in database
✅ **Easy updates** - Change rates via API or database
✅ **Centralized** - Single source of truth
✅ **Scalable** - Add new currencies easily
✅ **Maintainable** - No code changes needed for rate updates
✅ **Audit trail** - Track when rates were last updated

## Adding New Currencies

1. Add to database:
```javascript
db.currencyrates.insertOne({
  code: "JPY",
  name: "Japanese Yen",
  symbol: "¥",
  rate: 190.50,
  isActive: true,
  lastUpdated: new Date()
})
```

2. Add country mapping in `currencyMiddleware.js`:
```javascript
const COUNTRY_CURRENCY_MAP = {
  'JP': 'JPY',  // Add this line
  // ... existing mappings
};

const CURRENCY_SYMBOLS = {
  'JPY': '¥',   // Add this line
  // ... existing symbols
};
```

3. Add to dropdown in `pricing.ejs`:
```html
<option value="JPY">🇯🇵 JPY - Japan</option>
```

## Troubleshooting

### Rates not loading
- Check MongoDB connection
- Run seeder script: `node currencySeeder.js`
- Check browser console for errors

### Wrong currency displayed
- Clear session cookies
- Check GeoIP detection in server logs
- Manually select currency from dropdown

### Rates not updating
- Verify API endpoint is accessible
- Check database write permissions
- Review server logs for errors

## Next Steps

1. **Run the seeder**: `node currencySeeder.js`
2. **Test the system**: Visit `/pricing` and try currency selector
3. **Update rates**: Use API endpoint to update rates as needed
4. **Monitor**: Check `lastUpdated` field to track rate freshness
