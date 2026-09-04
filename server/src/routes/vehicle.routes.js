const express = require('express');
const prisma = require('../utils/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /vehicles
// All authenticated users can view vehicles. By default, hides archived vehicles.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const whereClause = includeArchived === 'true' ? {} : { archivedAt: null };
    
    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicles/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        serviceRecords: true
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vehicles
// Manager only
router.post('/', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { registration, make, model, odometer, dateIntervalDays, mileageInterval } = req.body;
    
    // Validation
    if (!registration || !make || !model) {
      return res.status(400).json({ error: 'Registration, make, and model are required' });
    }
    if (odometer == null || odometer < 0) {
      return res.status(400).json({ error: 'Odometer must be 0 or greater' });
    }
    if (!dateIntervalDays || dateIntervalDays <= 0) {
      return res.status(400).json({ error: 'Date interval days must be greater than 0' });
    }
    if (!mileageInterval || mileageInterval <= 0) {
      return res.status(400).json({ error: 'Mileage interval must be greater than 0' });
    }

    const existing = await prisma.vehicle.findUnique({ where: { registration } });
    if (existing) {
      return res.status(409).json({ error: 'Registration already exists' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registration,
        make,
        model,
        odometer,
        dateIntervalDays,
        mileageInterval
      }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Registration already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /vehicles/:id
// Manager only
router.put('/:id', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Destructuring explicitly prevents updating lastCompletedDate, lastCompletedOdometer, or relations
    const { registration, make, model, odometer, dateIntervalDays, mileageInterval } = req.body;

    // Optional validation (only validate what is provided)
    if (odometer != null && odometer < 0) {
      return res.status(400).json({ error: 'Odometer must be 0 or greater' });
    }
    if (dateIntervalDays != null && dateIntervalDays <= 0) {
      return res.status(400).json({ error: 'Date interval days must be greater than 0' });
    }
    if (mileageInterval != null && mileageInterval <= 0) {
      return res.status(400).json({ error: 'Mileage interval must be greater than 0' });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        registration,
        make,
        model,
        odometer,
        dateIntervalDays,
        mileageInterval
      }
    });

    res.json(vehicle);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Registration already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vehicles/:id/archive
// Manager only
router.post('/:id/archive', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        archivedAt: new Date()
      }
    });

    res.json({ message: 'Vehicle archived', vehicle });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vehicles/:id/restore
// Manager only
router.post('/:id/restore', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        archivedAt: null
      }
    });

    res.json({ message: 'Vehicle restored', vehicle });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
