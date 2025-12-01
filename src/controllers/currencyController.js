const CurrencyRate = require('../models/currencyRate');

// Get all active currency rates
exports.getCurrencyRates = async (req, res) => {
  try {
    const rates = await CurrencyRate.find({ isActive: true }).select('code symbol rate');
    
    const ratesMap = {};
    rates.forEach(rate => {
      ratesMap[rate.code] = {
        symbol: rate.symbol,
        rate: rate.rate
      };
    });
    
    res.json({
      success: true,
      rates: ratesMap
    });
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.json({
      success: false,
      message: 'Failed to fetch currency rates'
    });
  }
};

// Update currency rate (admin only)
exports.updateCurrencyRate = async (req, res) => {
  try {
    const { code, rate } = req.body;
    
    if (!code || !rate || rate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency code or rate'
      });
    }
    
    const updated = await CurrencyRate.findOneAndUpdate(
      { code: code.toUpperCase() },
      { rate: parseFloat(rate), lastUpdated: new Date() },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    res.json({
      success: true,
      message: `${code} rate updated to ${rate}`,
      currency: updated
    });
  } catch (error) {
    console.error('Error updating currency rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update currency rate'
    });
  }
};

// Get all currencies (admin view)
exports.getAllCurrencies = async (req, res) => {
  try {
    const currencies = await CurrencyRate.find().sort({ code: 1 });
    res.json({
      success: true,
      currencies
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currencies'
    });
  }
};
