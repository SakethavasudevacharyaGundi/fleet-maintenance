const prisma = require('../utils/prisma');

async function getDashboardMetrics(role, userId) {
  const isTech = role === 'TECHNICIAN';

  // Base scope for service records to enforce technician visibility
  const srBaseWhere = isTech ? { assignments: { some: { technicianId: userId } } } : {};

  const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10);
  const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - gracePeriodMs);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);

  // 1. Status Counts
  const statusGroupPromise = prisma.serviceRecord.groupBy({
    by: ['status'],
    where: srBaseWhere,
    _count: { status: true }
  });

  // 2. Overdue Count (status=DUE AND becameDueAt < grace)
  const overdueCountPromise = prisma.serviceRecord.count({
    where: {
      ...srBaseWhere,
      status: 'DUE',
      becameDueAt: { lt: cutoffDate }
    }
  });

  // 3. Completed This Week Count (uses dedicated completedAt timestamp)
  const completedThisWeekPromise = prisma.serviceRecord.count({
    where: {
      ...srBaseWhere,
      status: 'COMPLETED',
      completedAt: { gte: sevenDaysAgo }
    }
  });

  // 4. By Technician Counts
  const techGroupPromise = prisma.serviceAssignment.groupBy({
    by: ['technicianId'],
    where: isTech ? { technicianId: userId } : {},
    _count: { technicianId: true }
  });

  // 5. 8-Week Completion Trend
  const recentCompletedPromise = prisma.serviceRecord.findMany({
    where: {
      ...srBaseWhere,
      status: 'COMPLETED',
      completedAt: { gte: eightWeeksAgo }
    },
    select: { completedAt: true }
  });

  // Execute fixed independent queries concurrently to prevent N+1 issues
  const [
    statusGroups,
    vehiclesOverdue,
    completedThisWeek,
    techGroups,
    recentCompletedRecords
  ] = await Promise.all([
    statusGroupPromise,
    overdueCountPromise,
    completedThisWeekPromise,
    techGroupPromise,
    recentCompletedPromise
  ]);

  let vehiclesDue = 0;
  let vehiclesInService = 0;
  const byStatus = statusGroups.map(g => {
    if (g.status === 'DUE') vehiclesDue = g._count.status;
    if (g.status === 'IN_SERVICE') vehiclesInService = g._count.status;
    return { status: g.status, count: g._count.status };
  });

  const techIds = techGroups.map(g => g.technicianId);
  const techs = await prisma.user.findMany({
    where: { id: { in: techIds } },
    select: { id: true, email: true, name: true }
  });
  const techMap = {};
  for (const t of techs) {
    const tagLetter = t.email.match(/tech([a-j])/i)?.[1]?.toUpperCase();
    techMap[t.id] = {
      name: t.name || t.email.split('@')[0],
      tag:  tagLetter ? `Tech ${tagLetter}` : 'Technician',
    };
  }

  const byTechnician = techGroups.map(g => ({
    technicianId: g.technicianId,
    name: techMap[g.technicianId]?.name || 'Unknown',
    tag:  techMap[g.technicianId]?.tag  || 'Technician',
    count: g._count.technicianId
  }));

  // Process 8-week trend in JS to guarantee zero-filling for weeks without completions
  const weeklyCompleted = [];
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    
    const count = recentCompletedRecords.filter(r => {
      if (!r.completedAt) return false;
      const t = r.completedAt.getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    }).length;

    weeklyCompleted.push({
      weekStart: weekStart.toISOString().split('T')[0],
      count
    });
  }

  return {
    summary: {
      vehiclesDue,
      vehiclesInService,
      completedThisWeek,
      vehiclesOverdue
    },
    byStatus,
    byTechnician,
    weeklyCompleted
  };
}

module.exports = { getDashboardMetrics };
