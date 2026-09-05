const prisma = require('../utils/prisma');

/**
 * Determines if a vehicle is due for maintenance.
 * @param {Object} vehicle 
 * @returns {boolean} true if due, false otherwise
 */
function isDue(vehicle) {
  // 1. No previous completed service
  if (!vehicle.lastCompletedDate || vehicle.lastCompletedOdometer == null) {
    return true;
  }

  // 2. Date interval reached
  const now = new Date();
  const msSinceLastService = now.getTime() - vehicle.lastCompletedDate.getTime();
  const msInterval = vehicle.dateIntervalDays * 24 * 60 * 60 * 1000;
  if (msSinceLastService >= msInterval) {
    return true;
  }

  // 3. Mileage interval reached
  const mileageSinceLastService = vehicle.odometer - vehicle.lastCompletedOdometer;
  if (mileageSinceLastService >= vehicle.mileageInterval) {
    return true;
  }

  return false;
}

/**
 * Ensures a Due record exists if the vehicle is due.
 * Uses a transaction to prevent duplicate open cycles.
 * @param {string} vehicleId 
 * @param {string} systemActorId ID of the system or user triggering this check (for audit events)
 * @returns {Object|null} The open service record, or null if not due
 */
async function ensureDueRecord(vehicleId, systemActorId) {
  // 1. Load vehicle outside transaction first for a fast check
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId }
  });

  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  // 2. Check if due
  if (!isDue(vehicle)) {
    return null; // Not due, nothing to do
  }

  // 3. Transaction to protect against race conditions creating duplicate cycles
  return await prisma.$transaction(async (tx) => {
    // Acquire a row-level lock on the vehicle to serialize concurrent requests for the same vehicle
    await tx.$executeRaw`SELECT id FROM vehicles WHERE id = ${vehicleId} FOR UPDATE`;

    // Find any existing open record (DUE, BOOKED, IN_SERVICE)
    const openRecord = await tx.serviceRecord.findFirst({
      where: {
        vehicleId: vehicleId,
        status: {
          in: ['DUE', 'BOOKED', 'IN_SERVICE']
        }
      }
    });

    if (openRecord) {
      // Already an active service cycle, return it without creating a new one
      return openRecord;
    }

    // No open record exists, create one
    const newRecord = await tx.serviceRecord.create({
      data: {
        vehicleId: vehicleId,
        description: 'Scheduled Maintenance Due',
        status: 'DUE',
        becameDueAt: new Date()
      }
    });

    // Create audit event
    await tx.serviceEvent.create({
      data: {
        serviceRecordId: newRecord.id,
        actorId: systemActorId,
        type: 'CREATED'
      }
    });

    return newRecord;
  });
}

module.exports = {
  isDue,
  ensureDueRecord
};
