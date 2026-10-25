const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  let error = err;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ApiError(400, message, 'INVALID_IDENTIFIER');
  }

  // Handle Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `A record with that ${field} already exists`;
    error = new ApiError(409, message, 'DUPLICATE_RESOURCE', [
      { field, message: `${field} must be unique` }
    ]);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    error = new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid authentication token', 'UNAUTHORIZED');
  } else if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Authentication token expired', 'TOKEN_EXPIRED');
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'An unexpected error occurred';
  const details = error.details || null;

  if (statusCode >= 500) {
    logger.error('Unhandled internal server error', {
      message: err.message,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
      details
    }
  });
}

module.exports = errorHandler;
