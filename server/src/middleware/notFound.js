const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Endpoint ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND'));
}

module.exports = notFound;
