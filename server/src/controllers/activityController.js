const activityService = require('../services/activityService');
const asyncHandler = require('../utils/asyncHandler');

const getTaskActivity = asyncHandler(async (req, res) => {
  const activities = await activityService.getTaskActivity(req.params.id);
  res.status(200).json({
    success: true,
    data: { activities }
  });
});

const getGlobalActivity = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 30;
  const type = req.query.type || undefined;

  const result = await activityService.getGlobalActivity({
    user: req.user,
    type,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: { activities: result.activities },
    meta: result.meta
  });
});

module.exports = {
  getTaskActivity,
  getGlobalActivity
};
