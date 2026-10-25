const statsService = require('../services/statsService');
const asyncHandler = require('../utils/asyncHandler');

const getOverview = asyncHandler(async (req, res) => {
  const scope = req.query.scope || (req.user.role === 'admin' ? 'all' : 'my');
  const days = parseInt(req.query.days, 10) || 30;

  const stats = await statsService.getOverview(req.user, { scope, days });

  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  getOverview
};
