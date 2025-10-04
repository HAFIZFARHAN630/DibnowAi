require("dotenv").config();
const User = require("../models/user");
const PaymentSettings = require("../models/paymentSettings");
const paypal = require("paypal-rest-sdk");
const Stripe = require("stripe");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const planModel = require("../models/plan.model");
// Middleware to ensure user is logged in
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/sign_in");
  }
  next();
}

// Fetch all users and render pricing page
exports.allUsers = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;

      // Fetch current user and all users concurrently
      const [user, allUsers, paymentSettings] = await Promise.all([
        User.findById(userId).select(
          "first_name last_name phone_number email company address user_img country currency plan_name status denial_reason role"
        ),
        User.find(),
        PaymentSettings.find({ enabled: true }).lean()
      ]);

      if (!user) {
        return res.redirect("/sign_in");
      }

      const profileImagePath = user.user_img || "/uploads/default.png";

      // Map enabled gateways
      let enabledGateways = paymentSettings.map(s => {
        let gw = { name: s.gateway.charAt(0).toUpperCase() + s.gateway.slice(1), enabled: true, type: s.gateway };
        switch (s.gateway) {
          case 'bank':
            gw.instructions = s.credentials.instructions || 'Please transfer to Bank of Punjab Account: 1234567890. Reference your order ID.';
            break;
          case 'stripe':
            gw.publishable_key = s.credentials.publishable_key;
            gw.mode = s.mode;
            break;
          case 'paypal':
            gw.client_id = s.credentials.client_id;
            gw.mode = s.mode;
            break;
          case 'jazzcash':
            gw.merchant_id = s.credentials.merchant_id;
            gw.mode = s.mode;
            break;
          case 'payfast':
            gw.merchant_key = s.credentials.merchant_key;
            gw.mode = s.mode;
            break;
        }

        // Add instructions for manual payment gateways
        if (['jazzcash', 'payfast'].includes(s.gateway)) {
          const idKey = s.gateway === 'jazzcash' ? 'merchant_id' : 'merchant_key';
          gw.instructions = `Use ${s.gateway.toUpperCase()}: ${idKey.replace('_', ' ').toUpperCase()}: ${s.credentials[idKey] || 'Not set'}. Mode: ${s.mode}. Please complete the payment following the gateway's standard procedure and include your order reference for verification.`;
        }

        return gw;
      }).filter(Boolean);
  
      // Fallback if none enabled
      if (enabledGateways.length === 0) {
        enabledGateways = [];
        if (process.env.STRIPE_PUBLISHABLE_KEY) {
          enabledGateways.push({
            name: 'Stripe',
            enabled: true,
            type: 'stripe',
            publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
            mode: process.env.STRIPE_MODE || 'sandbox'
          });
        }
        if (process.env.PAYPAL_CLIENT_ID) {
          enabledGateways.push({
            name: 'PayPal',
            enabled: true,
            type: 'paypal',
            client_id: process.env.PAYPAL_CLIENT_ID,
            mode: process.env.PAYPAL_MODE || 'sandbox'
          });
        }
        enabledGateways.push({
          name: 'Bank',
          enabled: true,
          type: 'bank',
          instructions: 'Please transfer to our bank account. Details: Bank of Punjab, Account 1234567890. Reference order ID.'
        });
      }

      const plans = await planModel.find()
      res.render("pricing/pricing", {
        plans,
        profileImagePath,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        email: user.email,
        company: user.company,
        address: user.address,
        country: user.country,
        currency: user.currency,
        users: allUsers,
        user_id: userId,
        isUser: user.role === "user",
        plan_name: user.plan_name || "No Plan",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
        status: user.status,
        reson: user.denial_reason,
        enabledGateways: enabledGateways
      });
    } catch (error) {
      console.error("Error fetching pricing data:", error.message);
      return res.render("pricing/pricing", {
        users: [],
        error_msg: "Unable to load pricing data. Please try again.",
        success_msg: "",
      });
    }
  },
];

