const express = require('express');
const { stringify } = require('csv-stringify/sync');
const prisma = require('../utils/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { book, start, complete, LifecycleError } = require('../services/lifecycle');
const { updateDescription, assignTechnician, unassignTechnician, addNote, searchServiceRecords, exportServiceRecords, ServiceRecordError } = require('../services/serviceRecord');

const router = express.Router();

/**
 * Helper to determine if the authenticated user has access to a specific service record.
 * Managers have global access. Technicians only have access if they are assigned.
 */
async function hasRecordAccess(req, recordId) {
  if (req.user.role === 'MANAGER') return true;

  const assignment = await prisma.serviceAssignment.findUnique({
    where: {
      serviceRecordId_technicianId: {
        serviceRecordId: recordId,
        technicianId: req.user.userId
      }
    }
  });

  return !!assignment;
}

// GET /export.csv
// Must be registered BEFORE /mine and /:id
router.get('/export.csv', requireAuth, async (req, res) => {
  try {
    const baseWhere = req.user.role === 'TECHNICIAN' 
      ? { assignments: { some: { technicianId: req.user.userId } } } 
      : {};
      
    const records = await exportServiceRecords(req.query, baseWhere);

    const csvData = records.map(r => ({
      vehicle_make: r.vehicle.make,
      vehicle_model: r.vehicle.model,
      registration: r.vehicle.registration,
      description: r.description,
      status: r.status,
      scheduled_date: r.scheduledDate ? r.scheduledDate.toISOString() : '',
      created_at: r.createdAt.toISOString(),
      completed_at: r.completedAt ? r.completedAt.toISOString() : ''
    }));

    const csvString = stringify(csvData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="service_records.csv"');
    res.send(csvString);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /mine
// Must be registered BEFORE /:id
router.get('/mine', requireAuth, requireRole('TECHNICIAN'), async (req, res) => {
  try {
    const baseWhere = {
      assignments: { some: { technicianId: req.user.userId } }
    };
    
    const result = await searchServiceRecords(req.query, baseWhere);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /
router.get('/', requireAuth, async (req, res) => {
  try {
    const baseWhere = req.user.role === 'TECHNICIAN' 
      ? { assignments: { some: { technicianId: req.user.userId } } } 
      : {};
      
    const result = await searchServiceRecords(req.query, baseWhere);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await hasRecordAccess(req, id))) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }

    const record = await prisma.serviceRecord.findUnique({
      where: { id },
      include: {
        vehicle: true,
        assignments: {
          include: { technician: true }
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: { actor: true }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Service record not found' });
    }

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /
// Manager only
router.post('/', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { vehicleId, description, becameDueAt } = req.body;

    if (!vehicleId || !description || !becameDueAt) {
      return res.status(400).json({ error: 'vehicleId, description, and becameDueAt are required' });
    }

    const record = await prisma.$transaction(async (tx) => {
      const newRecord = await tx.serviceRecord.create({
        data: {
          vehicleId,
          description,
          status: 'DUE',
          becameDueAt: new Date(becameDueAt)
        }
      });

      await tx.serviceEvent.create({
        data: {
          serviceRecordId: newRecord.id,
          actorId: req.user.userId,
          type: 'CREATED'
        }
      });

      return newRecord;
    });

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id
// Manager or assigned technician
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Explicit whitelist of allowed fields
    const { description, ...otherFields } = req.body;

    if (Object.keys(otherFields).length > 0) {
      return res.status(400).json({ error: 'Only description can be updated via this endpoint' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!(await hasRecordAccess(req, id))) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }

    const updated = await updateDescription(id, description, req.user.userId);
    res.json(updated);
  } catch (error) {
    if (error instanceof ServiceRecordError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id/transition
// Manager or assigned technician
router.patch('/:id/transition', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, scheduledDate, technicianIds, odometerReading } = req.body;
    // action: 'book', 'start', 'complete'

    if (!(await hasRecordAccess(req, id))) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }

    let result;
    if (action === 'book') {
      result = await book(id, scheduledDate, technicianIds, req.user.userId);
    } else if (action === 'start') {
      result = await start(id, req.user.userId);
    } else if (action === 'complete') {
      result = await complete(id, odometerReading, req.user.userId);
    } else {
      return res.status(400).json({ error: 'Invalid transition action' });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof LifecycleError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/assignments
// Manager only
router.post('/:id/assignments', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({ error: 'technicianId is required' });
    }

    const assignment = await assignTechnician(id, technicianId, req.user.userId);
    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof ServiceRecordError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id/assignments/:techId
// Manager only
router.delete('/:id/assignments/:techId', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { id, techId } = req.params;

    await unassignTechnician(id, techId, req.user.userId);
    res.json({ message: 'Technician unassigned' });
  } catch (error) {
    if (error instanceof ServiceRecordError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/notes
// Manager or assigned technician
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!(await hasRecordAccess(req, id))) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }

    const note = await addNote(id, text, req.user.userId);
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof ServiceRecordError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
