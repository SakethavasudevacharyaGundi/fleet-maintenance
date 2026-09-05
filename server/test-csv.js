const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5006;
const server = http.createServer(app);

async function fetchApi(path, method, token, body = null, isFormData = false) {
  const options = { method, headers: {} };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  
  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  
  const res = await fetch(`http://localhost:${PORT}${path}`, options);
  
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return { status: res.status, json: await res.json() };
  } else {
    return { status: res.status, text: await res.text() };
  }
}

const runTests = async () => {
  console.log('--- Starting Phase 10 CSV Tests ---');
  let managerToken = '';
  let techToken = '';
  let vehicles = [];

  try {
    // 1. Setup Auth
    const resM = await fetchApi('/auth/login', 'POST', '', { email: 'manager@fleet.com', password: 'password123' });
    managerToken = resM.json.token;

    const resT = await fetchApi('/auth/login', 'POST', '', { email: 'techa@fleet.com', password: 'password123' });
    techToken = resT.json.token;
    const techId = resT.json.user.id;

    // 2. Setup Vehicles for testing
    // Truck-001 (10000 -> 10000 ok)
    // Truck-002 (9000 -> 9000 ok)
    // Truck-003 (2000 -> lower)
    // Truck-004 (abc)
    // Truck-005 (15000 ok)
    const toCreate = [
      { reg: 'Truck-001', odo: 5000 },
      { reg: 'Truck-002', odo: 8000 },
      { reg: 'Truck-003', odo: 3000 },
      { reg: 'Truck-004', odo: 1000 },
      { reg: 'Truck-005', odo: 10000 },
    ];

    for (let c of toCreate) {
      const v = await fetchApi('/api/vehicles', 'POST', managerToken, {
        registration: c.reg, make: 'Test', model: 'Truck', odometer: c.odo, dateIntervalDays: 180, mileageInterval: 10000
      });
      vehicles.push(v.json.id);
    }

    // 3. Test Bulk Odometer
    const csvContent = `registration,odometer
Truck-001,10000
Truck-002,9000
Unknown,5000
Truck-003,2000
Truck-004,abc
Truck-005,15000`;

    const form = new FormData();
    form.append('file', new Blob([csvContent], { type: 'text/csv' }), 'test.csv');

    const bulkRes = await fetchApi('/api/vehicles/bulk-odometer', 'POST', managerToken, form, true);
    console.log('✓ Bulk odometer response structure:', (bulkRes.status === 200 && bulkRes.json && bulkRes.json.total === 6) ? 'PASS' : 'FAIL ' + JSON.stringify(bulkRes));
    
    // Check detailed rows in JSON
    const rows = bulkRes.json ? bulkRes.json.rows : [];
    const t1 = rows.find(r => r.row === 2).status === 'success';
    const t2 = rows.find(r => r.row === 3).status === 'success';
    const tUnk = rows.find(r => r.row === 4).status === 'rejected'; // Unknown
    const t3 = rows.find(r => r.row === 5).status === 'rejected'; // Truck-003 (lower)
    const t4 = rows.find(r => r.row === 6).status === 'rejected'; // Truck-004 (invalid number)
    const t5 = rows.find(r => r.row === 7).status === 'success';
    
    console.log('✓ Partial success logic (JSON response):', (t1 && t2 && tUnk && t3 && t4 && t5) ? 'PASS' : 'FAIL');

    // Verify Database state
    const v1 = await prisma.vehicle.findUnique({ where: { registration: 'Truck-001' } });
    const v3 = await prisma.vehicle.findUnique({ where: { registration: 'Truck-003' } });
    const v5 = await prisma.vehicle.findUnique({ where: { registration: 'Truck-005' } });

    console.log('✓ Database monotonic invariant (Truck-001 changed):', v1.odometer === 10000 ? 'PASS' : 'FAIL');
    console.log('✓ Database monotonic invariant (Truck-003 unchanged):', v3.odometer === 3000 ? 'PASS' : 'FAIL');
    console.log('✓ Database monotonic invariant (Truck-005 changed):', v5.odometer === 15000 ? 'PASS' : 'FAIL');

    // 4. Test Export Authorization
    // Let's create a service record assigned to techa, and one unassigned
    const r1 = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId: vehicles[0], description: 'Record A', becameDueAt: new Date().toISOString()
    });
    const recordA = r1.json.id;
    await fetchApi(`/api/service-records/${recordA}/assignments`, 'POST', managerToken, { technicianId: techId });

    const r2 = await fetchApi('/api/service-records', 'POST', managerToken, {
      vehicleId: vehicles[1], description: 'Record B', becameDueAt: new Date().toISOString()
    });
    const recordB = r2.json.id;

    // Export Manager
    const exportM = await fetchApi('/api/service-records/export.csv', 'GET', managerToken);
    const mHasA = exportM.text.includes('Record A');
    const mHasB = exportM.text.includes('Record B');
    console.log('✓ Export manager sees all:', (mHasA && mHasB) ? 'PASS' : 'FAIL');

    // Export Technician
    const exportT = await fetchApi('/api/service-records/export.csv', 'GET', techToken);
    const tHasA = exportT.text.includes('Record A');
    const tHasB = exportT.text.includes('Record B');
    console.log('✓ Export technician sees assigned only:', (tHasA && !tHasB) ? 'PASS' : 'FAIL');

    // Cleanup service records
    await prisma.serviceAssignment.deleteMany({ where: { serviceRecordId: { in: [recordA, recordB] } } });
    await prisma.serviceEvent.deleteMany({ where: { serviceRecordId: { in: [recordA, recordB] } } });
    await prisma.serviceRecord.deleteMany({ where: { id: { in: [recordA, recordB] } } });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    if (vehicles.length > 0) {
      await prisma.vehicle.deleteMany({ where: { id: { in: vehicles } } });
    }
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
