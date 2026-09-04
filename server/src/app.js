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
const { requireAuth, requireRole } = require('./middleware/auth.middleware');

app.use('/auth', authRoutes);

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
