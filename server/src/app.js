const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const serviceRecordRoutes = require('./routes/serviceRecord.routes');
const alertRoutes = require('./routes/alerts.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const { requireAuth, requireRole } = require('./middleware/auth.middleware');

app.use('/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/service-records', serviceRecordRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Public summary stats (no auth — shown on login page)
const prisma = require('./utils/prisma');
app.get('/api/public/stats', async (req, res) => {
  try {
    const [fleet, inService, overdue, completedYTD] = await Promise.all([
      prisma.vehicle.count({ where: { archivedAt: null } }),
      prisma.serviceRecord.count({ where: { status: 'IN_SERVICE' } }),
      prisma.serviceRecord.count({
        where: {
          status: 'DUE',
          becameDueAt: { lt: new Date(Date.now() - (parseInt(process.env.GRACE_PERIOD_DAYS || '7') * 86400000)) }
        }
      }),
      prisma.serviceRecord.count({
        where: { status: 'COMPLETED', completedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } }
      }),
    ]);
    res.json({ fleet, inService, overdue, completedYTD });
  } catch (e) {
    res.status(500).json({ fleet: 0, inService: 0, overdue: 0, completedYTD: 0 });
  }
});

// Test protected endpoints
app.get('/api/protected/manager', requireAuth, requireRole('MANAGER'), (req, res) => {
  res.json({ message: 'Welcome Manager', user: req.user });
});

app.get('/api/protected/tech', requireAuth, requireRole('TECHNICIAN'), (req, res) => {
  res.json({ message: 'Welcome Technician', user: req.user });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
