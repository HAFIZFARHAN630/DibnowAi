const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, enum: ["Repair", "Inventory", "Sales"], default: "Repair" },
  status: { type: String, enum: ["Open", "In-Progress", "Closed"], default: "Open" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  closedAt: { type: Date, default: null }
}, { timestamps: true });

// Important: export model (not schema!)
module.exports = mongoose.model("Ticket", ticketSchema);