const express = require('express');
const prisma = require('../utils/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const bcrypt = require('bcrypt');

function staffId(email) {
  const match = email.match(/tech([a-j])/i);
  return match ? `TECH-${match[1].toUpperCase()}` : 'TECH';
}

router.post('/technicians', requireAuth, requireRole('MANAGER'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newTechnician = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'TECHNICIAN'
      }
    });

    res.status(201).json({
      id: newTechnician.id,
      name: newTechnician.name,
      email: newTechnician.email,
      role: newTechnician.role,
      staffId: staffId(newTechnician.email)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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