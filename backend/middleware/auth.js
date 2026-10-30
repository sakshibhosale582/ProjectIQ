const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware: Protects private API routes
// Only allows logged-in users with a valid token to access the route
const protect = async (req, res, next) => {
  let token;

  // Step 1: Read the token from the "Authorization: Bearer <token>" header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Step 2: Make sure JWT_SECRET is configured on the server
      if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
        console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty.');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error: JWT_SECRET is not configured.'
        });
      }

      // Step 3: Verify that the token is genuine and has not expired
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Step 4: Find the user in database (excluding their password for security)
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found, authentication failed' });
      }
      
      // Step 5: User is valid - proceed to the actual route handler
      next();
    } catch (error) {
      console.error('[Auth-Middleware Error]:', error.message);
      return res.status(401).json({ message: 'Not authorized, token validation failed' });
    }
  }

  // If no token was provided in the header, reject the request
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, validation token missing' });
  }
};

module.exports = { protect };
