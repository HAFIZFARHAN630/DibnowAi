// Currency Display Utility (LinkedIn-style)
// Converts GPA to display currency for UI ONLY
// Backend always uses GPA

/**
 * Convert GPA price to display currency
 * @param {number} gpaPrice - Price in GPA (base currency)
 * @param {number} rate - Conversion rate from session
 * @returns {number} - Display price in local currency
 */
function convertToDisplay(gpaPrice, rate) {
  return parseFloat(gpaPrice) * rate;
}

/**
 * Format price for display with currency symbol
 * @param {number} gpaPrice - Price in GPA
 * @param {string} symbol - Currency symbol
 * @param {number} rate - Conversion rate
 * @returns {string} - Formatted price string
 */
function formatPrice(gpaPrice, symbol, rate) {
  const displayPrice = convertToDisplay(gpaPrice, rate);
  return `${symbol} ${displayPrice.toFixed(2)}`;
}

module.exports = { convertToDisplay, formatPrice };
