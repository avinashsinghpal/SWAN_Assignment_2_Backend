const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 200 : 503;

  res.status(status).json({
    success: isDbConnected,
    status: isDbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isDbConnected ? 'connected' : 'disconnected'
  });
});

module.exports = router;