// Add Subscription Plan
exports.addSubscription = [
  ensureLoggedIn,
  async (req, res) => {
    const { plan, paymentMethod } = req.body;
  
    // Validate if plan is selected
    if (!plan) {
      return res.status(400).send("Please select a plan.");
    }
  
    // Validate if payment method is selected
    if (!paymentMethod) {
      return res.redirect("/pricing");
    }
  
    // Define plan prices
    const planPrices = {
      FREE_TRIAL: "0.00",
      BASIC: "20.88",
      STANDARD: "35.88",
      PREMIUM: "55.88",
    };
  
    // Validate if the selected plan is valid
    if (!planPrices[plan]) {
      return res.status(400).send("Invalid plan selected.");
    }
  
    const amount = planPrices[plan];
  
    // Validate supported payment methods
    if (!['stripe', 'paypal', 'jazzcash', 'payfast', 'wallet', 'bank', 'manual'].includes(paymentMethod)) {
       return res.status(400).send("Invalid payment method.");
     }
  
    try {
       let gatewaySettings;
       if (paymentMethod === 'stripe' || paymentMethod === 'paypal') {
         // First try to get from database
         gatewaySettings = await PaymentSettings.findOne({ gateway: paymentMethod }).lean();

         // For Stripe, prioritize environment variables if they exist and are valid
         if (paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length >= 20) {
           console.log("Using Stripe env vars - Secret key length:", process.env.STRIPE_SECRET_KEY?.length || 0);
           console.log("Stripe Secret Key (first 20 chars):", process.env.STRIPE_SECRET_KEY?.substring(0, 20) + "...");
           gatewaySettings = {
             mode: process.env.STRIPE_MODE || 'live',
             credentials: { secret_key: process.env.STRIPE_SECRET_KEY }
           };
         } else if (paymentMethod === 'paypal' && process.env.PAYPAL_CLIENT_SECRET) {
           gatewaySettings = {
             mode: process.env.PAYPAL_MODE || 'sandbox',
             credentials: {
               client_id: process.env.PAYPAL_CLIENT_ID,
               client_secret: process.env.PAYPAL_CLIENT_SECRET
             }
           };
         } else if (!gatewaySettings || !gatewaySettings.enabled) {
           // Final fallback to env vars for Stripe
           if (paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY) {
             console.log("Using Stripe env vars as fallback - Secret key length:", process.env.STRIPE_SECRET_KEY?.length || 0);
             gatewaySettings = {
               mode: process.env.STRIPE_MODE || 'live',
               credentials: { secret_key: process.env.STRIPE_SECRET_KEY }
             };
           } else {
             console.error(`${paymentMethod} gateway not configured. STRIPE_SECRET_KEY exists:`, !!process.env.STRIPE_SECRET_KEY);
             return res.status(400).send(`${paymentMethod} gateway not configured.`);
           }
         }
       }
  
      if (paymentMethod === 'stripe') {
        const secretKey = gatewaySettings.credentials.secret_key;

        // Validate the secret key
        if (!secretKey || secretKey.length < 20) {
          console.error("Invalid Stripe secret key detected:", {
            length: secretKey?.length || 0,
            key: secretKey?.substring(0, 10) + "..."
          });
          return res.status(500).send("Stripe configuration error. Please contact support.");
        }

        console.log("Initializing Stripe with key length:", secretKey.length);
        const stripeInstance = new Stripe(secretKey);

        const session = await stripeInstance.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "gbp",
                product_data: { name: plan },
                unit_amount: Math.round(parseFloat(amount) * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.APP_BASE_URL}/success?plan=${plan}&gateway=${paymentMethod}`,
          cancel_url: `${process.env.APP_BASE_URL}/cancel`,
        });

        res.redirect(302, session.url);
      } else if (paymentMethod === 'paypal') {
        paypal.configure({
          mode: gatewaySettings.mode,
          client_id: gatewaySettings.credentials.client_id,
          client_secret: gatewaySettings.credentials.client_secret,
        });

        const create_payment_json = {
          intent: "sale",
          payer: { payment_method: "paypal" },
          redirect_urls: {
            return_url: `${process.env.APP_BASE_URL}/success?plan=${plan}&gateway=${paymentMethod}`,
            cancel_url: `${process.env.APP_BASE_URL}/cancel`,
          },
          transactions: [
            {
              item_list: {
                items: [
                  {
                    name: plan,
                    sku: plan,
                    price: amount,
                    currency: "GBP",
                    quantity: 1,
                  },
                ],
              },
              amount: { currency: "GBP", total: amount },
              description: `Payment for the ${plan} plan.`,
            },
          ],
        };
  
        paypal.payment.create(create_payment_json, (error, payment) => {
          if (error) {
            console.error("PayPal payment creation error:", error.message);
            return res
              .status(500)
              .send("Error creating PayPal payment. Please try again later.");
          }

          const approvalUrl = payment.links.find(
            (link) => link.rel === "approval_url"
          );
          if (approvalUrl) {
            return res.redirect(302, approvalUrl.href);
          } else {
            console.error("Approval URL not found in PayPal response");
            return res.status(500).send("Error retrieving approval URL");
          }
        });
      } else if (paymentMethod === 'payfast') {
        try {
          // Get PayFast settings from database or environment
          let payfastSettings = await PaymentSettings.findOne({ gateway: 'payfast' }).lean();

          if (!payfastSettings || !payfastSettings.enabled) {
            // Use environment variables as fallback
            if (process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_SECURED_KEY) {
              payfastSettings = {
                mode: process.env.PAYFAST_MODE || 'live',
                credentials: {
                  merchant_id: process.env.PAYFAST_MERCHANT_ID,
                  merchant_key: process.env.PAYFAST_SECURED_KEY
                }
              };
            } else {
              console.error("PayFast not configured");
              return res.status(400).send("PayFast gateway not configured.");
            }
          }

          // Create PayFast payment form
          const payfastData = {
            merchant_id: payfastSettings.credentials.merchant_id,
            merchant_key: payfastSettings.credentials.merchant_key,
            return_url: `${process.env.APP_BASE_URL}/success?plan=${plan}&gateway=payfast`,
            cancel_url: `${process.env.APP_BASE_URL}/cancel`,
            notify_url: `${process.env.APP_BASE_URL}/payfast-webhook`,
            name_first: 'Customer',
            name_last: 'Name',
            email_address: 'customer@example.com',
            m_payment_id: `plan_${plan}_${Date.now()}`,
            amount: amount,
            item_name: `${plan} Plan`,
            item_description: `Payment for ${plan} subscription plan`,
            custom_int1: req.session.userId,
            custom_str1: plan
          };

          // Generate signature for PayFast
          const signatureString = Object.keys(payfastData)
            .filter(key => payfastData[key] !== '')
            .sort()
            .map(key => `${key}=${encodeURIComponent(payfastData[key]).replace(/%20/g, '+')}`)
            .join('&');

          const crypto = require('crypto');
          const signature = crypto.createHash('md5').update(signatureString).digest('hex');

          // Render PayFast payment form
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>PayFast Payment</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .payment-form { max-width: 400px; margin: 0 auto; }
                .btn { background: #ff6600; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="payment-form">
                <h2>PayFast Payment</h2>
                <p>Plan: ${plan}</p>
                <p>Amount: £${amount}</p>
                <form action="https://ipg1.apps.net.pk/Ecommerce/api/Transaction" method="post" name="payfast_form">
                  ${Object.entries(payfastData).map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join('')}
                  <input type="hidden" name="signature" value="${signature}">
                  <button type="submit" class="btn">Pay with PayFast</button>
                </form>
                <script>document.payfast_form.submit();</script>
              </div>
            </body>
            </html>
          `;

          res.send(html);
        } catch (error) {
          console.error("PayFast payment error:", error.message);
          req.flash("error_msg", "Failed to process PayFast payment. Please try again.");
          res.redirect("/pricing");
        }
      } else if (paymentMethod === 'wallet') {
        try {
          const wallet = await Wallet.findOne({ user: req.session.userId });
          if (!wallet || wallet.balance < parseFloat(amount)) {
            req.flash("error_msg", "Insufficient wallet balance. Please top-up first.");
            return res.redirect("/pricing");
          }
    
          // Deduct from balance
          wallet.balance -= parseFloat(amount);
          await wallet.save();
    
          // Create payment record
          const startDate = new Date();
          const expiryDate = new Date(startDate);
          expiryDate.setDate(expiryDate.getDate() + 30);
    
          const Payments = require("../models/payments");
          const newPayment = new Payments({
            user: req.session.userId,
            plan,
            amount: parseFloat(amount),
            gateway: paymentMethod,
            startDate,
            expiryDate,
            status: 'active'
          });
    
          await newPayment.save();
    
          // Update user plan
          await User.findByIdAndUpdate(req.session.userId, { plan_name: plan });
    
          // Update plan limits
          await subscribePlan(req.session.userId, plan);
    
          // Create transaction record
          const newTransaction = new Transaction({
            user: req.session.userId,
            type: 'payment',
            amount: parseFloat(amount),
            status: 'success'
          });
          await newTransaction.save();
    
          // Create notification
          if (req.app.locals.notificationService) {
            const user = await User.findById(req.session.userId).select('first_name');
            if (user) {
              await req.app.locals.notificationService.createNotification(
                req.session.userId,
                user.first_name,
                "Buy Plan"
              );
            }
          }
    
          req.flash(
            "success_msg",
            `Your ${plan} plan has been activated using wallet balance.`
          );
          res.redirect("/index");
        } catch (error) {
          console.error("Wallet payment error:", error.message);
          req.flash("error_msg", "Failed to process wallet payment. Please try again.");
          res.redirect("/pricing");
        }
      } else if (paymentMethod === 'bank') {
        // Bank transfer - redirect to manual payment form
        req.session.pendingPayment = { plan, amount: parseFloat(amount) };
        req.flash("info_msg", `Please complete the bank transfer for ${plan} plan. Amount: £${amount}`);
        res.redirect("/transfer");
      } else {
        // Manual gateways: jazzcash, payfast - Create pending plan request for admin verification
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 30);

        const PlanRequest = require("../models/planRequest");
        const newPlanRequest = new PlanRequest({
          user: req.session.userId,
          planName: plan,
          amount: parseFloat(amount),
          gateway: paymentMethod,
          startDate,
          expiryDate,
          status: 'Pending',
          invoiceStatus: 'Unpaid',
          description: `Manual payment via ${paymentMethod.toUpperCase()} - awaiting admin verification`
        });

        await newPlanRequest.save();

        // Create transaction record for manual payment (pending status)
        const newTransaction = new Transaction({
          user: req.session.userId,
          type: 'payment',
          amount: parseFloat(amount),
          status: 'pending'
        });
        await newTransaction.save();

        // Create notification
        if (req.app.locals.notificationService) {
          const user = await User.findById(req.session.userId).select('first_name');
          if (user) {
            await req.app.locals.notificationService.createNotification(
              req.session.userId,
              user.first_name,
              "Manual Payment Pending"
            );
          }
        }

        req.flash(
          "success_msg",
          `Your manual payment for ${plan} plan has been submitted. Please wait for admin verification before your package is activated.`
        );
        res.redirect("/index");
      }
    } catch (error) {
      console.error("Payment processing error:", error.message);
      return res
        .status(500)
        .send("Error processing payment. Please try again later.");
    }
  },
];
// Handle payment success
exports.paymentSuccess = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const plan = req.query.plan;
      const gateway = req.query.gateway;
      const userId = req.session.userId;

      if (!plan || !gateway) {
        return res.redirect("/pricing");
      }

      const Payments = require("../models/payments");
      const User = require("../models/user");

      // Create Payments record
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

      const planPrices = {
        BASIC: 20.88,
        STANDARD: 35.88,
        PREMIUM: 55.88,
      };

      const amount = planPrices[plan] || 0;

      const newPayment = new Payments({
        user: userId,
        plan,
        amount,
        gateway,
        startDate,
        expiryDate,
        status: 'active'
      });

      await newPayment.save();

      // Update the plan_name in the database
      await User.findByIdAndUpdate(userId, { plan_name: plan });

      // Now, update the plan_limit based on the selected plan
      await subscribePlan(userId, plan);

      // Create transaction record for payment
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount,
        status: 'success'
      });
      await newTransaction.save();

      // Create notification for buying a plan
      if (req.app.locals.notificationService) {
        const user = await User.findById(userId).select('first_name');
        if (user) {
          await req.app.locals.notificationService.createNotification(
            userId,
            user.first_name,
            "Buy Plan"
          );
        }
      }

      req.flash(
        "success_msg",
        `Your subscription plan has been updated to ${plan}.`
      );
      res.redirect("/index");
    } catch (error) {
      console.error("Payment success error:", error.message);
      req.flash("error_msg", "Error updating subscription. Please try again.");
      res.redirect("/pricing");
    }
  },
];

