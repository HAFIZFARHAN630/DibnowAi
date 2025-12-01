const mongoose = require('mongoose');
const CurrencyRate = require('./src/models/currencyRate');
require('dotenv').config();

const currencies = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', rate: 397.1863 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 103.50 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.27 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 1.17 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.78 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.95 }
];

async function seedCurrencies() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dibnow');
    console.log('✅ Connected to MongoDB');

    for (const currency of currencies) {
      await CurrencyRate.findOneAndUpdate(
        { code: currency.code },
        currency,
        { upsert: true, new: true }
      );
      console.log(`✅ ${currency.code} - ${currency.name}: ${currency.rate}`);
    }

    console.log('\n✅ Currency rates seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding currencies:', error.message);
    process.exit(1);
  }
}

seedCurrencies();
