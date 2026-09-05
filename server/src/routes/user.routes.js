const express = require('express');
const prisma = require('../utils/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

function staffId(email) {
  const match = email.match(/tech([a-j])/i);
  return match ? `TECH-${match[1].toUpperCase()}` : 'TECH';
}

router.get('/technicians', requireAuth, requireRole('MANAGER'), async (req, res) => {
  const technicians = await prisma.user.findMany({
    where: { role: 'TECHNICIAN' },
    orderBy: { name: 'asc' },
    select: { id: true, email: true, name: true, role: true }
  });

  res.json(technicians.map(technician => ({
    ...technician,
    staffId: staffId(technician.email)
  })));
});

router.get('/:id', requireAuth, requireRole('MANAGER'), async (req, res) => {
  const technician = await prisma.user.findUnique({
    where: { id: req.params.id, role: 'TECHNICIAN' },
    select: { id: true, email: true, name: true, role: true, assignedServices: {
      include: { serviceRecord: { include: { vehicle: true } } }
    } }
  });

  if (!technician) return res.status(404).json({ error: 'Technician not found' });

  res.json({
    id: technician.id,
    email: technician.email,
    name: technician.name,
    role: technician.role,
    staffId: staffId(technician.email),
    records: technician.assignedServices.map(assignment => assignment.serviceRecord)
  });
});

module.exports = router;