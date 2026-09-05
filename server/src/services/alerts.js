const prisma = require('../utils/prisma');

// Configuration for grace period
const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10);

/**
 * Retrieve all active overdue alerts that have not been dismissed.
 * A record is overdue when status = 'DUE' and now - became_due_at > GRACE_PERIOD.
 */
async function getAlerts() {
  const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - gracePeriodMs);

  const overdueRecords = await prisma.serviceRecord.findMany({
    where: {
      status: 'DUE',
      becameDueAt: {
        lt: cutoffDate
      }
    },
    include: {
      vehicle: {
        include: {
          alertDismissals: true
        }
      }
    }
  });

  // Filter out records that have been dismissed for this specific cycle
  const activeAlerts = overdueRecords.filter(record => {
    const recordTime = record.becameDueAt.getTime();
    const hasDismissal = record.vehicle.alertDismissals.some(
      dismissal => dismissal.dueCycleStart.getTime() === recordTime
    );
    return !hasDismissal;
  });

  // Clean up the nested vehicle payload (remove alertDismissals array from the response)
  return activeAlerts.map(record => {
    const { vehicle, ...rest } = record;
    const { alertDismissals, ...cleanVehicle } = vehicle;
    return { ...rest, vehicle: cleanVehicle };
  });
}

/**
 * Dismiss an alert for a specific vehicle and due cycle.
 */
async function dismissAlert(vehicleId, dueCycleStart) {
  const dueCycleStartDate = new Date(dueCycleStart);
  
  if (isNaN(dueCycleStartDate.getTime())) {
    throw new Error('Invalid dueCycleStart date');
  }

  // Create the dismissal entry
  return await prisma.alertDismissal.upsert({
    where: {
      vehicleId_dueCycleStart: {
        vehicleId,
        dueCycleStart: dueCycleStartDate
      }
    },
    update: {
      dismissedAt: new Date()
    },
    create: {
      vehicleId,
      dueCycleStart: dueCycleStartDate,
      dismissedAt: new Date()
    }
  });
}

module.exports = {
  getAlerts,
  dismissAlert,
  GRACE_PERIOD_DAYS
};
