const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getMembers = asyncHandler(async (req, res) => {
  const members = await userService.getMembers();
  res.status(200).json({
    success: true,
    data: { members }
  });
});

const getUsersList = asyncHandler(async (req, res) => {
  const result = await userService.getUsersList(req.query);
  res.status(200).json({
    success: true,
    data: { users: result.users },
    meta: result.meta
  });
});

const updateUserRoleOrStatus = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUserRoleOrStatus(
    req.params.id,
    req.body,
    req.user
  );
  res.status(200).json({
    success: true,
    data: { user: updatedUser }
  });
});

module.exports = {
  getMembers,
  getUsersList,
  updateUserRoleOrStatus
};
