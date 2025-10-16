/**
 * Currency conversion utilities for the application
 */

/**
 * Convert PKR to GPA (Gold Price Adjustment) currency
 * This function implements the GPA conversion logic used for PayFast payments
 * @param {number} pkrAmount - Amount in PKR
 * @returns {number} - Amount in GPA currency
 */
function convertToGPA(pkrAmount) {
  // GPA conversion logic - GBP to PKR conversion for all payment gateways
  // Using rate that includes 4% conversion fee: 1 GBP = 397.1863 PKR
  const conversionRate = 397.1863; // 1 GBP = 397.1863 PKR (includes 4% fee)

  return parseFloat(pkrAmount) * conversionRate;
}

/**
 * Convert GPA back to PKR for display purposes
 * @param {number} gpaAmount - Amount in GPA
 * @returns {number} - Amount in PKR
 */
function convertFromGPA(gpaAmount) {
  // Reverse conversion logic - PKR to GBP
  const conversionRate = 397.1863; // Should match the rate in convertToGPA (1 GBP = 397.1863 PKR)

  return parseFloat(gpaAmount) / conversionRate;
}

/**
 * Get current GPA conversion rate
 * @returns {number} - Current conversion rate
 */
function getGPAConversionRate() {
  return 397.1863; // GBP to PKR conversion rate (1 GBP = 397.1863 PKR - includes 4% fee)
}

module.exports = {
  convertToGPA,
  convertFromGPA,
  getGPAConversionRate
};