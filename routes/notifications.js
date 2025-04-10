const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireLogin } = require('./middleware');

// View all notifications
router.get('/', requireLogin, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.session.user.id })
      .populate('sender')
      .populate('post')
      .sort({ createdAt: -1 });
    
    // Mark all as read
    await Notification.updateMany(
      { recipient: req.session.user.id, read: false },
      { read: true }
    );
    
    // Emit event to update notification count
    const io = req.app.get('io');
    io.to(req.session.user.id).emit('notifications-read');
    
    res.render('notifications', { 
      notifications,
      title: 'Notifications'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Mark single notification as read and redirect
router.get('/:id/read', requireLogin, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('post');
    
    if (!notification || notification.recipient.toString() !== req.session.user.id) {
      return res.redirect('/notifications');
    }
    
    // Mark as read
    notification.read = true;
    await notification.save();
    
    // Emit event to update notification count
    const io = req.app.get('io');
    io.to(req.session.user.id).emit('notification-read', { notificationId: notification._id });
    
    // Redirect based on notification type
    if (notification.type === 'comment' && notification.post) {
      return res.redirect(`/posts/${notification.post._id}`);
    }
    
    res.redirect('/notifications');
  } catch (err) {
    console.error(err);
    res.redirect('/notifications');
  }
});

// API endpoint to get unread notification count
router.get('/api/count', requireLogin, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.session.user.id,
      read: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router; 