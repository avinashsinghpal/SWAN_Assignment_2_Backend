const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token missing or invalid format'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Authentication token missing'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED'));
      }
      return next(ApiError.unauthorized('Invalid access token'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    if (!user.isActive) {
      return next(ApiError.forbidden('This user account has been deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
