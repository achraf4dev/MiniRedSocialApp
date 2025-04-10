const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
});

module.exports = mongoose.model('Comment', commentSchema);
