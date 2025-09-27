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
              users: users,
              notifications: notifications,
              unreadCount: unreadCount
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