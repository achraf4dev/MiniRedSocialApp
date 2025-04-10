const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

// Register
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('register', { 
        error: 'Username or email already in use',
        title: 'Register'
      });
    }
    
    // Validate
    if (!username || !email || !password) {
      return res.render('register', { 
        error: 'All fields are required',
        title: 'Register'
      });
    }
    
    // Create user
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    
    // Auto login after registration
    req.session.user = { id: user._id, username: user.username };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('register', { 
      error: 'Registration failed. Please try again.',
      title: 'Register'
    });
  }
});

// Login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { 
        error: 'Invalid email or password',
        title: 'Login'
      });
    }
    
    // Check password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.render('login', { 
        error: 'Invalid email or password',
        title: 'Login'
      });
    }
    
    // Set session
    req.session.user = { id: user._id, username: user.username };
    
    // Redirect to requested page or home
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error(err);
    res.render('login', { 
      error: 'Login failed. Please try again.',
      title: 'Login'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router; 