const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

/**
 * Middleware factory for validating request parts with Zod schemas.
 * @param {Object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return next(
        new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details)
      );
    }
    next(error);
  }
};

module.exports = validate;
