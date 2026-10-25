const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} = require('../validators/authValidator');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

router.post(
  '/refresh',
  authController.refresh
);

router.post(
  '/logout',
  authenticate,
  authController.logout
);

router.get(
  '/me',
  authenticate,
  authController.getMe
);

router.patch(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateProfile
);

router.patch(
  '/me/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

module.exports = router;