// Function to subscribe and update plan limits
async function subscribePlan(userId, planType) {
  try {
    let planLimit;

    // Determine the plan limit based on the selected plan
    switch (planType) {
      case "BASIC":
        planLimit = 300;
        break;
      case "STANDARD":
        planLimit = 500;
        break;
      case "PREMIUM":
        planLimit = 1000;
        break;
      case "FREE_TRIAL":
      default:
        planLimit = 30;
        break;
    }

    // Retrieve the current plan limit from the database
    const user = await User.findById(userId).select("plan_limit");
    if (!user) {
      console.log("User not found");
      return;
    }

    const currentPlanLimit = user.plan_limit || 0;
    const newPlanLimit = currentPlanLimit + planLimit;
    
    await User.findByIdAndUpdate(userId, { plan_limit: newPlanLimit });
    console.log(`User's plan limit updated to: ${newPlanLimit}`);
  } catch (error) {
    console.error("Error updating plan limit:", error.message);
  }
}

// Handle payment cancellation
exports.paymentCancel = [
  ensureLoggedIn,
  (req, res) => {
    req.flash("error_msg", "Payment canceled.");
    res.redirect("/pricing");
  },
];

// Handle Free Trial Plan selection
exports.freeTrial = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;

      // Update the user's plan to "FREE_TRIAL"
      await User.findByIdAndUpdate(userId, { plan_name: "FREE TRIAL" });

      // Send a success response
      res.json({ success: true });
    } catch (error) {
      console.error("Free trial error:", error.message);
      res.json({ success: false, message: "Error updating plan" });
    }
  },
];

