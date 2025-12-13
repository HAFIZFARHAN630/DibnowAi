const AddUser = require("../models/adduser");
const User = require("../models/user");

// Middleware to check if team member has permission
exports.checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // If session says NOT a team member, allow all access
      if (req.session.isTeamMember !== true) {
        return next();
      }
      
      // Check if this is a team member login (NOT owner)
      if (req.session.isTeamMember === true && req.session.teamMemberEmail) {
        const teamMember = await AddUser.findOne({ email: req.session.teamMemberEmail });
        
        if (teamMember) {
          // If permissions is null, allow full access (default behavior)
          if (!teamMember.permissions) {
            return next();
          }
          
          // Check if team member has the required permission
          if (teamMember.permissions[permissionName] === false) {
            return res.status(403).render("error", {
              message: "Access Denied",
              error: { status: 403, stack: "You do not have the required permissions to access this resource. Please contact your administrator if you believe this is an error." }
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      next();
    }
  };
};

// Middleware to attach team member permissions to res.locals
exports.attachPermissions = async (req, res, next) => {
  try {
    const userId = req.userId || req.session.userId;
    if (!userId) {
      return next();
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return next();
    }
    
    // CRITICAL: If session says NOT a team member, skip all team member checks
    if (req.session.isTeamMember !== true) {
      res.locals.isTeamMember = false;
      res.locals.teamPermissions = null;
      return next();
    }
    
    // Check if this is a team member login
    if (req.session.isTeamMember === true && req.session.teamMemberEmail) {
      const teamMember = await AddUser.findOne({ email: req.session.teamMemberEmail });
      if (teamMember) {
        // Block access if inactive
        if (teamMember.status === 'inactive') {
          return res.status(403).render("error", {
            message: "Account Suspended",
            error: { status: 403, stack: "Your account has been temporarily suspended by the system administrator. Please contact support for further assistance or to request account reactivation." }
          });
        }
        res.locals.isTeamMember = true;
        res.locals.teamPermissions = teamMember.permissions;
        return next();
      }
    }
    
    // Regular owner user
    res.locals.isTeamMember = false;
    res.locals.teamPermissions = null;
    next();
  } catch (error) {
    console.error("Attach permissions error:", error);
    res.locals.isTeamMember = false;
    res.locals.teamPermissions = null;
    next();
  }
};
