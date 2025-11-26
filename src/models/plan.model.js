// models/plann.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const plannSchema = new Schema({
    plan_name:{type:String},
    plan_price:{type:Number, default: 0},
    plan_limit:{type:String},
  repairCustomer: { type: String },
  inStock:        { type: String },
  category:    { type: Number, default: 0 },
  brand:      { type: Number, default: 0 },
  teams:          { type: String }
});

module.exports = mongoose.model('planns', plannSchema);
