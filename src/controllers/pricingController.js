require("dotenv").config();
const User = require("../models/user");
const PaymentSettings = require("../models/paymentSettings");
const paypal = require("paypal-rest-sdk");
const Stripe = require("stripe");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const planModel = require("../models/plan.model");
const PlanRequest = require("../models/planRequest");
const payfastController = require("./payfastController");
// Removed: const payfastHppController = require("./payfastHppController");
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

      // Fetch current user, all users, payment settings, and wallet balance concurrently
      const [user, allUsers, paymentSettings, wallet] = await Promise.all([
        User.findById(userId).select(
          "first_name last_name phone_number email company address user_img country currency plan_name status denial_reason role"
        ),
        User.find(),
        PaymentSettings.find({ enabled: true }).lean(),
        Wallet.findOne({ user: userId }).select("balance")
      ]);

      if (!user) {
        return res.redirect("/sign_in");
      }

      const profileImagePath = user.user_img || "/uploads/default.png";

      // Map enabled gateways
      let enabledGateways = paymentSettings.map(s => {
        let gw = { name: s.gateway.charAt(0).toUpperCase() + s.gateway.slice(1), enabled: true, type: s.gateway };
        switch (s.gateway) {
          case 'stripe':
            gw.publishable_key = s.credentials.publishable_key;
            gw.mode = s.mode;
            break;
          case 'paypal':
            gw.client_id = s.credentials.client_id;
            gw.mode = s.mode;
            break;
          case 'payfast':
            gw.merchant_key = s.credentials.merchant_key;
            gw.mode = s.mode;
            break;
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
      }

      console.log('🏠 Rendering pricing page - fetching plans from database...');
      const plans = await planModel.find()

      console.log(`📋 Rendering pricing page with ${plans.length} plans:`);
      plans.forEach(plan => {
        console.log(`  - ${plan.plan_name}: ${plan.plan_price} (type: ${typeof plan.plan_price})`);
      });

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
        enabledGateways: enabledGateways,
        walletBalance: wallet ? wallet.balance : 0
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
    let { plan, paymentMethod, transfer_id, amount } = req.body;
  
    // Handle array values (if form submits duplicates)
    if (Array.isArray(plan)) plan = plan[0];
    if (Array.isArray(paymentMethod)) paymentMethod = paymentMethod[0];
    
    console.log('📋 Payment Request:', { plan, paymentMethod, transfer_id, amount });
  
    // Validate if plan is selected
    if (!plan) {
      return res.status(400).send("Please select a plan.");
    }
  
    // Validate if payment method is selected
    if (!paymentMethod) {
      return res.redirect("/pricing");
    }
  
    // Get plan price from database for the selected plan
    console.log(`🔍 Looking for plan: "${plan}" in database...`);

    // Try multiple approaches to find the plan
    let selectedPlan;

    // 1. Try exact match first (case-sensitive)
    selectedPlan = await planModel.findOne({ plan_name: plan });

    // 2. If not found, try case-insensitive search
    if (!selectedPlan) {
      console.log(`🔄 Plan not found with exact match, trying case-insensitive...`);
      selectedPlan = await planModel.findOne({
        plan_name: { $regex: new RegExp(`^${plan}$`, 'i') }
      });
    }

    // 3. If still not found, try partial match (contains)
    if (!selectedPlan) {
      console.log(`🔄 Plan not found with case-insensitive, trying partial match...`);
      selectedPlan = await planModel.findOne({
        plan_name: { $regex: plan, $options: 'i' }
      });
    }

    // 4. If still not found, try uppercase match
    if (!selectedPlan) {
      console.log(`🔄 Plan not found with partial match, trying uppercase...`);
      selectedPlan = await planModel.findOne({
        plan_name: plan.toUpperCase()
      });
    }

    if (!selectedPlan) {
      console.error(`❌ Plan not found in database: "${plan}"`);
      console.log(`📋 Available plans in database:`);
      const allPlans = await planModel.find({}, 'plan_name plan_price');
      allPlans.forEach(p => console.log(`  - ${p.plan_name}: ${p.plan_price}`));
      return res.status(400).json({
        success: false,
        message: `Plan "${plan}" not found. Please contact administrator.`
      });
    }

    console.log(`📋 Raw plan data from database:`, {
      plan_name: selectedPlan.plan_name,
      plan_price: selectedPlan.plan_price,
      plan_price_type: typeof selectedPlan.plan_price,
      plan_price_length: selectedPlan.plan_price ? selectedPlan.plan_price.length : 'null',
      plan_limit: selectedPlan.plan_limit
    });

    const expectedAmount = parseFloat(selectedPlan.plan_price) || 0;
    console.log(`✅ Found plan: ${plan}`);
    console.log(`📋 Plan processing (GPA):`, {
      raw_plan_price: selectedPlan.plan_price,
      parseFloat_result: parseFloat(selectedPlan.plan_price),
      expectedAmount: expectedAmount,
      isNaN: isNaN(expectedAmount)
    });

    // Allow Free Trial with $0 price, but validate other plans
    if (expectedAmount === 0 && plan.toLowerCase() !== 'free trial') {
      console.error(`❌ Plan ${plan} has zero price in database`);
      console.error(`📋 Plan data:`, {
        plan_name: selectedPlan.plan_name,
        plan_price: selectedPlan.plan_price,
        plan_price_type: typeof selectedPlan.plan_price,
        plan_price_length: selectedPlan.plan_price ? selectedPlan.plan_price.length : 'null/undefined'
      });

      return res.status(400).json({
        success: false,
        message: `Plan "${plan}" has invalid price (${selectedPlan.plan_price}). Please contact administrator.`
      });
    }

    // Free Trial special handling
    if (plan.toLowerCase() === 'free trial' && expectedAmount === 0) {
      console.log(`✅ Free Trial plan detected - allowing $0 price`);
    }

    const submittedAmount = parseFloat(amount);

    // Validate supported payment methods
    if (!['stripe', 'paypal', 'payfast', 'wallet', 'manual'].includes(paymentMethod)) {
        return res.status(400).send("Invalid payment method.");
      }

    // Handle manual payment with transaction details
    if (paymentMethod === 'manual') {
      // Free Trial doesn't require transfer_id
      if (!transfer_id && plan.toLowerCase() !== 'free trial') {
        req.flash("error_msg", "Transaction ID is required for manual payment.");
        return res.redirect("/pricing");
      }
      
      // Auto-fill amount if not provided
      if (!amount || amount === '') {
        amount = expectedAmount; // Use GPA price from database
        console.log(`✅ Auto-filled amount for ${plan}: ${amount} (GPA)`);
      }

      // Validate amount is not less than plan price (skip for Free Trial)
      if (submittedAmount < expectedAmount && plan.toLowerCase() !== 'free trial') {
        req.flash("error_msg",
          `Amount too low! Plan requires £${expectedAmount} but you entered £${submittedAmount}. Please enter the correct amount or contact admin if you have a discount.`
        );
        return res.redirect("/pricing");
      }

      try {
        const PlanRequest = require("../models/planRequest");
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Free Trial auto-activates, others need admin approval
        const isFreeTrialPlan = plan.toLowerCase() === 'free trial';
        const planStatus = isFreeTrialPlan ? 'Active' : 'Pending';
        const invoiceStatus = isFreeTrialPlan ? 'Paid' : 'Unpaid';

        const newPlanRequest = new PlanRequest({
          user: req.session.userId,
          planName: plan,
          amount: parseFloat(amount),
          startDate,
          expiryDate,
          status: planStatus,
          invoiceStatus: invoiceStatus,
          description: isFreeTrialPlan 
            ? 'Free Trial - Auto-activated'
            : `Manual payment - awaiting admin verification. Transfer ID: ${transfer_id}`
        });

        console.log("Creating Manual Payment PlanRequest:", {
          user: req.session.userId,
          planName: plan,
          amount: parseFloat(amount),
          transfer_id: transfer_id,
          isFreeTrialPlan,
          status: planStatus
        });

        await newPlanRequest.save();
        console.log("Manual Payment PlanRequest saved successfully:", newPlanRequest._id);

        // Update user record
        const userUpdate = {
          transfer_id: transfer_id || 'FREE_TRIAL',
          amount: parseFloat(amount)
        };

        // Auto-activate Free Trial
        if (isFreeTrialPlan) {
          userUpdate.plan_name = plan;
          userUpdate.subscription_date = startDate;
          await subscribePlan(req.session.userId, plan);
          console.log("✅ Free Trial plan auto-activated");
        }

        await User.findByIdAndUpdate(req.session.userId, userUpdate);
        console.log("User record updated with transfer details");

        // Create transaction record
        const newTransaction = new Transaction({
          user: req.session.userId,
          type: 'payment',
          amount: parseFloat(amount),
          status: isFreeTrialPlan ? 'success' : 'pending'
        });
        await newTransaction.save();
        console.log("Manual payment transaction saved successfully");

        // Create notification
        if (req.app.locals.notificationService) {
          const user = await User.findById(req.session.userId).select('first_name');
          if (user) {
            await req.app.locals.notificationService.createNotification(
              req.session.userId,
              user.first_name,
              isFreeTrialPlan ? "Free Trial Activated" : "Manual Payment Pending"
            );
          }
        }

        req.flash(
          "success_msg",
          isFreeTrialPlan
            ? `Your ${plan} has been activated! Enjoy your free trial.`
            : `Your manual payment for ${plan} plan has been submitted. Please wait for admin verification before your package is activated.`
        );
        return res.redirect("/index");
      } catch (manualPaymentError) {
        console.error("Error creating manual payment PlanRequest:", manualPaymentError);
        req.flash("error_msg", "Failed to process manual payment. Please try again.");
        return res.redirect("/pricing");
      }
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

        // Convert GBP amount to PKR for Stripe using the rate that includes 4% fee
        // Stripe expects amounts in the smallest currency unit (paisa for PKR)
        const gbpAmount = parseFloat(expectedAmount);
        const conversionRate = 397.1863;
        const pkrAmount = gbpAmount * conversionRate; // Amount in PKR
        const stripeAmount = Math.round(pkrAmount * 100); // Convert to paisa (smallest unit)

        console.log(`💰 Stripe conversion: £${gbpAmount} → PKR ${pkrAmount.toFixed(2)} → Stripe Amount: ${stripeAmount} paisa`);

        const session = await stripeInstance.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "pkr",
                product_data: {
                  name: `${plan} Plan`,
                  description: `£${gbpAmount.toFixed(2)} GBP / PKR ${pkrAmount.toFixed(2)} PKR`
                },
                unit_amount: stripeAmount,
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
                    name: `${plan} Plan - £${parseFloat(expectedAmount).toFixed(2)} GBP`,
                    sku: plan,
                    price: (parseFloat(expectedAmount) * 397.1863).toFixed(2),
                    currency: "PKR",
                    quantity: 1,
                  },
                ],
              },
              amount: {
                currency: "PKR",
                total: (parseFloat(expectedAmount) * 397.1863).toFixed(2),
                details: {
                  subtotal: (parseFloat(expectedAmount) * 397.1863).toFixed(2),
                }
              },
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
        // Use PayFast controller
        req.body.amount = expectedAmount; // Use GPA price from database
        req.body.plan = plan;
        console.log(`PayFast payment: Plan ${plan}, GPA Amount: ${expectedAmount}`);
        return payfastController.initiatePayment(req, res);
      } else if (paymentMethod === 'wallet') {
        try {
          const wallet = await Wallet.findOne({ user: req.session.userId });
          
          // Use expected amount from database for wallet payment
          const walletAmount = expectedAmount;
          
          console.log(`💰 Wallet payment check: Balance=${wallet?.balance || 0}, Required=${walletAmount}`);
          
          if (!wallet || wallet.balance < walletAmount) {
            req.flash("error_msg", `Insufficient wallet balance. You need €${walletAmount.toFixed(2)} but only have €${wallet?.balance?.toFixed(2) || '0.00'}. Please top up your wallet.`);
            return res.redirect("/pricing");
          }
    
          // Deduct from balance using expected amount from database
          wallet.balance -= walletAmount;
          await wallet.save();
          
          console.log(`✅ Wallet balance deducted: €${walletAmount}, New balance: €${wallet.balance}`);
    
          // Create payment record
          const startDate = new Date();
          const expiryDate = new Date(startDate);
          expiryDate.setDate(expiryDate.getDate() + 30);
    
          const Payments = require("../models/payments");
          const newPayment = new Payments({
            user: req.session.userId,
            plan,
            amount: walletAmount,
            gateway: paymentMethod,
            startDate,
            expiryDate,
            status: 'active'
          });
    
          await newPayment.save();

          // Create/Update PlanRequest with Active status for wallet payments
          await PlanRequest.findOneAndUpdate(
            { user: req.session.userId },
            {
              user: req.session.userId,
              planName: plan,
              status: 'Active',
              invoiceStatus: 'Paid',
              startDate,
              expiryDate,
              amount: walletAmount,
              description: 'Wallet payment - Plan activated automatically'
            },
            { upsert: true, new: true }
          );
    
          // Update user plan
          await User.findByIdAndUpdate(req.session.userId, { plan_name: plan });
    
          // Update plan limits
          await subscribePlan(req.session.userId, plan);
    
          // Create transaction record
          const newTransaction = new Transaction({
            user: req.session.userId,
            type: 'plan_purchase',
            amount: walletAmount,
            status: 'success',
            gateway: 'wallet',
            description: `${plan} plan purchase via Wallet`
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
    
          console.log(`✅ Wallet payment completed successfully for ${plan} plan`);
          
          req.flash(
            "success_msg",
            `Your ${plan} plan has been activated using wallet balance. €${walletAmount.toFixed(2)} deducted.`
          );
          res.redirect("/index");
        } catch (error) {
          console.error("Wallet payment error:", error.message);
          req.flash("error_msg", "Failed to process wallet payment. Please try again.");
          res.redirect("/pricing");
        }
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
      const PlanRequest = require("../models/planRequest");
      const User = require("../models/user");

      // Create Payments record
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

      // Get plan price from database for the selected plan
      const selectedPlanData = await planModel.findOne({ plan_name: plan });
      const amount = selectedPlanData ? parseFloat(selectedPlanData.plan_price) || 0 : 0;
      console.log(`Payment success: Plan ${plan}, GPA Amount: ${amount}`);

      // Check if payment method is online (Stripe, PayPal, PayFast)
      const isOnlinePayment = ['stripe', 'paypal', 'payfast'].includes(gateway);

      if (isOnlinePayment) {
        // Auto-activate plan for online payments
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
        console.log(`✅ Auto-payment created for user ${userId} - Gateway: ${gateway}`);

        // Create/Update PlanRequest with Active status and Paid invoice
        await PlanRequest.findOneAndUpdate(
          { user: userId },
          {
            user: userId,
            planName: plan,
            status: 'Active',
            invoiceStatus: 'Paid',
            startDate,
            expiryDate,
            amount,
            description: `${plan} plan activated via ${gateway.toUpperCase()} automatic payment`
          },
          { upsert: true, new: true }
        );
        console.log(`✅ PlanRequest auto-activated for user ${userId}`);

        // Update user with complete plan details
        await User.findByIdAndUpdate(userId, {
          plan_name: plan,
          payment_method: gateway,
          plan_status: 'Active',
          invoice_status: 'Paid',
          start_date: startDate,
          expiry_date: expiryDate
        });
        console.log(`✅ User plan updated to ${plan}`);

        // Now, update the plan_limit based on the selected plan
        await subscribePlan(userId, plan);
        console.log(`✅ Plan limits updated for user ${userId}`);

        // Create transaction record for payment
        const newTransaction = new Transaction({
          user: userId,
          type: 'plan_purchase',
          amount,
          status: 'success',
          gateway,
          description: `${plan} plan purchase via ${gateway.toUpperCase()}`
        });
        await newTransaction.save();

        // Create notification for buying a plan
        if (req.app.locals.notificationService) {
          const user = await User.findById(userId).select('first_name');
          if (user) {
            await req.app.locals.notificationService.createNotification(
              userId,
              user.first_name,
              "Plan Activated"
            );
          }
        }

        req.flash(
          "success_msg",
          `Your ${plan} plan is now active! Enjoy your premium features.`
        );
      } else {
        // Manual payment - create pending plan request
        req.flash(
          "info_msg",
          `Your payment is being processed. Please wait for admin verification.`
        );
      }

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
     console.log(`🔄 subscribePlan called for user ${userId}, plan: ${planType}`);
     
     // Try case-insensitive search for plan
     let selectedPlan = await planModel.findOne({ plan_name: planType });
     
     if (!selectedPlan) {
       console.log(`🔄 Exact match not found, trying case-insensitive...`);
       selectedPlan = await planModel.findOne({
         plan_name: { $regex: new RegExp(`^${planType}$`, 'i') }
       });
     }

     if (!selectedPlan) {
       console.log(`❌ Plan "${planType}" not found in database`);
       return;
     }

     console.log(`📋 Found plan in DB:`, {
       plan_name: selectedPlan.plan_name,
       repairCustomer: selectedPlan.repairCustomer,
       category: selectedPlan.category,
       brand: selectedPlan.brand,
       teams: selectedPlan.teams,
       inStock: selectedPlan.inStock
     });

     let planLimit = parseInt(selectedPlan.plan_limit) || parseInt(selectedPlan.repairCustomer) || 0;

    const user = await User.findById(userId).select("plan_limit planLimits");
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`📋 BEFORE UPDATE - User planLimits:`, user.planLimits);
    
    const planLimits = {
      repairCustomer: parseInt(selectedPlan.repairCustomer) || 0,
      category: parseInt(selectedPlan.category) || 0,
      brand: parseInt(selectedPlan.brand) || 0,
      teams: parseInt(selectedPlan.teams) || 0,
      inStock: parseInt(selectedPlan.inStock) || 0
    };
    
    console.log(`📋 NEW planLimits to set:`, planLimits);
    console.log(`📋 Specifically brand limit: ${planLimits.brand}`);
    
    const updateResult = await User.findByIdAndUpdate(
      userId, 
      { 
        $set: {
          plan_limit: planLimit,
          planLimits: planLimits
        }
      }, 
      { new: true, runValidators: false }
    );
    
    console.log(`✅ AFTER UPDATE - User's plan limit: ${updateResult.plan_limit}`);
    console.log(`✅ AFTER UPDATE - User's planLimits:`, updateResult.planLimits);
    console.log(`✅ AFTER UPDATE - Brand limit specifically: ${updateResult.planLimits?.brand}`);
    
    // Double verify with fresh query
    const verifyUser = await User.findById(userId).select("planLimits plan_name");
    console.log(`🔍 VERIFICATION - Plan name: ${verifyUser.plan_name}`);
    console.log(`🔍 VERIFICATION - planLimits:`, verifyUser.planLimits);
    console.log(`🔍 VERIFICATION - Brand limit: ${verifyUser.planLimits?.brand}`);
  } catch (error) {
    console.error("❌ Error updating plan limit:", error.message);
    console.error("❌ Error stack:", error.stack);
  }
}

