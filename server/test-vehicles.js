const app = require('./src/app');
const http = require('http');
const prisma = require('./src/utils/prisma');

const PORT = 5002;
const server = http.createServer(app);

const runTests = async () => {
  console.log('--- Starting Vehicle Tests ---');
  let managerToken = '';
  let techToken = '';
  let createdVehicleId = '';

  try {
    // Login to get tokens
    const resM = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@fleet.com', password: 'password123' })
    });
    managerToken = (await resM.json()).token;

    const resT = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'techa@fleet.com', password: 'password123' })
    });
    techToken = (await resT.json()).token;

    // ✓ technician cannot create
    const resTechCreate = await fetch(`http://localhost:${PORT}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ registration: 'TECH-123', make: 'Ford', model: 'Transit', odometer: 1000, dateIntervalDays: 180, mileageInterval: 10000 })
    });
    console.log('✓ technician cannot create:', resTechCreate.status === 403 ? 'PASS' : 'FAIL');

    // ✓ manager can create
    const resMgrCreate = await fetch(`http://localhost:${PORT}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ registration: 'MGR-123', make: 'Ford', model: 'Transit', odometer: 1000, dateIntervalDays: 180, mileageInterval: 10000 })
    });
    const createdVehicle = await resMgrCreate.json();
    createdVehicleId = createdVehicle.id;
    console.log('✓ manager can create:', resMgrCreate.status === 201 ? 'PASS' : 'FAIL');

    // add dummy service history to verify it survives
    await prisma.serviceRecord.create({
      data: {
        vehicleId: createdVehicleId,
        description: 'Test service',
        status: 'COMPLETED',
        becameDueAt: new Date(),
      }
    });

    // ✓ technician cannot update
    const resTechUpdate = await fetch(`http://localhost:${PORT}/api/vehicles/${createdVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ odometer: 2000 })
    });
    console.log('✓ technician cannot update:', resTechUpdate.status === 403 ? 'PASS' : 'FAIL');

    // ✓ manager can update
    const resMgrUpdate = await fetch(`http://localhost:${PORT}/api/vehicles/${createdVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ odometer: 2000 })
    });
    console.log('✓ manager can update:', resMgrUpdate.status === 200 ? 'PASS' : 'FAIL');

    // ✓ archive hides vehicle
    await fetch(`http://localhost:${PORT}/api/vehicles/${createdVehicleId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const resListActive = await fetch(`http://localhost:${PORT}/api/vehicles`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const activeVehicles = await resListActive.json();
    const isHidden = !activeVehicles.find(v => v.id === createdVehicleId);
    console.log('✓ archive hides vehicle:', isHidden ? 'PASS' : 'FAIL');

    // ✓ restore returns vehicle
    await fetch(`http://localhost:${PORT}/api/vehicles/${createdVehicleId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const resListRestored = await fetch(`http://localhost:${PORT}/api/vehicles`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const restoredVehicles = await resListRestored.json();
    const isRestored = restoredVehicles.find(v => v.id === createdVehicleId);
    console.log('✓ restore returns vehicle:', isRestored ? 'PASS' : 'FAIL');

    // ✓ service history survives archive
    // Just fetch the vehicle by ID and check service records
    const resGetVehicle = await fetch(`http://localhost:${PORT}/api/vehicles/${createdVehicleId}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const vehicleWithHistory = await resGetVehicle.json();
    console.log('✓ service history survives archive:', (vehicleWithHistory.serviceRecords && vehicleWithHistory.serviceRecords.length > 0) ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // cleanup
    if (createdVehicleId) {
      await prisma.serviceRecord.deleteMany({ where: { vehicleId: createdVehicleId } });
      await prisma.vehicle.delete({ where: { id: createdVehicleId } });
    }
    server.close();
    process.exit(0);
  }
};

server.listen(PORT, () => {
  runTests();
});
