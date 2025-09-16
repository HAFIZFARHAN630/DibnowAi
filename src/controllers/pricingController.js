require("dotenv").config();
const User = require("../models/user");
const paypal = require("paypal-rest-sdk");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Configure PayPal
paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

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
      const [user, allUsers] = await Promise.all([
        User.findById(userId).select(
          "first_name last_name phone_number email company address user_img country currency plan_name status denial_reason role"
        ),
        User.find()
      ]);

      if (!user) {
        return res.redirect("/sign_in");
      }

      const profileImagePath = user.user_img || "/uploads/default.png";

      res.render("pricing/pricing", {
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
      });
    } catch (error) {
      console.error("Error fetching pricing data:", error.message);
      return res.render("pricing/pricing", {
        users: [],
        error_msg: "Unable to load pricing data. Please try again.",
        success_msg: ""
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

    try {
      if (paymentMethod === "paypal") {
        const create_payment_json = {
          intent: "sale",
          payer: { payment_method: "paypal" },
          redirect_urls: {
            return_url: `${process.env.APP_BASE_URL}/success?plan=${plan}`,
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
            return res.redirect(approvalUrl.href);
          } else {
            console.error("Approval URL not found in PayPal response");
            return res.status(500).send("Error retrieving approval URL");
          }
        });
      } else if (paymentMethod === "stripe") {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "gbp",
                product_data: { name: plan },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.APP_BASE_URL}/pricing?plan=${plan}`,
          cancel_url: `${process.env.APP_BASE_URL}/pricing`,
        });

        res.redirect(session.url);
      } else {
        return res.status(400).send("Invalid payment method.");
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
      const userId = req.session.userId;

      // Update the plan_name in the database
      await User.findByIdAndUpdate(userId, { plan_name: plan });

      // Now, update the plan_limit based on the selected plan
      await subscribePlan(userId, plan);

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

    await User.findByIdAndUpdate(userId, { transfer_id, amount });
    res.redirect("/pricing");
  } catch (error) {
    console.error("Error updating transfer data:", error.message);
    res.status(500).json({ message: "Database error" });
  }
};
