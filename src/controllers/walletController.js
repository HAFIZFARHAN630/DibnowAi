const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const User = require("../models/user");
const Stripe = require("stripe");
const mongoose = require("mongoose");
require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to ensure user is logged in
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/sign_in");
  }
  next();
}

// Get wallet page
exports.getWallet = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;

      const user = await User.findById(userId).select('first_name last_name email user_img role');
      if (!user) {
        req.flash("error_msg", "User not found. Please log in again.");
        return res.redirect("/sign_in");
      }

      // Find or create wallet
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0 });
        await wallet.save();
      }

      // Fetch recent 5 transactions
      const recentTransactions = await Transaction.find({ user: userId })
        .sort({ date: -1 })
        .limit(5)
        .populate('user', 'first_name last_name');

      const profileImagePath = user.user_img ? `/uploads/${user.user_img}` : '/img/dumi img.png';

      res.render("wallet/wallet", {
        balance: wallet.balance,
        recentTransactions,
        profileImagePath,
        firstName: user.first_name,
        email: user.email,
        isAdmin: user.role === 'admin',
        isUser: user.role !== 'admin',
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (error) {
      console.error("Error fetching wallet:", error.message);
      req.flash("error_msg", "Failed to load wallet. Please try again.");
      res.redirect("/wallet");
    }
  }
];

// Get full transaction history
exports.getHistory = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;

      const user = await User.findById(userId).select('first_name email user_img role');
      if (!user) {
        req.flash("error_msg", "User not found. Please log in again.");
        return res.redirect("/sign_in");
      }

      const transactions = await Transaction.find({ user: userId })
        .sort({ date: -1 })
        .populate('user', 'first_name last_name');

      const profileImagePath = user.user_img ? `/uploads/${user.user_img}` : '/img/dumi img.png';

      res.render("wallet/history", {
        transactions,
        profileImagePath,
        firstName: user.first_name,
        email: user.email,
        isAdmin: user.role === 'admin',
        isUser: user.role !== 'admin',
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (error) {
      console.error("Error fetching history:", error.message);
      req.flash("error_msg", "Failed to load history. Please try again.");
      res.redirect("/wallet/history");
    }
  }
];

// Get top-up form
exports.getTopup = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;

      const user = await User.findById(userId).select('first_name email user_img role');
      if (!user) {
        req.flash("error_msg", "User not found. Please log in again.");
        return res.redirect("/sign_in");
      }

      const profileImagePath = user.user_img ? `/uploads/${user.user_img}` : '/img/dumi img.png';

      res.render("wallet/topup", {
        profileImagePath,
        firstName: user.first_name,
        email: user.email,
        isAdmin: user.role === 'admin',
        isUser: user.role !== 'admin',
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (error) {
      console.error("Error fetching topup page:", error.message);
      req.flash("error_msg", "Failed to load top-up page. Please try again.");
      res.redirect("/wallet");
    }
  }
];

