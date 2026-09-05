const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const prisma = require('../utils/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// POST /bulk-odometer
// Manager only
router.post('/bulk-odometer', requireAuth, requireRole('MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  try {
    const csvData = req.file.buffer.toString('utf-8');
    parse(csvData, { columns: header => header.map(c => c.toLowerCase()), skip_empty_lines: true }, async (err, records) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid CSV format' });
      }

      let total = records.length;
      let succeeded = 0;
      let failed = 0;
      const rows = [];
      const seenRegistrations = new Set();

      for (let i = 0; i < records.length; i++) {
        // rowNum = i + 2 because line 1 is header
        const displayRow = i + 2; 
        const row = records[i];
        
        const registration = row.registration || row.reg;
        const odometerRaw = row.odometer;

        if (!registration || odometerRaw === undefined) {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'missing registration or odometer' });
          continue;
        }

        if (seenRegistrations.has(registration)) {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'duplicate registration row' });
          continue;
        }
        seenRegistrations.add(registration);

        const newReading = parseInt(odometerRaw, 10);
        if (isNaN(newReading)) {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'invalid number' });
          continue;
        }

        if (newReading < 0) {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'negative odometer' });
          continue;
        }

        // Look up vehicle
        const vehicle = await prisma.vehicle.findUnique({
          where: { registration }
        });

        if (!vehicle) {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'vehicle not found' });
          continue;
        }

        // Monotonic guarded update
        const updateResult = await prisma.vehicle.updateMany({
          where: {
            id: vehicle.id,
            odometer: { lte: newReading }
          },
          data: { odometer: newReading }
        });

        if (updateResult.count === 1) {
          succeeded++;
          rows.push({ row: displayRow, status: 'success' });
        } else {
          failed++;
          rows.push({ row: displayRow, status: 'rejected', reason: 'lower than current' });
        }
      }

      res.json({ total, succeeded, failed, rows });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicles
// All authenticated users can view vehicles. By default, hides archived vehicles.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const whereClause = includeArchived === 'true' ? {} : { archivedAt: null };
    
    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        serviceRecords: {
          where: { status: { in: ['DUE', 'BOOKED', 'IN_SERVICE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            assignments: {
              include: { technician: true }
            }
          }
        }
      }
    });

    const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10);
    const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const formattedVehicles = vehicles.map(v => {
      let status = 'OK';
      let technician = 'Unassigned';
      
      if (v.serviceRecords.length > 0) {
        const sr = v.serviceRecords[0];
        status = sr.status === 'IN_SERVICE' ? 'IN SERVICE' : sr.status;
        if (sr.status === 'DUE') {
           const becameDueTime = new Date(sr.becameDueAt).getTime();
           if (now - becameDueTime > gracePeriodMs) {
             status = 'OVERDUE';
           }
        }
        if (sr.assignments.length > 0) {
          technician = sr.assignments.map(a => a.technician.email.split('@')[0]).join(', ');
        }
      } else {
        const msSinceLast = v.lastCompletedDate ? now - v.lastCompletedDate.getTime() : Infinity;
        const msInterval = v.dateIntervalDays * 24 * 60 * 60 * 1000;
        const mileageSinceLast = v.lastCompletedOdometer != null ? v.odometer - v.lastCompletedOdometer : Infinity;
        
        if (msSinceLast >= msInterval || mileageSinceLast >= v.mileageInterval) {
          status = 'DUE';
        }
      }

      let nextServiceDue = 'Unknown';
      if (v.lastCompletedDate) {
         const nextDate = new Date(v.lastCompletedDate.getTime() + v.dateIntervalDays * 24 * 60 * 60 * 1000);
         nextServiceDue = nextDate.toISOString().split('T')[0];
      } else {
         nextServiceDue = new Date(now).toISOString().split('T')[0];
      }

      return {
        ...v,
        status,
        nextServiceDue,
        technician
      };
    });
    
    res.json(formattedVehicles);
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
