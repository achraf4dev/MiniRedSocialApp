const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Home page
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author').sort({ createdAt: -1 });
    
    // Add isAuthor flag to each post
    const postsWithPermissions = posts.map(post => {
      const isAuthor = req.session.user && post.author._id.toString() === req.session.user.id;
      return {
        ...post._doc,
        isAuthor
      };
    });
    
    res.render('index', { 
      posts: postsWithPermissions, 
      title: 'Home' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Handle post creation from index page
router.post('/', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    if (!req.body.content || !req.body.content.trim()) {
      const posts = await Post.find().populate('author').sort({ createdAt: -1 });
      
      // Add isAuthor flag to each post
      const postsWithPermissions = posts.map(post => {
        const isAuthor = req.session.user && post.author._id.toString() === req.session.user.id;
        return {
          ...post._doc,
          isAuthor
        };
      });
      
      return res.render('index', { 
        posts: postsWithPermissions, 
        error: 'El contenido de la publicación no puede estar vacío',
        title: 'Home' 
      });
    }
    
    await Post.create({ 
      content: req.body.content, 
      author: req.session.user.id 
    });
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 