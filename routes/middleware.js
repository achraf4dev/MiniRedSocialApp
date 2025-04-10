const Notification = require('../models/Notification');
const User = require('../models/User');

// Authentication check middleware
exports.requireLogin = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};

// Add user data and notifications to response locals
exports.addUserData = async (req, res, next) => {
  if (req.session.user) {
    try {
      // Fetch complete user object with virtuals
      const user = await User.findById(req.session.user.id);
      res.locals.currentUser = user;
      
      // Add unread notifications count
      const unreadCount = await Notification.countDocuments({
        recipient: req.session.user.id,
        read: false
      });
      res.locals.unreadNotifications = unreadCount;
    } catch (err) {
      console.error('Error fetching user data:', err);
      res.locals.currentUser = req.session.user;
      res.locals.unreadNotifications = 0;
    }
  } else {
    res.locals.currentUser = null;
    res.locals.unreadNotifications = 0;
  }
  
  next();
}; 