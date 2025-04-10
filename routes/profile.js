const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Post = require('../models/Post');
const { requireLogin } = require('./middleware');

// View own profile
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    const posts = await Post.find({ author: req.session.user.id }).sort({ createdAt: -1 });
    
    res.render('profile', { 
      user, 
      posts, 
      profileOwner: true,
      title: 'My Profile' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit profile
router.get('/edit', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    
    res.render('profile_edit', { 
      user,
      title: 'Edit Profile'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/edit', requireLogin, async (req, res) => {
  try {
    const { fullName, bio, profilePhoto, currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.session.user.id);
    
    // Update profile fields
    user.fullName = fullName;
    user.bio = bio;
    
    // Only update profile photo if provided
    if (profilePhoto && profilePhoto.trim() !== '') {
      user.profilePhoto = profilePhoto;
    }
    
    // Handle password change if requested
    if (newPassword && newPassword.trim() !== '') {
      // Verify current password
      const isValid = await user.validatePassword(currentPassword);
      if (!isValid) {
        return res.render('profile_edit', { 
          user,
          error: 'La contraseña actual es incorrecta',
          title: 'Edit Profile'
        });
      }
      
      // Validate new password
      if (newPassword !== confirmPassword) {
        return res.render('profile_edit', { 
          user,
          error: 'Las nuevas contraseñas no coinciden',
          title: 'Edit Profile'
        });
      }
      
      // Update password
      user.password = await bcrypt.hash(newPassword, 10);
    }
    
    await user.save();
    
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    const user = await User.findById(req.session.user.id);
    res.render('profile_edit', { 
      user,
      error: 'Error al actualizar el perfil. Inténtalo de nuevo.',
      title: 'Edit Profile'
    });
  }
});

// View other user's profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).render('error', { 
        error: 'User not found',
        title: 'Error'
      });
    }
    
    const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 });
    const profileOwner = req.session.user && req.session.user.id === user._id.toString();
    
    res.render('profile', { 
      user, 
      posts,
      profileOwner,
      title: `${user.username}'s Profile`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 