const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getDashboardMetrics } = require('../services/dashboard');

const router = express.Router();

// GET /dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const metrics = await getDashboardMetrics(req.user.role, req.user.userId);
    res.json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
