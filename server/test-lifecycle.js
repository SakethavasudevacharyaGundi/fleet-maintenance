const prisma = require('./src/utils/prisma');
const { book, start, complete, LifecycleError } = require('./src/services/lifecycle');

async function expectError(promise, expectedMsgContains) {
  try {
    await promise;
    console.log(`❌ FAIL: Expected error containing "${expectedMsgContains}" but succeeded.`);
    return false;
  } catch (err) {
    if (err instanceof LifecycleError && err.message.includes(expectedMsgContains)) {
      return true;
    }
    console.log(`❌ FAIL: Expected LifecycleError with "${expectedMsgContains}", got:`, err.message);
    return false;
  }
}

async function runTests() {
  console.log('--- Starting Lifecycle Engine Tests ---');
  let manager;
  let tech;
  let vehicle;

  try {
    // 1. Setup Test Data
    manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    tech = await prisma.user.findFirst({ where: { role: 'TECHNICIAN' } });

    vehicle = await prisma.vehicle.create({
      data: {
        registration: 'LC-TEST-001',
        make: 'Volvo',
        model: 'VNL',
        odometer: 10000,
        dateIntervalDays: 90,
        mileageInterval: 5000
      }
    });

    console.log('Test prerequisites created.');

    const createRecord = async (status) => {
      return await prisma.serviceRecord.create({
        data: {
          vehicleId: vehicle.id,
          description: 'Lifecycle Test',
          status,
          becameDueAt: new Date()
        }
      });
    };

    // --- ILLEGAL TRANSITIONS ---
    console.log('\n--- ILLEGAL TRANSITIONS ---');
    
    // DUE -> IN_SERVICE or COMPLETED
    const dueRecord = await createRecord('DUE');
    if (await expectError(start(dueRecord.id, tech.id), 'Cannot move from DUE to IN_SERVICE')) console.log('✓ Due -> In Service rejected');
    if (await expectError(complete(dueRecord.id, 12000, tech.id), 'Cannot move from DUE to COMPLETED')) console.log('✓ Due -> Completed rejected');

    // BOOKED -> DUE or COMPLETED
    const bookedRecord = await createRecord('BOOKED');
    // we don't even have a method to move back to DUE, but let's check complete on BOOKED
    if (await expectError(complete(bookedRecord.id, 12000, tech.id), 'Cannot move from BOOKED to COMPLETED')) console.log('✓ Booked -> Completed rejected');
    
    // IN_SERVICE -> DUE or BOOKED
    const inServiceRecord = await createRecord('IN_SERVICE');
    // Start on IN_SERVICE
    if (await expectError(start(inServiceRecord.id, tech.id), 'Cannot move from IN_SERVICE to IN_SERVICE')) console.log('✓ In Service -> In Service (start again) rejected');
    // Book on IN_SERVICE
    if (await expectError(book(inServiceRecord.id, new Date(), [tech.id], manager.id), 'Cannot move from IN_SERVICE to BOOKED')) console.log('✓ In Service -> Booked rejected');

    // COMPLETED -> ANYTHING
    const completedRecord = await createRecord('COMPLETED');
    if (await expectError(book(completedRecord.id, new Date(), [tech.id], manager.id), 'Cannot move from COMPLETED to BOOKED')) console.log('✓ Completed -> Booked rejected');
    if (await expectError(start(completedRecord.id, tech.id), 'Cannot move from COMPLETED to IN_SERVICE')) console.log('✓ Completed -> In Service rejected');
    if (await expectError(complete(completedRecord.id, 15000, tech.id), 'Cannot move from COMPLETED to COMPLETED')) console.log('✓ Completed -> Completed rejected');

    // --- ODOMETER RULES ---
    console.log('\n--- COMPLETION ODOMETER RULES ---');
    // odometer < current (vehicle is at 10000)
    if (await expectError(complete(inServiceRecord.id, 9999, tech.id), 'Odometer reading cannot be less than current')) console.log('✓ Odometer < current rejected');

    // odometer == current (valid)
    const eqOdometerRecord = await createRecord('IN_SERVICE');
    await complete(eqOdometerRecord.id, 10000, tech.id);
    console.log('✓ Odometer == current accepted');

    // odometer > current (valid)
    const gtOdometerRecord = await createRecord('IN_SERVICE');
    await complete(gtOdometerRecord.id, 12000, tech.id);
    console.log('✓ Odometer > current accepted');

    // Vehicle odometer should now be 12000
    const updatedVehicle = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    if (updatedVehicle.odometer === 12000) {
      console.log('✓ Vehicle odometer correctly updated to 12000');
    } else {
      console.log('❌ Vehicle odometer not updated properly:', updatedVehicle.odometer);
    }

    // --- TRANSACTION ROLLBACK BEHAVIOR ---
    console.log('\n--- TRANSACTION ROLLBACK BEHAVIOR ---');
    const rollbackRecord = await createRecord('DUE');
    // Try to book without assignment (should fail midway)
    let failed = false;
    try {
      await book(rollbackRecord.id, new Date(), [tech.id], manager.id);
    } catch(err) {
      failed = true;
    }
    
    // Check if the record remained DUE
    const checkRollback = await prisma.serviceRecord.findUnique({ where: { id: rollbackRecord.id } });
    if (failed && checkRollback.status === 'DUE') {
      console.log('✓ Partial failure rolled back successfully (status is still DUE)');
    } else {
      console.log('❌ Transaction rollback failed', checkRollback.status);
    }

    // --- LEGAL FULL LIFECYCLE ---
    console.log('\n--- LEGAL FULL LIFECYCLE ---');
    const fullLifecycleRecord = await createRecord('DUE');
    
    // 0. Manager creates assignment first (Phase 7 invariant)
    await prisma.serviceAssignment.create({
      data: { serviceRecordId: fullLifecycleRecord.id, technicianId: tech.id }
    });

    // 1. DUE -> BOOKED
    await book(fullLifecycleRecord.id, new Date(), [tech.id], manager.id);
    const step1 = await prisma.serviceRecord.findUnique({ where: { id: fullLifecycleRecord.id } });
    if (step1.status === 'BOOKED') console.log('✓ Due -> Booked successful');

    // 2. BOOKED -> IN SERVICE
    await start(fullLifecycleRecord.id, tech.id);
    const step2 = await prisma.serviceRecord.findUnique({ where: { id: fullLifecycleRecord.id } });
    if (step2.status === 'IN_SERVICE') console.log('✓ Booked -> In Service successful');

    // 3. IN SERVICE -> COMPLETED
    await complete(fullLifecycleRecord.id, 13000, tech.id);
    const step3 = await prisma.serviceRecord.findUnique({ where: { id: fullLifecycleRecord.id } });
    if (step3.status === 'COMPLETED') console.log('✓ In Service -> Completed successful');

    // Validate reset fields
    const finalVehicle = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    if (finalVehicle.lastCompletedOdometer === 13000 && finalVehicle.lastCompletedDate !== null) {
      console.log('✓ Vehicle lastCompleted parameters reset correctly');
    }

  } catch (error) {
    console.error('Unexpected test failure:', error);
  } finally {
    // Cleanup
    if (vehicle) {
      await prisma.serviceEvent.deleteMany({ where: { serviceRecord: { vehicleId: vehicle.id } } });
      await prisma.serviceAssignment.deleteMany({ where: { serviceRecord: { vehicleId: vehicle.id } } });
      await prisma.serviceRecord.deleteMany({ where: { vehicleId: vehicle.id } });
      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    }
    await prisma.$disconnect();
    console.log('Tests finished.');
  }
}

runTests();
