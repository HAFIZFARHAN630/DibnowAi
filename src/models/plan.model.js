// models/plann.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const plannSchema = new Schema({
    plan_name:{type:String},
    plan_price:{type:Number},
    plan_limit:{type:String},
  repairCustomer: { type: String },
  inStock:        { type: String },
  category:       { type: String },
  brand:          { type: String },
  teams:          { type: String }
});

module.exports = mongoose.model('planns', plannSchema);
