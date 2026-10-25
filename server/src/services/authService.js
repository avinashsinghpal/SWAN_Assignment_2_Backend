const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

async function createRefreshTokenRecord({ user, family = null, userAgent = '', ip = '' }) {
  const tokenString = generateRefreshTokenString();
  const tokenHash = hashToken(tokenString);
  const tokenFamily = family || crypto.randomUUID();

  // 7 days expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    family: tokenFamily,
    expiresAt,
    userAgent,
    ip
  });

  return tokenString;
}

class AuthService {
  async register({ name, email, password, role }, { userAgent = '', ip = '' } = {}) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const passwordHash = await User.hashPassword(password);
    const assignedRole = (role === 'admin' || role === 'user') ? role : 'user';

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: assignedRole,
      isActive: true
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshTokenRecord({
      user,
      userAgent,
      ip
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  async login({ email, password }, { userAgent = '', ip = '' } = {}) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This user account has been deactivated');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshTokenRecord({
      user,
      userAgent,
      ip
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  async refreshToken(rawRefreshToken, { userAgent = '', ip = '' } = {}) {
    if (!rawRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await RefreshToken.findOne({ tokenHash });

    if (!existingToken) {
      // Possible reuse attack: token not found
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (existingToken.isRevoked()) {
      // REUSE DETECTION: An already revoked token was used again!
      // Invalidate all tokens in the entire family to prevent compromise
      await RefreshToken.updateMany(
        { family: existingToken.family },
        { revokedAt: new Date() }
      );
      throw ApiError.unauthorized('Invalid refresh token: session compromised');
    }

    if (existingToken.isExpired()) {
      throw ApiError.unauthorized('Refresh token has expired');
    }

    const user = await User.findById(existingToken.user);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    // Revoke the current token (rotation)
    existingToken.revokedAt = new Date();
    await existingToken.save();

    // Issue new access and refresh tokens in the SAME family
    const accessToken = generateAccessToken(user);
    const newRefreshToken = await createRefreshTokenRecord({
      user,
      family: existingToken.family,
      userAgent,
      ip
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(rawRefreshToken) {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.findOneAndUpdate(
      { tokenHash },
      { revokedAt: new Date() }
    );
  }

  async updateProfile(userId, { name }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.name = name;
    await user.save();

    return user.toJSON();
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect', 'INVALID_CREDENTIALS');
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    // Revoke all active refresh tokens for this user
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { revokedAt: new Date() }
    );

    return { message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
