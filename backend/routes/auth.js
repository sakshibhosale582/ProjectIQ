const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');
const {
  registerUser,
  loginUser,
  getUserProfile
} = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Register a new developer account
router.post('/register', authLimiter, registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user and return token
router.post('/login', authLimiter, loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile data
router.get('/profile', protect, getUserProfile);

module.exports = router;
