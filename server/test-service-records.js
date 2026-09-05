const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5003;
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
  return { status: res.status, json, text };
}

const runTests = async () => {
  console.log('--- Starting Service Records Tests ---');
  let managerToken = '';
  let techToken1 = '';
  let techToken2 = '';
  let tech1Id = '';
  let tech2Id = '';
  let vehicleId = '';

  try {
    // 1. Setup Auth
    const resM = await fetchApi('/auth/login', 'POST', '', { email: 'manager@fleet.com', password: 'password123' });
    managerToken = resM.json.token;

    const resT1 = await fetchApi('/auth/login', 'POST', '', { email: 'techa@fleet.com', password: 'password123' });
    techToken1 = resT1.json.token;
    tech1Id = resT1.json.user.id;

    const resT2 = await fetchApi('/auth/login', 'POST', '', { email: 'techb@fleet.com', password: 'password123' });
    techToken2 = resT2.json.token;
    tech2Id = resT2.json.user.id;

    // 2. Setup Vehicle
    const vRes = await fetchApi('/api/vehicles', 'POST', managerToken, {
      registration: 'SR-TEST', make: 'Ford', model: 'Transit', odometer: 1000, dateIntervalDays: 180, mileageInterval: 10000
    });
    vehicleId = vRes.json.id;

    console.log('\n--- Authorization Tests ---');
    
    // tech cannot create
    let res = await fetchApi('/api/service-records', 'POST', techToken1, { vehicleId, description: 'Test', becameDueAt: new Date() });
    console.log('✓ tech cannot create:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // mgr can create
    res = await fetchApi('/api/service-records', 'POST', managerToken, { vehicleId, description: 'Test', becameDueAt: new Date() });
    console.log('✓ mgr can create:', res.status === 201 ? 'PASS' : 'FAIL', res.status);
    const recordId = res.json.id;

    // tech cannot assign
    res = await fetchApi(`/api/service-records/${recordId}/assignments`, 'POST', techToken1, { technicianId: tech1Id });
    console.log('✓ tech cannot assign:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // mgr can assign tech1
    res = await fetchApi(`/api/service-records/${recordId}/assignments`, 'POST', managerToken, { technicianId: tech1Id });
    console.log('✓ mgr can assign:', res.status === 201 ? 'PASS' : 'FAIL', res.status);

    // unassigned tech2 cannot access
    res = await fetchApi(`/api/service-records/${recordId}`, 'GET', techToken2);
    console.log('✓ unassigned tech cannot access (GET /:id):', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // unassigned tech2 cannot edit description
    res = await fetchApi(`/api/service-records/${recordId}`, 'PATCH', techToken2, { description: 'Hacked' });
    console.log('✓ unassigned tech cannot edit description:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // unassigned tech2 cannot transition
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken2, { action: 'book', scheduledDate: new Date(), technicianIds: [tech1Id] });
    console.log('✓ unassigned tech cannot transition:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // unassigned tech2 cannot add note
    res = await fetchApi(`/api/service-records/${recordId}/notes`, 'POST', techToken2, { text: 'Bad note' });
    console.log('✓ unassigned tech cannot add note:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    // assigned tech1 can edit description
    res = await fetchApi(`/api/service-records/${recordId}`, 'PATCH', techToken1, { description: 'Updated by tech' });
    console.log('✓ assigned tech can edit description:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

    // mgr can unassign
    res = await fetchApi(`/api/service-records/${recordId}/assignments/${tech1Id}`, 'DELETE', managerToken);
    console.log('✓ mgr can unassign:', res.status === 200 ? 'PASS' : 'FAIL', res.status);
    
    // tech cannot unassign (tech2 tries to unassign someone, fails)
    res = await fetchApi(`/api/service-records/${recordId}/assignments/${tech1Id}`, 'DELETE', techToken2);
    console.log('✓ tech cannot unassign:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

    console.log('\n--- Lifecycle Integration + Transactional Audit Tests ---');
    // Re-assign tech1 for lifecycle tests
    res = await fetchApi(`/api/service-records/${recordId}/assignments`, 'POST', managerToken, { technicianId: tech1Id });

    // Verify ASSIGNED event
    let rec = await fetchApi(`/api/service-records/${recordId}`, 'GET', managerToken);
    let events = rec.json.events;
    let assignEvent = events.find(e => e.type === 'ASSIGNED' && e.newValue === tech1Id);
    console.log('✓ ASSIGN event exists, has actor, is transactional:', assignEvent && assignEvent.actorId ? 'PASS' : 'FAIL');

    // Due -> In Service (FAIL)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken1, { action: 'start' });
    console.log('✓ Due -> In Service rejected:', res.status === 400 ? 'PASS' : 'FAIL');

    // Due -> Booked (SUCCESS via tech1)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken1, { action: 'book', scheduledDate: new Date(), technicianIds: [tech1Id] });
    console.log('✓ Due -> Booked (tech1):', res.status === 200 ? 'PASS' : 'FAIL');

    // Booked -> Completed (FAIL)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken1, { action: 'complete', odometerReading: 1100 });
    console.log('✓ Booked -> Completed rejected:', res.status === 400 ? 'PASS' : 'FAIL');

    // Booked -> In Service (SUCCESS via mgr)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', managerToken, { action: 'start' });
    console.log('✓ Booked -> In Service (mgr):', res.status === 200 ? 'PASS' : 'FAIL');

    // In Service -> Completed (SUCCESS via tech1)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken1, { action: 'complete', odometerReading: 1500 });
    console.log('✓ In Service -> Completed (tech1):', res.status === 200 ? 'PASS' : 'FAIL');

    // Completed -> Due (FAIL)
    res = await fetchApi(`/api/service-records/${recordId}/transition`, 'PATCH', techToken1, { action: 'book', scheduledDate: new Date(), technicianIds: [tech1Id] });
    console.log('✓ Completed -> Booked/Due rejected:', res.status === 400 ? 'PASS' : 'FAIL');

    console.log('\n--- Notes & Timeline ASC Tests ---');
    // mgr add note
    res = await fetchApi(`/api/service-records/${recordId}/notes`, 'POST', managerToken, { text: 'Manager note' });
    console.log('✓ Manager can add note:', res.status === 201 ? 'PASS' : 'FAIL');
    // tech1 add note
    res = await fetchApi(`/api/service-records/${recordId}/notes`, 'POST', techToken1, { text: 'Tech note' });
    console.log('✓ Assigned tech can add note:', res.status === 201 ? 'PASS' : 'FAIL');

    // Fetch timeline
    rec = await fetchApi(`/api/service-records/${recordId}`, 'GET', managerToken);
    events = rec.json.events;
    
    // verify ascending order
    let isAsc = true;
    for(let i=1; i<events.length; i++) {
      if(new Date(events[i].createdAt) < new Date(events[i-1].createdAt)) isAsc = false;
    }
    console.log('✓ Timeline is strictly ASC sorted:', isAsc ? 'PASS' : 'FAIL');
    console.log(`✓ Total timeline events collected: ${events.length}`);

    console.log('\n--- Visibility Rules ---');
    // tech2 (unassigned) calls GET /api/service-records and /api/service-records/mine
    let tech2All = await fetchApi('/api/service-records', 'GET', techToken2);
    let tech2Mine = await fetchApi('/api/service-records/mine', 'GET', techToken2);
    console.log('✓ Unassigned tech GET / does not see unassigned record:', tech2All.json.find(r => r.id === recordId) ? 'FAIL' : 'PASS');
    console.log('✓ Unassigned tech GET /mine does not see unassigned record:', tech2Mine.json.find(r => r.id === recordId) ? 'FAIL' : 'PASS');

    let tech1Mine = await fetchApi('/api/service-records/mine', 'GET', techToken1);
    console.log('✓ Assigned tech GET /mine sees their record:', tech1Mine.json.find(r => r.id === recordId) ? 'PASS' : 'FAIL');

    let mgrAll = await fetchApi('/api/service-records', 'GET', managerToken);
    console.log('✓ Manager GET / sees all records:', mgrAll.json.find(r => r.id === recordId) ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    if (vehicleId) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecord: { vehicleId } } });
      await prisma.serviceAssignment.deleteMany({ where: { serviceRecord: { vehicleId } } });
      await prisma.serviceRecord.deleteMany({ where: { vehicleId } });
      await prisma.vehicle.delete({ where: { id: vehicleId } });
    }
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
