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
       category,
       brand,
       teams
     } = req.body;

     const basePrice = parseFloat(plan_price) || 0;
     console.log(`Storing base GBP price: ${basePrice}`);

     const plan = new planModel({
       plan_name: plan_name || '',
       plan_price: basePrice,
       plan_limit: plan_limit || '',
       repairCustomer: repairCustomer !== undefined ? String(repairCustomer) : '0',
       inStock: inStock !== undefined ? String(inStock) : '0',
       category: category !== undefined ? String(category) : '0',
       brand: brand !== undefined ? String(brand) : '0',
       teams: teams !== undefined ? String(teams) : '0'
     });

    console.log('📋 Plan object before saving:', {
      plan_name: plan.plan_name,
      plan_price: plan.plan_price,
      plan_price_type: typeof plan.plan_price
    });

    const saved = await plan.save();

    console.log('✅ Saved plan document:', {
      id: saved._id,
      plan_name: saved.plan_name,
      plan_price: saved.plan_price,
      plan_price_type: typeof saved.plan_price
    });

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
     const { plan_name, plan_price, plan_limit, repairCustomer, inStock, category, brand, teams } = req.body;

     const basePrice = parseFloat(plan_price) || 0;
     console.log(`Updating plan: Storing base GBP price ${basePrice}`);

     await planModel.findByIdAndUpdate(id, {
       plan_name,
       plan_price: basePrice,
       plan_limit,
       repairCustomer: repairCustomer || '0',
       inStock: inStock || '0',
       category: category || '0',
       brand: brand || '0',
       teams: teams || '0'
     });

     // Auto-sync all users with this plan
     console.log(`🔄 Starting auto-sync for plan: ${plan_name}`);
     const User = require("../models/user");
     const usersWithThisPlan = await User.find({ plan_name: plan_name });
     
     console.log(`📋 Found ${usersWithThisPlan.length} users with plan: ${plan_name}`);
     usersWithThisPlan.forEach(user => {
       console.log(`  - User: ${user._id} (${user.first_name || 'No name'})`);
     });
     
     if (usersWithThisPlan.length > 0) {
       const newPlanLimits = {
         repairCustomer: parseInt(repairCustomer) || 0,
         category: parseInt(category) || 0,
         brand: parseInt(brand) || 0,
         teams: parseInt(teams) || 0,
         inStock: parseInt(inStock) || 0
       };
       
       console.log(`🔄 Updating users with new limits:`, newPlanLimits);
       
       const updateResult = await User.updateMany(
         { plan_name: plan_name },
         { planLimits: newPlanLimits }
       );
       
       console.log(`✅ Auto-sync result:`, {
         matched: updateResult.matchedCount,
         modified: updateResult.modifiedCount,
         acknowledged: updateResult.acknowledged
       });
       
       console.log(`✅ Auto-synced ${usersWithThisPlan.length} users with updated ${plan_name} plan limits`);
     } else {
       console.log(`⚠️ No users found with plan name: ${plan_name}`);
     }
    
    res.redirect('/create-plan');
  } catch (error) {
    console.log(error);
    res.redirect('/create-plan');
  }
};