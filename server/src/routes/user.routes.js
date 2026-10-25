const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { paramIdSchema } = require('../validators/commonValidator');
const {
  updateUserRoleOrStatusSchema,
  userQuerySchema
} = require('../validators/userValidator');

const router = express.Router();

router.use(authenticate);

// Members list for assignee picker (accessible by all authenticated users)
router.get('/members', userController.getMembers);

// Admin-only user management routes
router.get('/', authorize('admin'), validate({ query: userQuerySchema }), userController.getUsersList);
router.patch(
  '/:id',
  authorize('admin'),
  validate({ params: paramIdSchema, body: updateUserRoleOrStatusSchema }),
  userController.updateUserRoleOrStatus
);

module.exports = router;