// Post top-up (create Stripe session)
exports.postTopup = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const { amount } = req.body;
      const userId = req.session.userId;

      if (!amount || amount <= 0) {
        req.flash("error_msg", "Invalid amount.");
        return res.redirect("/wallet/topup");
      }

      const stripeInstance = stripe;
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: { name: "Wallet Top-up" },
              unit_amount: Math.round(parseFloat(amount) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_BASE_URL}/wallet/topup-success?amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_BASE_URL}/wallet/topup`,
      });

      res.redirect(302, session.url);
    } catch (error) {
      console.error("Top-up error:", error.message);
      req.flash("error_msg", "Failed to process top-up. Please try again.");
      res.redirect("/wallet/topup");
    }
  }
];

// Top-up success (update wallet and transaction)
exports.topupSuccess = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const { amount } = req.query;
      const userId = req.session.userId;

      if (!amount) {
        req.flash("error_msg", "Invalid top-up amount.");
        return res.redirect("/wallet");
      }

      // Find wallet
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0 });
        await wallet.save();
      }

      // Update balance
      wallet.balance += parseFloat(amount);
      await wallet.save();

      // Create transaction
      const newTransaction = new Transaction({
        user: userId,
        type: 'topup',
        amount: parseFloat(amount),
        status: 'success'
      });
      await newTransaction.save();

      req.flash("success_msg", `Top-up successful! Added £${amount} to your wallet.`);
      res.redirect("/wallet");
    } catch (error) {
      console.error("Top-up success error:", error.message);
      req.flash("error_msg", "Failed to update wallet. Please contact support.");
      res.redirect("/wallet");
    }
  }
];

// Get saved cards
exports.getSavedCards = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId).select('email stripe_customer_id first_name user_img role');
      if (!user) {
        return res.redirect("/sign_in");
      }

      let customerId = user.stripe_customer_id;
      let savedCards = [];

      if (!customerId) {
        const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
        const customer = await stripeInstance.customers.create({
          email: user.email,
          metadata: { user_id: userId.toString() }
        });
        customerId = customer.id;
        await User.findByIdAndUpdate(userId, { stripe_customer_id: customerId });
      } else {
        const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
        const paymentMethods = await stripeInstance.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });

        savedCards = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year
        }));
      }

      // Create setup intent for adding new card
      const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
      const setupIntent = await stripeInstance.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
      });
      const clientSecret = setupIntent.client_secret;

      const profileImagePath = user.user_img ? `/uploads/${user.user_img}` : '/img/dumi img.png';

      res.render("wallet/saved-cards", {
        savedCards,
        stripePublishKey: process.env.STRIPE_PUBLISHABLE_KEY,
        clientSecret,
        profileImagePath,
        firstName: user.first_name,
        email: user.email,
        isAdmin: user.role === 'admin',
        isUser: user.role !== 'admin',
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (error) {
      console.error("Error fetching saved cards:", error.message);
      req.flash("error_msg", "Failed to load saved cards. Please try again.");
      res.redirect("/wallet");
    }
  }
];

// Add saved card
exports.addSavedCard = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { payment_method_id } = req.body;

      if (!payment_method_id) {
        return res.status(400).json({ success: false, error: "Payment method ID required." });
      }

      const user = await User.findById(userId);
      if (!user.stripe_customer_id) {
        return res.status(400).json({ success: false, error: "Customer not set up." });
      }

      const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

      // Attach payment method to customer
      await stripeInstance.paymentMethods.attach(payment_method_id, {
        customer: user.stripe_customer_id,
      });

      // Set as default payment method
      await stripeInstance.customers.update(user.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });

      res.json({ success: true, message: "Card saved successfully!" });
    } catch (error) {
      console.error("Error adding saved card:", error.message);
      res.status(400).json({ success: false, error: "Failed to save card." });
    }
  }
];

// Delete saved card
exports.deleteSavedCard = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const user = await User.findById(userId);
      if (!user.stripe_customer_id) {
        return res.status(400).json({ success: false, error: "Customer not set up." });
      }

      const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
      await stripeInstance.paymentMethods.detach(id);

      res.json({ success: true, message: "Card deleted successfully!" });
    } catch (error) {
      console.error("Error deleting saved card:", error.message);
      res.status(400).json({ success: false, error: "Failed to delete card." });
    }
  }
];

// Top-up with saved payment method
exports.topupWithSavedCard = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { amount, paymentMethodId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: "Invalid amount." });
      }

      if (!paymentMethodId) {
        return res.status(400).json({ success: false, error: "Payment method required." });
      }

      const user = await User.findById(userId);
      if (!user.stripe_customer_id) {
        return res.status(400).json({ success: false, error: "Customer not set up." });
      }

      const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

      // Create payment intent with saved payment method
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to pence
        currency: "gbp",
        customer: user.stripe_customer_id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          user_id: userId.toString(),
          type: 'wallet_topup'
        }
      });

      // Update wallet balance
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0 });
        await wallet.save();
      }

      wallet.balance += parseFloat(amount);
      await wallet.save();

      // Create transaction record
      const newTransaction = new Transaction({
        user: userId,
        type: 'topup',
        amount: parseFloat(amount),
        status: paymentIntent.status === 'succeeded' ? 'success' : 'failed',
        payment_intent_id: paymentIntent.id
      });
      await newTransaction.save();

      if (paymentIntent.status === 'succeeded') {
        res.json({
          success: true,
          message: `Successfully added £${amount} to your wallet!`,
          newBalance: wallet.balance
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Payment failed. Please try again."
        });
      }
    } catch (error) {
      console.error("Error in topup with saved card:", error.message);
      res.status(400).json({
        success: false,
        error: "Failed to process payment. Please try again."
      });
    }
  }
];