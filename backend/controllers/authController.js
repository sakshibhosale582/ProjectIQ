const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Function 1: Creates a secure login token (JWT) using the user ID
// Valid for 30 days so the user stays logged in
const generateToken = (id) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Function 2: Registers a new user account
// Saves user details and returns a login token
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt only uses the first 72 bytes

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const escapeRegex = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds a user by e-mail. Case-insensitive fallback keeps accounts created before e-mails were lower-cased working.
const findUserByEmail = async (email) => {
  const exact = await User.findOne({ email });
  if (exact) return exact;
  return User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') });
};

const registerUser = async (req, res, next) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body.email);
  const password = body.password;

  try {
    // Reject non-string values (prevents NoSQL operator injection like {"$ne": null})
    if (!name || name.length > 80) return res.status(400).json({ message: 'Please enter your name (max 80 characters).' });
    if (!EMAIL_REGEX.test(email) || email.length > 254) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters long.` });
    }

    // Check if an account already exists with this email
    const userExists = await findUserByEmail(email);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create the user in MongoDB
    const user = await User.create({
      name,
      email,
      password
    });

    // Send back the user data and login token
    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Function 3: Logs in an existing user
// Validates password and returns login token
const loginUser = async (req, res, next) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = body.password;

  try {
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Please provide an email and password.' });
    }
    const user = await findUserByEmail(email);
    if (user && (await user.matchPassword(password))) {
      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
};

// Function 4: Fetches the logged-in user's profile
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  EMAIL_REGEX,
  normalizeEmail,
  registerUser,
  loginUser,
  getUserProfile,
  generateToken
};
