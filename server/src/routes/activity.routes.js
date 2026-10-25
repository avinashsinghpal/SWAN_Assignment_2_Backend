const express = require('express');
const activityController = require('../controllers/activityController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

// GET /activity - Global activity feed
router.get('/', activityController.getGlobalActivity);

module.exports = router;
