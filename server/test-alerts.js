const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5005;
const server = http.createServer(app);

async function fetchApi(path, method, token, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`http://localhost:${PORT}${path}`, options);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch(e) {}
  return { status: res.status, json };
}

const runTests = async () => {
  console.log('--- Starting Alerts & Reappearance Tests ---');
  let managerToken = '';
  let vehicleId = '';
  let dueCycle1 = '';
  let dueCycle2 = '';

  try {
    // 1. Setup Auth
    const resM = await fetchApi('/auth/login', 'POST', '', { email: 'manager@fleet.com', password: 'password123' });
    managerToken = resM.json.token;

    // 2. Setup Vehicle
    const vRes = await fetchApi('/api/vehicles', 'POST', managerToken, {
      registration: 'ALERT-1', make: 'Honda', model: 'Civic', odometer: 5000, dateIntervalDays: 180, mileageInterval: 10000
    });
    vehicleId = vRes.json.id;

    // The grace period is defaulted to 7 days, so we make becameDueAt 8 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    // 3. CYCLE 1: Create a DUE record that is overdue
    const cycle1Res = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId,
      description: 'Cycle 1 Maintenance',
      becameDueAt: eightDaysAgo.toISOString()
    });
    const record1Id = cycle1Res.json.id;
    dueCycle1 = cycle1Res.json.becameDueAt;

    // Verify it appears in alerts
    let alertsRes = await fetchApi('/api/alerts', 'GET', managerToken);
    let alertFound = alertsRes.json.some(a => a.id === record1Id);
    console.log('✓ Alert appears initially:', alertFound ? 'PASS' : 'FAIL');

    // 4. DISMISS CYCLE 1
    const dismissRes = await fetchApi(`/api/alerts/${vehicleId}/dismiss`, 'POST', managerToken, { dueCycleStart: dueCycle1 });
    console.log('✓ Dismissal created:', dismissRes.status === 200 ? 'PASS' : 'FAIL');

    // Verify it no longer appears
    alertsRes = await fetchApi('/api/alerts', 'GET', managerToken);
    alertFound = alertsRes.json.some(a => a.id === record1Id);
    console.log('✓ Alert removed after dismiss:', !alertFound ? 'PASS' : 'FAIL');

    // 5. Complete Cycle 1
    await fetchApi(`/api/service-records/${record1Id}/transition`, 'PATCH', managerToken, { action: 'book', scheduledDate: new Date().toISOString(), technicianIds: [] });
    await fetchApi(`/api/service-records/${record1Id}/transition`, 'PATCH', managerToken, { action: 'start' });
    await fetchApi(`/api/service-records/${record1Id}/transition`, 'PATCH', managerToken, { action: 'complete', odometerReading: 5100 });

    // 6. CYCLE 2: Create a NEW DUE record that is overdue
    const cycle2Res = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId,
      description: 'Cycle 2 Maintenance',
      becameDueAt: new Date(eightDaysAgo.getTime() + 1000).toISOString() // 1 second later
    });
    const record2Id = cycle2Res.json.id;
    dueCycle2 = cycle2Res.json.becameDueAt;

    // Re-fetch alerts to see if the NEW overdue record shows up despite previous dismissal
    alertsRes = await fetchApi('/api/alerts', 'GET', managerToken);
    alertFound = alertsRes.json.some(a => a.id === record2Id);
    console.log('✓ Alert reappears for new cycle:', alertFound ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    if (vehicleId) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecord: { vehicleId } } });
      await prisma.serviceAssignment.deleteMany({ where: { serviceRecord: { vehicleId } } });
      await prisma.serviceRecord.deleteMany({ where: { vehicleId } });
      await prisma.alertDismissal.deleteMany({ where: { vehicleId } });
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    }
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
