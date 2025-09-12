require("dotenv").config();
const { use } = require("bcrypt/promises");
const db = require("../config/db");
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
  (req, res) => {
    const userId = req.session.userId;

    const sqlProfile =
      "SELECT first_name, last_name, phone_number, email, company, address, user_img, country, currency,plan_name, status,denial_reason,role FROM users WHERE id = ?";

    db.query(sqlProfile, [userId], (err, profileResult) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).send("Internal Server Error");
      }

      if (profileResult.length === 0) {
        return res.redirect("/sign_in");
      }

      const user = profileResult[0];
      const profileImagePath = user.user_img || "/uploads/default.png";

      const sql = "SELECT * FROM users";
      db.query(sql, (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).send("Internal Server Error");
        }

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
          users: results,
          user_id: userId,
          isUser: user.role === "user",
          plan_name: user.plan_name || "No Plan",
          success_msg: req.flash("success_msg"),
          error_msg: req.flash("error_msg"),
          status: user.status,
          //
          reson: user.denial_reason,
        });
      });
    });
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
// Handle payment success
exports.paymentSuccess = [
  ensureLoggedIn,
  (req, res) => {
    const plan = req.query.plan;
    const userId = req.session.userId;

    // Update the plan_name in the database
    const updateSql = "UPDATE users SET plan_name = ? WHERE id = ?";
    db.query(updateSql, [plan, userId], (err) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).send("Internal Server Error");
      }

      // Now, update the plan_limit based on the selected plan
      subscribePlan(userId, plan);

      req.flash(
        "success_msg",
        `Your subscription plan has been updated to ${plan}.`
      );
      res.redirect("/index");
    });
  },
];

// Function to subscribe and update plan limits
function subscribePlan(userId, planType) {
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
  const getCurrentPlanLimitQuery = "SELECT plan_limit FROM users WHERE id = ?";
  db.query(getCurrentPlanLimitQuery, [userId], (err, result) => {
    if (err) {
      console.error("Error retrieving current plan limit:", err);
      return;
    }
    if (result.length === 0) {
      console.log("User not found");
      return;
    }
    let currentPlanLimit = result[0].plan_limit || 0;
    const newPlanLimit = currentPlanLimit + planLimit;
    const updatePlanLimitQuery = "UPDATE users SET plan_limit = ? WHERE id = ?";
    db.query(updatePlanLimitQuery, [newPlanLimit, userId], (err, result) => {
      if (err) {
        console.error("Error updating plan limit:", err);
        return;
      }
      console.log(`User's plan limit updated to: ${newPlanLimit}`);
    });
  });
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
  (req, res) => {
    const userId = req.session.userId;

    // Update the user's plan to "FREE_TRIAL"
    const updateSql = "UPDATE users SET plan_name = ? WHERE id = ?";
    db.query(updateSql, ["FREE TRIAL", userId], (err) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).send("Internal Server Error");
      }

      // Send a success response
      res.json({ success: true });
    });
  },
];
// Backend route to handle the subscription
exports.handleSubscription =
  ("/pricing",
  (req, res) => {
    const { plan, paymentMethod } = req.body;
    const subscriptionDate = new Date(); // Current date and time

    const sql =
      "INSERT INTO users (plan_name, payment_method, subscription_date) VALUES (?, ?, ?)";
    db.query(sql, [plan, paymentMethod, subscriptionDate], (err, result) => {
      if (err) throw err;
      res.send("Subscription successful!");
    });
  });

exports.upgradePlan = (req, res) => {
  const userId = req.session.userId;
  const payment_method = req.body.paymentMethod; // Retrieve payment method

  const query = `
  UPDATE users 
  SET payment_method = ?, subscription_date = NOW() 
  WHERE id = ?
`;

  db.query(query, [payment_method, userId], (err, result) => {
    if (err) {
      console.error("Error updating subscription:", err);
      return res.status(500).send("Database error");
    }
    res.send("Subscription upgraded successfully!");
  });
};

// Corrected Route for Inserting Data
exports.insertTransfer = (req, res) => {
  const { transfer_id, amount } = req.body;
  const userId = req.session.userId; // Assuming the logged-in user's ID is in the session

  if (!transfer_id || !amount) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Ensure userId is available
  if (!userId) {
    return res.status(400).json({ message: "User not logged in" });
  }

  // Assuming `transfer_id` and `amount` are fields in the `users` table
  const sql = "UPDATE users SET transfer_id = ?, amount = ? WHERE id = ?";
  db.query(sql, [transfer_id, amount, userId], (err, result) => {
    if (err) {
      console.error("Error updating data:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // If update is successful
    res.redirect("/pricing");
  });
};