exports.getPayFastToken = async (req, res) => {
  const { packagePrice } = req.body;

  if (!packagePrice || isNaN(parseFloat(packagePrice))) {
    console.error("❌ Invalid packagePrice:", packagePrice);
    return res
      .status(400)
      .json({ success: false, message: "Valid package price is required" });
  }

  const merchant_id = process.env.PAYFAST_MERCHANT_ID;
  const secured_key = process.env.PAYFAST_SECURED_KEY;
  const basket_id = `ITEM-${generateRandomString(4)}`;
  const currency_code = "PKR";
  const trans_amount = parseFloat(packagePrice).toFixed(2);
  const order_date = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    const tokenApiUrl = `${process.env.PAYFAST_API_URL}/GetAccessToken`;
    const response = await axios.post(
      tokenApiUrl,
      {
        MERCHANT_ID: merchant_id,
        SECURED_KEY: secured_key,
        BASKET_ID: basket_id,
        TXNAMT: trans_amount,
        CURRENCY_CODE: currency_code,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const token = response.data.ACCESS_TOKEN || "";
    if (!token) {
      throw new Error("Empty token from PayFast");
    }

    const signatureData = `${merchant_id}${basket_id}${trans_amount}${currency_code}${secured_key}`;
    const signature = crypto.createHash("sha256").update(signatureData).digest("hex");

    res.json({
      success: true,
      merchant_id,
      basket_id,
      trans_amount,
      currency_code,
      token,
      signature,
      order_date,
    });
  } catch (error) {
    console.error("❌ PayFast token error:", error.message, error.response?.data);
    res.status(400).json({
      success: false,
      message: "Failed to retrieve PayFast access token",
    });
  }
};

// ------------------------ SUBSCRIPTION SUCCESS ------------------------
exports.updateSubscriptionSuccess = async (req, res) => {
  const { basket_id, transaction_amount, err_msg, transaction_id } =
    req.method === "GET" ? req.query : req.body;

  if (!basket_id || err_msg !== "Success") {
    console.error("❌ Invalid or unsuccessful payment:", { basket_id, err_msg });
    req.flash("error", "Payment was not successful.");
    return res.redirect("/failure");
  }

  try {
    const payment = await Payment.findOne({ transaction_id: basket_id });
    if (!payment) {
      console.error("❌ Payment not found for basket_id:", basket_id);
      req.flash("error", "Payment record not found.");
      return res.redirect("/failure");
    }

    if (parseFloat(transaction_amount).toFixed(2) !== parseFloat(payment.amount).toFixed(2)) {
      console.error("❌ Amount mismatch:", { transaction_amount, dbAmount: payment.amount });
      req.flash("error", "Payment amount mismatch.");
      return res.redirect("/failure");
    }

    payment.active = "Activated";
    await payment.save();

    const user = await User.findById(payment.user_id);
    if (!user) {
      console.error("❌ User not found for payment:", payment.user_id);
      req.flash("error", "User not found.");
      return res.redirect("/failure");
    }

    user.invoice = "Paid";
    await user.save();

    // Send notification
    await NotificationService.handleNewPayment({
      username: payment.username,
      email: user.Email,
      package_name: payment.package_name,
      amount: payment.amount,
    });

    req.flash("success", "Payment successful! Your package is now active.");
    res.redirect("/success");
  } catch (error) {
    console.error("❌ Unexpected error in success callback:", error.message);
    req.flash("error", "An unexpected error occurred.");
    res.redirect("/failure");
  }
};

// ------------------------ PAYMENT FAILURE ------------------------
exports.handlePaymentFailure = (req, res) => {
  req.flash("error", "Payment failed or was cancelled. Please try again.");
  res.redirect("/package");
};

// ------------------------ PAYFAST ITN HANDLER ------------------------
exports.handlePayFastITN = async (req, res) => {
  const { pf_payment_id, payment_status, amount_gross, m_payment_id, signature } = req.body;

  // Verify signature
  const secured_key = process.env.PAYFAST_SECURED_KEY;
  const dataString = `pf_payment_id=${pf_payment_id}&payment_status=${payment_status}&amount_gross=${amount_gross}&m_payment_id=${m_payment_id}${secured_key}`;
  const generatedSignature = crypto.createHash("sha256").update(dataString).digest("hex");

  if (signature !== generatedSignature) {
    console.error("❌ Invalid ITN signature:", { received: signature, generated: generatedSignature });
    return res.status(200).send("OK");
  }

  if (payment_status !== "COMPLETE") {
    console.error("❌ ITN Payment not complete:", payment_status);
    return res.status(200).send("OK");
  }

  try {
    const payment = await Payment.findOne({ transaction_id: m_payment_id });
    if (!payment) {
      console.error("❌ ITN Payment not found:", m_payment_id);
      return res.status(200).send("OK");
    }

    if (parseFloat(amount_gross).toFixed(2) !== parseFloat(payment.amount).toFixed(2)) {
      console.error("❌ Amount mismatch in ITN:", { amount_gross, dbAmount: payment.amount });
      return res.status(200).send("OK");
    }

    payment.package_status = "active";
    await payment.save();

    const user = await User.findById(payment.user_id);
    if (user) {
      user.invoice_status = "Paid";
      await user.save();

      // Send notification
      await NotificationService.handleNewPayment({
        username: payment.username,
        email: user.Email,
        package_name: payment.package_name,
        amount: payment.amount,
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Unexpected error in ITN:", error.message);
    res.status(200).send("OK");
  }
};

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

// Get plan prices from backend - now fetches from database
exports.getPlanPrices = async (req, res) => {
  try {
    console.log('🔍 GET /plan-prices called - fetching plans from database...');

    // Fetch current plan prices from database
    let plans;
    try {
      plans = await planModel.find({}, 'plan_name plan_price');
      console.log(`📋 Found ${plans.length} plans in database:`);
      plans.forEach(plan => {
        console.log(`  - ${plan.plan_name}: ${plan.plan_price} (type: ${typeof plan.plan_price})`);
      });
    } catch (dbError) {
      console.error('❌ Database error fetching plans:', dbError.message);
      return res.json({
        success: false,
        message: "Database error: " + dbError.message
      });
    }

    if (!plans || plans.length === 0) {
      console.error('❌ No plans found in database');
      return res.json({
        success: false,
        message: "No plans available"
      });
    }

     const planPrices = {};
     const planPricesPkr = {};

     // Convert to expected format for frontend (GPA only)
     plans.forEach(plan => {
       const originalPlanName = plan.plan_name;
       const planNameUpper = originalPlanName?.toUpperCase() || 'UNKNOWN';
       const planNameOriginal = originalPlanName; // Keep original case for display
       const gpaPrice = Number(plan.plan_price) || 0;

       console.log(`📋 Processing plan for frontend: ${planNameOriginal}, GPA Price: ${gpaPrice}`);

       // Store GPA amounts for both original case and uppercase for compatibility
       planPrices[planNameOriginal] = gpaPrice.toFixed(2); // For original case (e.g., "Premium")
       planPrices[planNameUpper] = gpaPrice.toFixed(2);     // For uppercase (e.g., "PREMIUM")

       // Keep GPA amounts in "PKR" field for frontend compatibility (but it's actually GPA)
       planPricesPkr[planNameOriginal] = gpaPrice.toFixed(2);
       planPricesPkr[planNameUpper] = gpaPrice.toFixed(2);
     });

     console.log(`📋 Final GPA plan prices for frontend (Euro display):`, { planPrices, planPricesPkr });

     res.json({
       success: true,
       planPrices: planPrices,
       planPricesPkr: planPricesPkr,
       conversionRate: {
         gbp: 1,
         pkr: 1,
         note: "Prices from database"
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
    const paymentMethod = pendingPayment ? pendingPayment.paymentMethod : 'bank'; // default to bank

    // Plan prices are now handled dynamically from admin-created plans
    // This function validates payments for existing plan selections

    // Get plan price from database for validation
    const selectedPlanData = await planModel.findOne({ plan_name: plan });
    const expectedAmount = selectedPlanData ? parseFloat(selectedPlanData.plan_price) || 0 : 0;
    console.log(`Transfer validation: Plan ${plan}, GPA Price: €${expectedAmount}`);
    const submittedAmount = parseFloat(amount);

    // Validate amount is not less than plan price
    if (submittedAmount < expectedAmount) {
      req.flash("error_msg",
        `Amount too low! ${paymentMethod.toUpperCase()} plan requires €${expectedAmount} but you entered €${submittedAmount}. Please enter the correct amount or contact admin if you have a discount.`
      );
      return res.redirect("/pricing");
    }

    // Create PlanRequest record for manual payment (pending admin verification)
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

    try {
      const paymentMethodName = paymentMethod.toUpperCase();
      const newPlanRequest = new PlanRequest({
        user: userId,
        planName: plan,
        amount: parseFloat(amount),
        startDate,
        expiryDate,
        status: 'Pending',
        invoiceStatus: 'Unpaid',
        description: `${paymentMethodName} payment - awaiting admin verification. Transfer ID: ${transfer_id}`
      });

      console.log(`Creating ${paymentMethodName} PlanRequest:`, {
        user: userId,
        planName: plan,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        transfer_id: transfer_id
      });

      await newPlanRequest.save();
      console.log(`${paymentMethodName} PlanRequest saved successfully:`, newPlanRequest._id);

      // Update transfer details in user record but don't activate plan yet
      await User.findByIdAndUpdate(userId, {
        transfer_id,
        amount: parseFloat(amount)
      });

      // Create transaction record for manual payment (pending status)
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount: parseFloat(amount),
        status: 'pending'
      });
      await newTransaction.save();
      console.log(`${paymentMethodName} transaction saved successfully`);

      // Clear session pending
      delete req.session.pendingPayment;

      req.flash("success_msg", `${paymentMethodName} payment recorded successfully. Please wait for admin verification before your package is activated.`);
      res.redirect("/index");
    } catch (manualPaymentError) {
      console.error(`Error creating ${paymentMethod.toUpperCase()} PlanRequest:`, manualPaymentError);
      req.flash("error_msg", `Failed to process ${paymentMethod.toUpperCase()} payment. Please try again.`);
      res.redirect("/pricing");
    }
  } catch (error) {
    console.error("Error updating transfer data:", error.message);
    req.flash("error_msg", "Failed to process bank transfer. Please try again.");
    res.redirect("/pricing");
  }
};

// PayFast webhook handler - now delegates to dedicated controller
exports.payfastWebhook = async (req, res) => {
  // Delegate to the dedicated PayFast controller for proper handling
  return await payfastController.handleWebhook(req, res);
};



