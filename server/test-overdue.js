const prisma = require('./src/utils/prisma');
const { isDue, ensureDueRecord } = require('./src/services/overdue');

async function runTests() {
  console.log('--- Starting Due Detection Tests ---');
  let manager;
  let vehicleNotDue;
  let vehicleDueByDate;
  let vehicleDueByMileage;
  let vehicleDueNew;

  try {
    manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });

    // 1. isDue Logic Tests (Unit)
    console.log('\n--- isDue Unit Tests ---');
    
    // No previous service
    const vNew = { lastCompletedDate: null, lastCompletedOdometer: null };
    console.log('✓ No previous service is due:', isDue(vNew) === true ? 'PASS' : 'FAIL');

    // Not due (recent service, low miles)
    const now = new Date();
    const vNotDue = {
      lastCompletedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      lastCompletedOdometer: 10000,
      odometer: 11000,
      dateIntervalDays: 90,
      mileageInterval: 5000
    };
    console.log('✓ Not due (under date/mileage):', isDue(vNotDue) === false ? 'PASS' : 'FAIL');

    // Due by date
    const vDueDate = {
      lastCompletedDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      lastCompletedOdometer: 10000,
      odometer: 11000,
      dateIntervalDays: 90,
      mileageInterval: 5000
    };
    console.log('✓ Due by date:', isDue(vDueDate) === true ? 'PASS' : 'FAIL');

    // Due by mileage
    const vDueMileage = {
      lastCompletedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      lastCompletedOdometer: 10000,
      odometer: 16000,
      dateIntervalDays: 90,
      mileageInterval: 5000
    };
    console.log('✓ Due by mileage:', isDue(vDueMileage) === true ? 'PASS' : 'FAIL');


    // 2. Integration / DB Tests
    console.log('\n--- ensureDueRecord DB Tests ---');
    
    // Setup vehicles in DB
    vehicleNotDue = await prisma.vehicle.create({
      data: { registration: 'OD-TEST-1', make: 'Ford', model: 'Transit', odometer: 11000, dateIntervalDays: 90, mileageInterval: 5000, lastCompletedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), lastCompletedOdometer: 10000 }
    });
    
    vehicleDueByDate = await prisma.vehicle.create({
      data: { registration: 'OD-TEST-2', make: 'Ford', model: 'Transit', odometer: 11000, dateIntervalDays: 90, mileageInterval: 5000, lastCompletedDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), lastCompletedOdometer: 10000 }
    });

    // Test: Not due returns null
    const r1 = await ensureDueRecord(vehicleNotDue.id, manager.id);
    console.log('✓ ensureDueRecord returns null if not due:', r1 === null ? 'PASS' : 'FAIL');

    // Test: Due creates record
    const r2 = await ensureDueRecord(vehicleDueByDate.id, manager.id);
    console.log('✓ ensureDueRecord creates DUE record if due:', (r2 && r2.status === 'DUE') ? 'PASS' : 'FAIL');

    // Test: Idempotency (calling again returns same record, does not duplicate)
    const r3 = await ensureDueRecord(vehicleDueByDate.id, manager.id);
    console.log('✓ ensureDueRecord is idempotent (returns existing record):', (r3 && r3.id === r2.id) ? 'PASS' : 'FAIL');

    // Verify only one open record actually exists in DB
    const count = await prisma.serviceRecord.count({ where: { vehicleId: vehicleDueByDate.id, status: 'DUE' } });
    console.log('✓ Only exactly 1 DUE record exists in DB:', count === 1 ? 'PASS' : 'FAIL');

    // Test: Parallel race condition simulation
    console.log('\n--- Parallel Race Condition Simulation ---');
    vehicleDueNew = await prisma.vehicle.create({
      data: { registration: 'OD-TEST-3', make: 'Ford', model: 'Transit', odometer: 100, dateIntervalDays: 90, mileageInterval: 5000 } // No previous service -> Due
    });

    // Fire 5 requests concurrently
    const promises = [
      ensureDueRecord(vehicleDueNew.id, manager.id),
      ensureDueRecord(vehicleDueNew.id, manager.id),
      ensureDueRecord(vehicleDueNew.id, manager.id),
      ensureDueRecord(vehicleDueNew.id, manager.id),
      ensureDueRecord(vehicleDueNew.id, manager.id)
    ];

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);
    
    const raceCount = await prisma.serviceRecord.count({ where: { vehicleId: vehicleDueNew.id, status: 'DUE' } });
    console.log('✓ Race condition survived (only 1 DUE record created despite 5 concurrent requests):', raceCount === 1 ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    const ids = [vehicleNotDue?.id, vehicleDueByDate?.id, vehicleDueByMileage?.id, vehicleDueNew?.id].filter(Boolean);
    if (ids.length > 0) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecord: { vehicleId: { in: ids } } } });
      await prisma.serviceRecord.deleteMany({ where: { vehicleId: { in: ids } } });
      await prisma.vehicle.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
    console.log('Tests finished.');
  }
}

runTests();
