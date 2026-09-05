const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5007;
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
  console.log('--- Starting Phase 11 Dashboard Tests ---');
  let managerToken = '';
  let techToken = '';
  let techId = '';
  let vehicleId = '';
  let records = [];

  try {
    // 1. Setup Auth
    const resM = await fetchApi('/auth/login', 'POST', '', { email: 'manager@fleet.com', password: 'password123' });
    managerToken = resM.json.token;

    const resT = await fetchApi('/auth/login', 'POST', '', { email: 'techa@fleet.com', password: 'password123' });
    techToken = resT.json.token;
    techId = resT.json.user.id;

    // 2. Setup Vehicle
    const vRes = await fetchApi('/api/vehicles', 'POST', managerToken, {
      registration: 'DASH-1', make: 'Ford', model: 'Transit', odometer: 1000, dateIntervalDays: 180, mileageInterval: 10000
    });
    vehicleId = vRes.json.id;

    // 3. Create records for dashboard stats
    // One overdue (assigned to tech)
    const overdueRes = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId, description: 'Overdue task', becameDueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    });
    records.push(overdueRes.json.id);
    await fetchApi(`/api/service-records/${overdueRes.json.id}/assignments`, 'POST', managerToken, { technicianId: techId });

    // One just due (not overdue) (not assigned)
    const dueRes = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId, description: 'Due task', becameDueAt: new Date().toISOString()
    });
    records.push(dueRes.json.id);

    // One in service (assigned to tech)
    const inServiceRes = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId, description: 'In service task', becameDueAt: new Date().toISOString()
    });
    records.push(inServiceRes.json.id);
    await fetchApi(`/api/service-records/${inServiceRes.json.id}/assignments`, 'POST', managerToken, { technicianId: techId });
    await fetchApi(`/api/service-records/${inServiceRes.json.id}/transition`, 'PATCH', managerToken, { action: 'book', scheduledDate: new Date().toISOString(), technicianIds: [techId] });
    await fetchApi(`/api/service-records/${inServiceRes.json.id}/transition`, 'PATCH', managerToken, { action: 'start' });

    // One completed this week (assigned to tech)
    const compWeekRes = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId, description: 'Completed this week', becameDueAt: new Date().toISOString()
    });
    records.push(compWeekRes.json.id);
    await fetchApi(`/api/service-records/${compWeekRes.json.id}/assignments`, 'POST', managerToken, { technicianId: techId });
    await fetchApi(`/api/service-records/${compWeekRes.json.id}/transition`, 'PATCH', managerToken, { action: 'book', scheduledDate: new Date().toISOString(), technicianIds: [techId] });
    await fetchApi(`/api/service-records/${compWeekRes.json.id}/transition`, 'PATCH', managerToken, { action: 'start' });
    await fetchApi(`/api/service-records/${compWeekRes.json.id}/transition`, 'PATCH', managerToken, { action: 'complete', odometerReading: 1100 });

    // One completed 2 weeks ago (not assigned, we must manipulate completedAt manually for testing since lifecycle uses now)
    const compOldRes = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId, description: 'Completed old', becameDueAt: new Date().toISOString()
    });
    records.push(compOldRes.json.id);
    await prisma.serviceRecord.update({
      where: { id: compOldRes.json.id },
      data: { status: 'COMPLETED', completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    });

    // 4. Test Dashboard for Manager
    const dashM = await fetchApi('/api/dashboard', 'GET', managerToken);
    const m = dashM.json;
    
    console.log('--- Manager Dashboard Dump ---');
    console.log(JSON.stringify(m, null, 2));
    
    console.log('✓ Manager Dashboard structure:', dashM.status === 200 ? 'PASS' : 'FAIL');
    console.log('✓ Manager summary.vehiclesDue (2 due):', m.summary.vehiclesDue >= 2 ? 'PASS' : 'FAIL');
    console.log('✓ Manager summary.vehiclesOverdue (1 overdue):', m.summary.vehiclesOverdue >= 1 ? 'PASS' : 'FAIL');
    console.log('✓ Manager summary.vehiclesInService (1 in service):', m.summary.vehiclesInService >= 1 ? 'PASS' : 'FAIL');
    console.log('✓ Manager summary.completedThisWeek (1 completed):', m.summary.completedThisWeek >= 1 ? 'PASS' : 'FAIL');
    console.log('✓ Manager weekly trend (8 weeks):', m.weeklyCompleted.length === 8 ? 'PASS' : 'FAIL');
    console.log('✓ Manager weekly zero-filled (last week has 1, 3 weeks ago has 1):', 
      m.weeklyCompleted.filter(w => w.count >= 1).length >= 2 && m.weeklyCompleted.some(w => w.count === 0) ? 'PASS' : 'FAIL'
    );
    console.log('✓ Manager byTechnician (techa has 3 assignments):', m.byTechnician.find(t => t.technicianId === techId)?.count >= 3 ? 'PASS' : 'FAIL');

    // 5. Test Dashboard for Technician
    const dashT = await fetchApi('/api/dashboard', 'GET', techToken);
    const t = dashT.json;

    console.log('✓ Tech summary.vehiclesDue (1 due):', t.summary.vehiclesDue >= 1 ? 'PASS' : 'FAIL');
    console.log('✓ Tech summary.vehiclesOverdue (1 overdue):', t.summary.vehiclesOverdue >= 1 ? 'PASS' : 'FAIL');
    console.log('✓ Tech summary.completedThisWeek (1 completed):', t.summary.completedThisWeek >= 1 ? 'PASS' : 'FAIL');
    // Tech has no access to the completed old task (not assigned)
    console.log('✓ Tech weekly zero-filled (last week has 1, 3 weeks ago has 0):', 
      t.weeklyCompleted.filter(w => w.count >= 1).length >= 1 && t.weeklyCompleted.some(w => w.count === 0) ? 'PASS' : 'FAIL'
    );

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    if (records.length > 0) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecordId: { in: records } } });
      await prisma.serviceAssignment.deleteMany({ where: { serviceRecordId: { in: records } } });
      await prisma.serviceRecord.deleteMany({ where: { id: { in: records } } });
    }
    if (vehicleId) {
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