// Get plan prices from backend
exports.getPlanPrices = async (req, res) => {
  try {
    const planPrices = {
      FREE_TRIAL: "0.00",
      BASIC: "20.88",
      STANDARD: "35.88",
      PREMIUM: "55.88",
    };

    // Add PKR conversions (1 GBP = 397.1863 PKR with 4% fee)
    const gbpToPkrRate = 397.1863;
    const planPricesPkr = {};

    Object.keys(planPrices).forEach(plan => {
      const gbpAmount = parseFloat(planPrices[plan]);
      const pkrAmount = gbpAmount * gbpToPkrRate;
      planPricesPkr[plan] = pkrAmount.toFixed(2);
    });

    res.json({
      success: true,
      planPrices: planPrices,
      planPricesPkr: planPricesPkr,
      conversionRate: {
        gbp: 1,
        pkr: gbpToPkrRate,
        note: "Includes 4% conversion fee"
      }
    });
  } catch (error) {
    console.error("Error fetching plan prices:", error.message);
    res.json({
      success: false,
      message: "Error fetching plan prices"
    });
  }
};

// Backend route to handle the subscription
exports.handleSubscription = async (req, res) => {
  try {
    const { plan, paymentMethod } = req.body;
    const subscriptionDate = new Date();
    const userId = req.session.userId;

    await User.findByIdAndUpdate(userId, {
      plan_name: plan,
      payment_method: paymentMethod,
      subscription_date: subscriptionDate
    });

    res.send("Subscription successful!");
  } catch (error) {
    console.error("Subscription error:", error.message);
    res.status(500).send("Subscription failed");
  }
};

