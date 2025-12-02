// Currency Detection Middleware (LinkedIn-style)
// Detects user country and sets display currency in session
// DOES NOT modify any backend logic or database

const CurrencyRate = require('../models/currencyRate');

let geoip;
try {
  geoip = require('geoip-lite');
} catch (err) {
  console.log('⚠️ geoip-lite not installed. Run: npm install');
  geoip = null;
}

// Country → Currency code mapping
const COUNTRY_CURRENCY_MAP = {
  'PK': 'PKR',
  'IN': 'INR',
  'US': 'USD',
  'GB': 'GBP',
  'CA': 'CAD',
  'AU': 'AUD',
  'DE': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'NL': 'EUR',
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  'PKR': 'Rs',
  'INR': '₹',
  'USD': '$',
  'GBP': '£',
  'EUR': '€',
  'CAD': 'C$',
  'AUD': 'A$'
};

const DEFAULT_CURRENCY = 'GBP';

// Get currency rate from database
async function getCurrencyRate(currencyCode) {
  try {
    const rate = await CurrencyRate.findOne({ code: currencyCode });
    return rate ? rate.rate : 1.0;
  } catch (err) {
    console.error(`Error fetching rate for ${currencyCode}:`, err.message);
    return 1.0;
  }
}

async function detectCurrency(req, res, next) {
  // Skip if already set in session
  if (req.session.displayCurrency) {
    return next();
  }

  try {
    // Get IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress;

    console.log(`🔍 Detecting currency for IP: ${ip}`);

    // Detect country from IP
    const geo = geoip ? geoip.lookup(ip) : null;
    const countryCode = geo?.country || 'GB';
    
    if (!geo) {
      console.log(`⚠️ GeoIP lookup failed (localhost/private IP). Using default: GB (GPA)`);
    }

    // Get currency code for country
    const currencyCode = COUNTRY_CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY;
    
    // Fetch rate from database
    const rate = await getCurrencyRate(currencyCode);
    
    req.session.userCountry = countryCode;
    req.session.displayCurrency = currencyCode;
    req.session.currencySymbol = CURRENCY_SYMBOLS[currencyCode] || 'Rs';
    req.session.conversionRate = rate;

    console.log(`🌍 Currency detected: ${countryCode} → ${currencyCode} (${CURRENCY_SYMBOLS[currencyCode]}) @ ${rate}`);
  } catch (err) {
    console.error('Currency detection error:', err.message);
    // Fallback to default
    req.session.displayCurrency = DEFAULT_CURRENCY;
    req.session.currencySymbol = CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
    req.session.conversionRate = 1.0;
  }

  next();
}

// Make currency available to all views
async function currencyLocals(req, res, next) {
  try {
    const currencyCode = req.session.displayCurrency || DEFAULT_CURRENCY;
    const rate = req.session.conversionRate || await getCurrencyRate(currencyCode);
    
    res.locals.displayCurrency = currencyCode;
    res.locals.currencySymbol = req.session.currencySymbol || CURRENCY_SYMBOLS[currencyCode] || 'Rs';
    res.locals.conversionRate = rate;
  } catch (err) {
    console.error('Currency locals error:', err.message);
    res.locals.displayCurrency = DEFAULT_CURRENCY;
    res.locals.currencySymbol = 'Rs';
    res.locals.conversionRate = 1.0;
  }
  next();
}

module.exports = { detectCurrency, currencyLocals };
