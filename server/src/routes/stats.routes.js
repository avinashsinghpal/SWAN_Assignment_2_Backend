const express = require('express');
const statsController = require('../controllers/statsController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

// GET /stats/overview
router.get('/overview', statsController.getOverview);

module.exports = router;