exports.upgradePlan = async (req, res) => {
  try {
    const userId = req.session.userId;
    const payment_method = req.body.paymentMethod;

    await User.findByIdAndUpdate(userId, {
      payment_method,
      subscription_date: new Date()
    });

    res.send("Subscription upgraded successfully!");
  } catch (error) {
    console.error("Error updating subscription:", error.message);
    res.status(500).send("Database error");
  }
};

// Corrected Route for Inserting Data
exports.insertTransfer = async (req, res) => {
  try {
    const { transfer_id, amount } = req.body;
    const userId = req.session.userId;

    if (!transfer_id || !amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User not logged in" });
    }

    const PlanRequest = require("../models/planRequest");
    const User = require("../models/user");

    // Get pending payment from session if any
    const pendingPayment = req.session.pendingPayment;
    const plan = pendingPayment ? pendingPayment.plan : 'BASIC'; // default if no pending

    // Create PlanRequest record for bank transfer (pending admin verification)
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

    const newPlanRequest = new PlanRequest({
      user: userId,
      planName: plan,
      amount: parseFloat(amount),
      gateway: 'bank',
      startDate,
      expiryDate,
      status: 'Pending',
      invoiceStatus: 'Unpaid',
      description: `Bank transfer payment - awaiting admin verification. Transfer ID: ${transfer_id}`
    });

    await newPlanRequest.save();

    // Update transfer details in user record but don't activate plan yet
    await User.findByIdAndUpdate(userId, {
      transfer_id,
      amount: parseFloat(amount)
    });

    // Create transaction record for bank transfer payment (pending status)
    const newTransaction = new Transaction({
      user: userId,
      type: 'payment',
      amount: parseFloat(amount),
      status: 'pending'
    });
    await newTransaction.save();

    // Clear session pending
    delete req.session.pendingPayment;

    req.flash("success_msg", "Bank transfer recorded successfully. Please wait for admin verification before your package is activated.");
    res.redirect("/index");
  } catch (error) {
    console.error("Error updating transfer data:", error.message);
    req.flash("error_msg", "Failed to process bank transfer. Please try again.");
    res.redirect("/pricing");
  }
};


