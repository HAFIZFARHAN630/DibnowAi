const AddUser = require("../models/adduser");
const User = require("../models/user");

// Middleware to check if team member has permission
exports.checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId || req.session.userId;
      const user = await User.findById(userId);
      
      // If admin or owner, allow all access
      if (!user || user.role === "admin") {
        return next();
      }
      
      // Check if this is a team member login
      if (req.session.isTeamMember && req.session.teamMemberEmail) {
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
              error: { status: 403, stack: "You don't have permission to access this resource." }
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
    
    // If admin, set all permissions to true
    if (user.role === "admin") {
      res.locals.teamPermissions = null;
      res.locals.isTeamMember = false;
      return next();
    }
    
    // Check if this is a team member login
    if (req.session.isTeamMember && req.session.teamMemberEmail) {
      const teamMember = await AddUser.findOne({ email: req.session.teamMemberEmail });
      if (teamMember) {
        res.locals.isTeamMember = true;
        res.locals.teamPermissions = teamMember.permissions;
        console.log('Team member permissions loaded:', teamMember.email, teamMember.permissions);
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
