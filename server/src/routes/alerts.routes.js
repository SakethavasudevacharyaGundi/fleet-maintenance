const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getAlerts, dismissAlert } = require('../services/alerts');

const router = express.Router();

// GET /alerts
router.get('/', requireAuth, async (req, res) => {
  try {
    const alerts = await getAlerts();
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /alerts/:vehicleId/dismiss
// Manager only
router.post('/:vehicleId/dismiss', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { dueCycleStart } = req.body;

    if (!dueCycleStart) {
      return res.status(400).json({ error: 'dueCycleStart is required in body' });
    }

    const dismissal = await dismissAlert(vehicleId, dueCycleStart);
    res.json(dismissal);
  } catch (error) {
    console.error(error);
    if (error.message === 'Invalid dueCycleStart date') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
