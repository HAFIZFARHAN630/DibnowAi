const User = require("../models/user");

/**
 * Generic middleware to check plan-based feature limits
 * @param {string} featureName - Name of the feature (repairCustomer, category, brand, teams, inStock)
 * @param {Model} Model - Mongoose model to count existing records
 * @returns {Function} Express middleware function
 */
const checkLimit = (featureName, Model) => {
  return async (req, res, next) => {
    try {
      const userId = req.session?.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      // Fetch user with plan limits (fresh from database)
      const user = await User.findById(userId).select('planLimits');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Get allowed limit from user's plan (convert to number if string)
      const allowedLimit = parseInt(user.planLimits?.[featureName]) || 0;
      
      console.log(`🔍 Checking ${featureName} limit for user ${userId}:`);
      console.log(`  - User planLimits.${featureName}: ${user.planLimits?.[featureName]}`);
      console.log(`  - Parsed allowedLimit: ${allowedLimit}`);

      // If planLimits not assigned or is 0
      if (allowedLimit === 0) {
        console.log(`❌ Plan limits not assigned for ${featureName}`);
        return res.status(403).json({
          success: false,
          message: "Plan limits not assigned. Please contact support."
        });
      }

      // Count existing records created by this user
      const currentCount = await Model.countDocuments({ user_id: userId });

      console.log(`📊 Current count: ${currentCount}, Allowed limit: ${allowedLimit}`);
      console.log(`🧮 Logic check: ${currentCount} >= ${allowedLimit} = ${currentCount >= allowedLimit}`);

      // Check if adding one more item would exceed the limit
      if (currentCount >= allowedLimit) {
        console.log(`🚫 BLOCKED: User has reached limit`);
        return res.status(403).json({
          success: false,
          limitReached: true,
          message: `You have reached your limit of ${allowedLimit}. Please upgrade your plan.`
        });
      }
      
      console.log(`✅ ALLOWED: User can add more items`);

      // Limit not reached, proceed
      next();
    } catch (error) {
      console.error(`Error in checkLimit middleware for ${featureName}:`, error);
      return res.status(500).json({
        success: false,
        message: "Error checking plan limits"
      });
    }
  };
};

module.exports = { checkLimit };
