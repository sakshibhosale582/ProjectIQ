const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const TEST_SECRET = 'test_jwt_secret_key_12345_secure_mock';
process.env.JWT_SECRET = TEST_SECRET;

const { generateToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { errorHandler } = require('../middleware/error');

// Helper to create mock response
const createMockRes = () => {
  const res = {
    statusCode: 200,
    jsonPayload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    }
  };
  return res;
};

describe('Auth Suite: Token Generation, Protection & Validation', () => {

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  describe('JWT Token Generation', () => {
    it('generates a valid signed JWT containing the user id', () => {
      const userId = 'user_test_123456';
      const token = generateToken(userId);
      assert.ok(token, 'Token should be non-empty string');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      assert.strictEqual(decoded.id, userId);
    });

    it('fails safely when JWT_SECRET is missing or empty', () => {
      try {
        delete process.env.JWT_SECRET;
        assert.throws(
          () => generateToken('any_id'),
          /JWT_SECRET environment variable is missing/
        );
      } finally {
        process.env.JWT_SECRET = TEST_SECRET;
      }
    });
  });

  describe('Password Security & Hashing', () => {
    it('hashes passwords securely using bcrypt', async () => {
      const rawPassword = 'SecurePassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(rawPassword, salt);

      assert.notStrictEqual(hash, rawPassword);
      const isMatch = await bcrypt.compare(rawPassword, hash);
      assert.strictEqual(isMatch, true);

      const isWrongMatch = await bcrypt.compare('WrongPassword!', hash);
      assert.strictEqual(isWrongMatch, false);
    });
  });

  describe('Auth Middleware (protect)', () => {
    it('rejects requests with missing Authorization header', async () => {
      const req = { headers: {} };
      const res = createMockRes();
      let nextCalled = false;

      await protect(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.ok(res.jsonPayload.message.includes('Not authorized'));
    });

    it('rejects requests with invalid Bearer token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.corrupted.token'
        }
      };
      const res = createMockRes();
      let nextCalled = false;

      await protect(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.ok(res.jsonPayload.message.includes('token validation failed'));
    });

    it('rejects expired JWT tokens with clear expiration message', async () => {
      const expiredToken = jwt.sign(
        { id: 'expired_user' },
        TEST_SECRET,
        { expiresIn: '0s' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      };
      const res = createMockRes();
      let nextCalled = false;

      await protect(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Registration & Login Error Handling', () => {
    it('formats duplicate key registration error (code 11000) cleanly', () => {
      const res = createMockRes();
      const err = {
        code: 11000,
        keyValue: { email: 'developer@projectiq.io' }
      };

      errorHandler(err, {}, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.strictEqual(
        res.jsonPayload.message,
        'An account with this email already exists. Please log in or use a different email.'
      );
    });

    it('formats Mongoose schema validation error cleanly', () => {
      const res = createMockRes();
      const err = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Please add a valid email' },
          password: { message: 'Password must be at least 6 characters' }
        }
      };

      errorHandler(err, {}, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('valid email'));
      assert.ok(res.jsonPayload.message.includes('at least 6 characters'));
    });
  });
});
