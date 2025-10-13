const User = require("../models/user")
const planModel = require("../models/plan.model")
exports.createPlanPage = async (req,res) => { 
    try {
         const userId = req.session.userId;
            
            // Fetch all users
            const allUsers = await User.find().select(
              "first_name email phone_number role user_img plan_name company plan_limit"
            );
            
            // Find the logged-in user
            const loggedInUser = allUsers.find((user) => user._id.toString() === userId);
            if (!loggedInUser) {
              return res.redirect("/sign_in");
            }
            
            const profileImagePath = loggedInUser.user_img || "/uploads/default.png";
            
            // Filter out the logged-in user from the list
            const users = allUsers.filter((user) => user._id.toString() !== userId);
            
            // Get notification data
            const Notification = require("../models/notification");
            const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
            const unreadCount = await Notification.countDocuments({ isRead: false });
            
            const plans = await planModel.find();
            res.render("admin/plan-settings", {
              plans,
              profileImagePath,
              firstName: loggedInUser.first_name,
              email: loggedInUser.email,
              users: users,
              notifications: notifications,
              unreadCount: unreadCount,
              isAdmin: loggedInUser.role === "admin",
              isUser: loggedInUser.role === "user"
            });
    } catch (error) {
        console.log(error)
    }
 }

exports.postPlan = async (req, res) => {
  try {
    console.log('Received plan data:', req.body);

    const {
      plan_name,
      plan_price,
      plan_limit,
      repairCustomer,
      inStock,
      inventory,
      sportTicket,
      teams
    } = req.body;

    const plan = new planModel({
      plan_name: plan_name || '',
      plan_price: plan_price || '',
      plan_limit: plan_limit || '',
      repairCustomer: repairCustomer !== undefined ? String(repairCustomer) : '',
      inStock: inStock !== undefined ? String(inStock) : '',
      inventory: inventory !== undefined ? String(inventory) : '',
      teams: teams !== undefined ? String(teams) : '',
      sportTicket: req.body.sportTicket ? 'true' : 'false',
    });

    const saved = await plan.save();

    console.log('Saved plan document:', saved);

    // Notify all logged-in users about the new plan
    if (req.app.locals.notificationService) {
      try {
        // Get all users to notify them about the new plan
        const User = require("../models/user");
        const allUsers = await User.find({}).select("first_name _id");

        for (const user of allUsers) {
          await req.app.locals.notificationService.createNotification(
            user._id,
            user.first_name,
            `New Plan Available - ${plan_name} plan has been added`
          );
        }
        console.log(`✅ Notifications sent to ${allUsers.length} users about new plan: ${plan_name}`);
      } catch (notificationError) {
        console.error("❌ Failed to send new plan notifications:", notificationError.message);
      }
    }

    res.redirect('/create-plan');
  } catch (error) {
    console.error('Error saving plan:', error);
    res.redirect('/create-plan?error=1');
  }
};


exports.deletePlan = async (req,res) => { 
  try {
    const {id} = req.params
    const delPlan = await planModel.findByIdAndDelete(id)
    console.log(delPlan,"PlanDeleted")
    res.redirect("/create-plan")
  } catch (error) {
    console.log(error)
  }
 }

exports.editPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await planModel.findById(id);
    res.json(plan);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, plan_price, plan_limit, repairCustomer, inStock, inventory, teams, sportTicket } = req.body;
    
    await planModel.findByIdAndUpdate(id, {
      plan_name,
      plan_price,
      plan_limit,
      repairCustomer: repairCustomer || '',
      inStock: inStock || '',
      inventory: inventory || '',
      teams: teams || '',
      sportTicket: sportTicket === 'true' ? 'true' : 'false'
    });
    
    res.redirect('/create-plan');
  } catch (error) {
    console.log(error);
    res.redirect('/create-plan');
  }
};