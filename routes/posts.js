const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { requireLogin } = require('./middleware');

// Create post
router.post('/', requireLogin, async (req, res) => {
  try {
    const content = req.body.content.trim();
    
    if (!content) {
      return res.redirect('/');
    }
    
    // Check if content exceeds 255 characters
    if (content.length > 255) {
      return res.render('index', {
        error: 'El contenido de la publicación no puede exceder los 255 caracteres.',
        posts: await Post.find().populate('author').sort({ createdAt: -1 }),
        title: 'Inicio'
      });
    }
    
    const post = await Post.create({ 
      content: content, 
      author: req.session.user.id 
    });
    
    // Emit socket event for real-time post update
    const io = req.app.get('io');
    const populatedPost = await Post.findById(post._id).populate('author');
    io.emit('new-post', {
      post: populatedPost,
      authorName: req.session.user.name
    });
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Edit post
router.get('/:id/edit', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', { 
        error: 'Post not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the post
    if (post.author.toString() !== req.session.user.id) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to edit this post',
        title: 'Error'
      });
    }
    
    res.render('post_edit', { 
      post, 
      title: 'Edit Post'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/edit', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', { 
        error: 'Post not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the post
    if (post.author.toString() !== req.session.user.id) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to edit this post',
        title: 'Error'
      });
    }
    
    const content = req.body.content.trim();
    
    if (!content) {
      return res.render('post_edit', { 
        post,
        error: 'Post content cannot be empty',
        title: 'Edit Post'
      });
    }
    
    // Check if content exceeds 255 characters
    if (content.length > 255) {
      return res.render('post_edit', { 
        post,
        error: 'El contenido de la publicación no puede exceder los 255 caracteres.',
        title: 'Edit Post'
      });
    }
    
    post.content = content;
    await post.save();
    
    // Emit socket event for real-time post update
    const io = req.app.get('io');
    const populatedPost = await Post.findById(post._id).populate('author');
    io.emit('edit-post', {
      post: populatedPost
    });
    
    res.redirect(`/posts/${post._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete post
router.post('/:id/delete', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', { 
        error: 'Post not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the post
    if (post.author.toString() !== req.session.user.id) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to delete this post',
        title: 'Error'
      });
    }
    
    // Delete associated comments
    await Comment.deleteMany({ post: post._id });
    
    // Delete associated notifications
    await Notification.deleteMany({ post: post._id });
    
    // Emit socket event for real-time deletion
    const io = req.app.get('io');
    io.emit('delete-post', {
      postId: post._id
    });
    
    // Delete the post
    await Post.findByIdAndDelete(req.params.id);
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// View post with comments
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author');
    
    if (!post) {
      return res.status(404).send('Post not found');
    }
    
    const comments = await Comment.find({ post: post._id }).populate('author').sort({ createdAt: 1 });
    
    // Check if current user is the author of the post
    const isPostAuthor = req.session.user && post.author._id.toString() === req.session.user.id;
    
    // Check which comments the user can edit/delete
    const commentsWithPermissions = comments.map(comment => {
      const isCommentAuthor = req.session.user && comment.author._id.toString() === req.session.user.id;
      return {
        ...comment._doc,
        canEdit: isCommentAuthor,
        canDelete: isCommentAuthor || isPostAuthor
      };
    });
    
    res.render('post_detail', { 
      post, 
      comments: commentsWithPermissions, 
      isPostAuthor,
      title: 'Post Detail' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add comment
router.post('/:id/comments', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author');
    
    if (!post) {
      return res.status(404).send('Post not found');
    }
    
    const content = req.body.content.trim();
    
    if (!content) {
      const comments = await Comment.find({ post: post._id }).populate('author');
      return res.render('post_detail', { 
        post, 
        comments,
        error: 'Comment cannot be empty',
        title: 'Post Detail'
      });
    }
    
    // Check if content exceeds 255 characters
    if (content.length > 255) {
      const comments = await Comment.find({ post: post._id }).populate('author');
      return res.render('post_detail', { 
        post, 
        comments,
        error: 'El comentario no puede exceder los 255 caracteres.',
        title: 'Post Detail'
      });
    }
    
    // Create comment
    const comment = await Comment.create({
      content: content,
      post: req.params.id,
      author: req.session.user.id,
    });
    
    // Create notification if comment is not by the post author
    if (post.author._id.toString() !== req.session.user.id) {
      await Notification.create({
        recipient: post.author._id,
        sender: req.session.user.id,
        type: 'comment',
        post: post._id
      });
      
      // Emit socket event for real-time notification
      const io = req.app.get('io');
      io.to(post.author._id.toString()).emit('new-notification', {
        message: `${req.session.user.name} commented on your post`,
        postId: post._id
      });
    }
    
    // Emit socket event for real-time comment
    const io = req.app.get('io');
    const populatedComment = await Comment.findById(comment._id).populate('author');
    io.emit('new-comment', {
      comment: populatedComment,
      postId: post._id,
      authorName: req.session.user.name
    });
    
    res.redirect(`/posts/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit comment
router.get('/:postId/comments/:commentId/edit', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('post');
    
    if (!comment) {
      return res.status(404).render('error', { 
        error: 'Comment not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the comment
    if (comment.author.toString() !== req.session.user.id) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to edit this comment',
        title: 'Error'
      });
    }
    
    res.render('comment_edit', { 
      comment,
      postId: req.params.postId, 
      title: 'Edit Comment'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:postId/comments/:commentId/edit', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    
    if (!comment) {
      return res.status(404).render('error', { 
        error: 'Comment not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the comment
    if (comment.author.toString() !== req.session.user.id) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to edit this comment',
        title: 'Error'
      });
    }
    
    const content = req.body.content.trim();
    
    if (!content) {
      return res.render('comment_edit', { 
        comment,
        postId: req.params.postId,
        error: 'Comment content cannot be empty',
        title: 'Edit Comment'
      });
    }
    
    // Check if content exceeds 255 characters
    if (content.length > 255) {
      return res.render('comment_edit', { 
        comment,
        postId: req.params.postId,
        error: 'El comentario no puede exceder los 255 caracteres.',
        title: 'Edit Comment'
      });
    }
    
    comment.content = content;
    await comment.save();
    
    res.redirect(`/posts/${req.params.postId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete comment
router.post('/:postId/comments/:commentId/delete', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    const post = await Post.findById(req.params.postId);
    
    if (!comment || !post) {
      return res.status(404).render('error', { 
        error: 'Comment or post not found',
        title: 'Error'
      });
    }
    
    // Check if user is the author of the comment or post
    const isCommentAuthor = comment.author.toString() === req.session.user.id;
    const isPostAuthor = post.author.toString() === req.session.user.id;
    
    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).render('error', { 
        error: 'You are not authorized to delete this comment',
        title: 'Error'
      });
    }
    
    // Delete associated notifications (if exists)
    await Notification.deleteMany({ 
      type: 'comment',
      post: post._id,
      sender: comment.author
    });
    
    // Delete the comment
    await Comment.findByIdAndDelete(req.params.commentId);
    
    res.redirect(`/posts/${req.params.postId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 