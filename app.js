const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const http = require('http');
const socketIO = require('socket.io');

// Import middleware
const { addUserData } = require('./routes/middleware');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB Atlas connection
// Replace the connection string with your own from MongoDB Atlas
const MONGODB_URI = 'mongodb://127.0.0.1:27017/socialapp-auth';
// For local MongoDB (once installed): 'mongodb://127.0.0.1:27017/socialapp-auth'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please check your MongoDB connection string or ensure MongoDB is running');
  });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Session store configuration
const sessionStore = MongoStore.create({ 
  mongoUrl: MONGODB_URI,
  collectionName: 'sessions'
});

// Session
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Add user data to response locals
app.use(addUserData);

// Set up handlebars helpers
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

// Make io accessible to our routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join a room named after the user's ID when they authenticate
  socket.on('authenticate', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Apply routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/posts', postsRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationsRoutes);

// Error handler
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found',
    title: 'Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://<your-ip>:${PORT}`);
});