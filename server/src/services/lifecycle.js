const prisma = require('../utils/prisma');

class LifecycleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LifecycleError';
  }
}

async function book(serviceRecordId, scheduledDate, technicianIds, actorId) {
  if (!scheduledDate) throw new LifecycleError('Scheduled date is required');
  if (!technicianIds || technicianIds.length === 0) throw new LifecycleError('At least one technician is required');
  if (!actorId) throw new LifecycleError('Actor ID is required');

  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({
      where: { id: serviceRecordId }
    });

    if (!record) throw new LifecycleError('Service record not found');
    if (record.status !== 'DUE') {
      throw new LifecycleError(`Cannot move from ${record.status} to BOOKED`);
    }

    // Validate assignments exist (Phase 7 rule)
    const assignments = await tx.serviceAssignment.findMany({
      where: {
        serviceRecordId,
        technicianId: { in: technicianIds }
      }
    });

    if (assignments.length === 0 || assignments.length !== technicianIds.length) {
      throw new LifecycleError('Technicians must be assigned by a manager before booking');
    }

    // Update record
    const updatedRecord = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        status: 'BOOKED',
        scheduledDate: new Date(scheduledDate)
      }
    });

    // Create audit events
    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'STATUS_CHANGE',
        oldValue: 'DUE',
        newValue: 'BOOKED'
      }
    });

    // Note: ASSIGNED events are now created by assignTechnician() in Phase 7, not here.

    return updatedRecord;
  });
}

async function start(serviceRecordId, actorId) {
  if (!actorId) throw new LifecycleError('Actor ID is required');

  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({
      where: { id: serviceRecordId }
    });

    if (!record) throw new LifecycleError('Service record not found');
    if (record.status !== 'BOOKED') {
      throw new LifecycleError(`Cannot move from ${record.status} to IN_SERVICE`);
    }

    const updatedRecord = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        status: 'IN_SERVICE'
      }
    });

    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'STATUS_CHANGE',
        oldValue: 'BOOKED',
        newValue: 'IN_SERVICE'
      }
    });

    return updatedRecord;
  });
}

async function complete(serviceRecordId, odometerReading, actorId) {
  if (odometerReading == null) throw new LifecycleError('Odometer reading is required');
  if (!actorId) throw new LifecycleError('Actor ID is required');

  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: { vehicle: true }
    });

    if (!record) throw new LifecycleError('Service record not found');
    if (record.status !== 'IN_SERVICE') {
      throw new LifecycleError(`Cannot move from ${record.status} to COMPLETED`);
    }

    if (odometerReading < record.vehicle.odometer) {
      throw new LifecycleError('Odometer reading cannot be less than current vehicle odometer');
    }

    const now = new Date();

    const updatedRecord = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        status: 'COMPLETED',
        completedAt: now
      }
    });

    await tx.vehicle.update({
      where: { id: record.vehicleId },
      data: {
        odometer: odometerReading,
        lastCompletedDate: now,
        lastCompletedOdometer: odometerReading
      }
    });

    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'STATUS_CHANGE',
        oldValue: 'IN_SERVICE',
        newValue: 'COMPLETED'
      }
    });

    return updatedRecord;
  });
}

module.exports = {
  LifecycleError,
  book,
  start,
  complete
};
