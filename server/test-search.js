const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5004;
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
  console.log('--- Starting Search & Pagination Tests ---');
  let managerToken = '';
  let techToken = '';
  let techId = '';
  let vehicle1 = '';
  let vehicle2 = '';
  let records = [];

  try {
    // 1. Setup Auth
    const resM = await fetchApi('/auth/login', 'POST', '', { email: 'manager@fleet.com', password: 'password123' });
    managerToken = resM.json.token;

    const resT = await fetchApi('/auth/login', 'POST', '', { email: 'techa@fleet.com', password: 'password123' });
    techToken = resT.json.token;
    techId = resT.json.user.id;

    // 2. Setup Vehicles
    const v1Res = await fetchApi('/api/vehicles', 'POST', managerToken, {
      registration: 'SEARCH-1', make: 'Ford', model: 'Transit', odometer: 1000, dateIntervalDays: 180, mileageInterval: 10000
    });
    vehicle1 = v1Res.json.id;

    const v2Res = await fetchApi('/api/vehicles', 'POST', managerToken, {
      registration: 'SEARCH-2', make: 'Toyota', model: 'Prius', odometer: 2000, dateIntervalDays: 180, mileageInterval: 10000
    });
    vehicle2 = v2Res.json.id;

    // 3. Create Records
    const dataToCreate = [
      { vehicleId: vehicle1, description: 'Replace brake pads', status: 'DUE', tech: null },
      { vehicleId: vehicle1, description: 'Oil change', status: 'BOOKED', tech: techId },
      { vehicleId: vehicle2, description: 'Inspect transmission', status: 'IN_SERVICE', tech: techId },
      { vehicleId: vehicle2, description: 'Brake fluid flush', status: 'COMPLETED', tech: null },
      { vehicleId: vehicle1, description: 'Tire rotation', status: 'COMPLETED', tech: null }
    ];

    for (const item of dataToCreate) {
      const rec = await fetchApi('/api/service-records', 'POST', managerToken, {
        vehicleId: item.vehicleId,
        description: item.description,
        becameDueAt: new Date()
      });
      records.push(rec.json.id);

      // Force status update (since POST only creates DUE)
      await prisma.serviceRecord.update({
        where: { id: rec.json.id },
        data: { status: item.status }
      });

      if (item.tech) {
        await fetchApi(`/api/service-records/${rec.json.id}/assignments`, 'POST', managerToken, { technicianId: item.tech });
      }
      
      // Delay slightly to ensure distinct createdAt timestamps for sorting tests
      await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n--- Test Matrix ---');
    
    // Pagination & Total Count
    let res = await fetchApi('/api/service-records?page=1&pageSize=2', 'GET', managerToken);
    console.log('✓ Pagination (page 1, pageSize 2):', (res.json.data.length === 2 && res.json.pagination.total >= 5) ? 'PASS' : 'FAIL');
    console.log('✓ Total pages calculated correctly:', res.json.pagination.totalPages === Math.ceil(res.json.pagination.total / 2) ? 'PASS' : 'FAIL');

    // Search (?q=brake) - Should match "Replace brake pads" and "Brake fluid flush" (case insensitive)
    res = await fetchApi('/api/service-records?q=brake', 'GET', managerToken);
    console.log('✓ Search query (q=brake):', res.json.data.length === 2 ? 'PASS' : 'FAIL');

    // Vehicle Filter
    res = await fetchApi(`/api/service-records?vehicleId=${vehicle2}`, 'GET', managerToken);
    const allVehicle2 = res.json.data.every(r => r.vehicleId === vehicle2);
    console.log('✓ Vehicle filter:', (res.json.data.length === 2 && allVehicle2) ? 'PASS' : 'FAIL');

    // Status Filter
    res = await fetchApi('/api/service-records?status=completed', 'GET', managerToken);
    const allCompleted = res.json.data.every(r => r.status === 'COMPLETED');
    console.log('✓ Status filter:', (res.json.data.length >= 2 && allCompleted) ? 'PASS' : 'FAIL');

    // Technician Filter (Manager searching for tech's records)
    res = await fetchApi(`/api/service-records?technicianId=${techId}`, 'GET', managerToken);
    const allTech = res.json.data.every(r => r.assignments.some(a => a.technicianId === techId));
    console.log('✓ Technician filter (manager querying tech):', (res.json.data.length >= 2 && allTech) ? 'PASS' : 'FAIL');

    // Sort (sort=createdAt&order=asc)
    res = await fetchApi(`/api/service-records?vehicleId=${vehicle2}&sort=createdAt&order=asc`, 'GET', managerToken);
    let isAsc = new Date(res.json.data[0].createdAt) < new Date(res.json.data[1].createdAt);
    console.log('✓ Sort (createdAt asc):', isAsc ? 'PASS' : 'FAIL');

    // Technician Authorization / Visibility
    res = await fetchApi('/api/service-records', 'GET', techToken);
    const techCanSee = res.json.data.every(r => r.assignments.some(a => a.technicianId === techId));
    console.log('✓ Tech GET / only sees their assigned records:', (res.json.data.length >= 2 && techCanSee) ? 'PASS' : 'FAIL');

    res = await fetchApi('/api/service-records/mine', 'GET', techToken);
    const techMineSee = res.json.data.every(r => r.assignments.some(a => a.technicianId === techId));
    console.log('✓ Tech GET /mine only sees their assigned records:', (res.json.data.length >= 2 && techMineSee) ? 'PASS' : 'FAIL');

    // Tech combining filter (Tech searching for status=BOOKED in their own records)
    res = await fetchApi(`/api/service-records?status=BOOKED&vehicleId=${vehicle1}`, 'GET', techToken);
    console.log('✓ Tech search applies within their boundary:', (res.json.data.length === 1 && res.json.data[0].description === 'Oil change') ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    if (records.length > 0) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecordId: { in: records } } });
      await prisma.serviceAssignment.deleteMany({ where: { serviceRecordId: { in: records } } });
      await prisma.serviceRecord.deleteMany({ where: { id: { in: records } } });
    }
    if (vehicle1 || vehicle2) {
      await prisma.vehicle.deleteMany({ where: { id: { in: [vehicle1, vehicle2].filter(Boolean) } } });
    }
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
