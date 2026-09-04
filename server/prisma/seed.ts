import { PrismaClient, UserRole, ServiceStatus, EventType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const manager = await prisma.user.upsert({
    where: { email: 'manager@fleet.com' },
    update: {},
    create: {
      email: 'manager@fleet.com',
      passwordHash,
      role: UserRole.MANAGER,
    },
  });

  const techA = await prisma.user.upsert({
    where: { email: 'techa@fleet.com' },
    update: {},
    create: {
      email: 'techa@fleet.com',
      passwordHash,
      role: UserRole.TECHNICIAN,
    },
  });

  const techB = await prisma.user.upsert({
    where: { email: 'techb@fleet.com' },
    update: {},
    create: {
      email: 'techb@fleet.com',
      passwordHash,
      role: UserRole.TECHNICIAN,
    },
  });

  const techC = await prisma.user.upsert({
    where: { email: 'techc@fleet.com' },
    update: {},
    create: {
      email: 'techc@fleet.com',
      passwordHash,
      role: UserRole.TECHNICIAN,
    },
  });

  console.log('Created Users');

  // 2. Create Vehicles
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const vehiclesData = [
    // Active, recently serviced
    { registration: 'REC-001', make: 'Ford', model: 'Transit', odometer: 15000, dateIntervalDays: 180, mileageInterval: 10000, lastCompletedDate: oneMonthAgo, lastCompletedOdometer: 14000 },
    { registration: 'REC-002', make: 'Ford', model: 'Transit', odometer: 22000, dateIntervalDays: 180, mileageInterval: 10000, lastCompletedDate: oneMonthAgo, lastCompletedOdometer: 21500 },
    { registration: 'REC-003', make: 'Mercedes', model: 'Sprinter', odometer: 50000, dateIntervalDays: 365, mileageInterval: 20000, lastCompletedDate: oneMonthAgo, lastCompletedOdometer: 48000 },

    // Active, due by date (interval is 180 days, last serviced 190 days ago)
    { registration: 'DUE-D-01', make: 'Ford', model: 'Transit', odometer: 18000, dateIntervalDays: 180, mileageInterval: 10000, lastCompletedDate: new Date(now.getTime() - (190 * 24 * 60 * 60 * 1000)), lastCompletedOdometer: 17500 },
    
    // Active, due by mileage (interval is 10k, last serviced at 10k, now at 20.5k)
    { registration: 'DUE-M-01', make: 'Mercedes', model: 'Sprinter', odometer: 20500, dateIntervalDays: 365, mileageInterval: 10000, lastCompletedDate: sixMonthsAgo, lastCompletedOdometer: 10000 },

    // Active, overdue (grace period logic usually 30 days or 1k miles, let's make it very overdue)
    { registration: 'OVR-001', make: 'Ford', model: 'Transit', odometer: 35000, dateIntervalDays: 180, mileageInterval: 10000, lastCompletedDate: oneYearAgo, lastCompletedOdometer: 20000 },
    { registration: 'OVR-002', make: 'Mercedes', model: 'Sprinter', odometer: 60000, dateIntervalDays: 365, mileageInterval: 20000, lastCompletedDate: oneYearAgo, lastCompletedOdometer: 30000 },

    // Archived
    { registration: 'ARC-001', make: 'Ford', model: 'Transit', odometer: 100000, dateIntervalDays: 180, mileageInterval: 10000, lastCompletedDate: oneYearAgo, lastCompletedOdometer: 99000, archivedAt: now },
    { registration: 'ARC-002', make: 'Mercedes', model: 'Sprinter', odometer: 150000, dateIntervalDays: 365, mileageInterval: 20000, lastCompletedDate: oneYearAgo, lastCompletedOdometer: 145000, archivedAt: now },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { registration: v.registration },
      update: {},
      create: v,
    });
  }

  const overdueVehicle = await prisma.vehicle.findUnique({ where: { registration: 'OVR-001' }});
  
  if (overdueVehicle) {
    // 3. Create Service Records and Events
    const dueAt = new Date(overdueVehicle.lastCompletedDate!.getTime() + (overdueVehicle.dateIntervalDays * 24 * 60 * 60 * 1000));
    
    const record = await prisma.serviceRecord.create({
      data: {
        vehicleId: overdueVehicle.id,
        description: 'Overdue standard maintenance',
        status: ServiceStatus.IN_SERVICE,
        becameDueAt: dueAt,
        scheduledDate: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)), // scheduled 2 days ago
      }
    });

    // Assignments
    await prisma.serviceAssignment.createMany({
      data: [
        { serviceRecordId: record.id, technicianId: techA.id },
        { serviceRecordId: record.id, technicianId: techB.id },
      ]
    });

    // Events timeline
    await prisma.serviceEvent.createMany({
      data: [
        { serviceRecordId: record.id, actorId: manager.id, type: EventType.CREATED, createdAt: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record.id, actorId: manager.id, type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record.id, actorId: manager.id, type: EventType.ASSIGNED, newValue: techA.id, createdAt: new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record.id, actorId: manager.id, type: EventType.ASSIGNED, newValue: techB.id, createdAt: new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record.id, actorId: techA.id, type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record.id, actorId: techA.id, type: EventType.NOTE, newValue: 'Started inspection, found worn brake pads.', createdAt: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)) },
      ]
    });

    // 4. Alert Dismissals
    await prisma.alertDismissal.upsert({
      where: {
        vehicleId_dueCycleStart: {
          vehicleId: overdueVehicle.id,
          dueCycleStart: dueAt,
        }
      },
      update: {},
      create: {
        vehicleId: overdueVehicle.id,
        dueCycleStart: dueAt,
        dismissedAt: new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)),
      }
    });
  }

  // Create another service record for completed service
  const recentlyServiced = await prisma.vehicle.findUnique({ where: { registration: 'REC-001' }});
  if (recentlyServiced) {
    const record2 = await prisma.serviceRecord.create({
      data: {
        vehicleId: recentlyServiced.id,
        description: 'Standard maintenance',
        status: ServiceStatus.COMPLETED,
        becameDueAt: new Date(recentlyServiced.lastCompletedDate!.getTime() - (10 * 24 * 60 * 60 * 1000)),
        scheduledDate: new Date(recentlyServiced.lastCompletedDate!.getTime() - (2 * 24 * 60 * 60 * 1000)),
      }
    });

    await prisma.serviceAssignment.create({
      data: { serviceRecordId: record2.id, technicianId: techC.id }
    });

    await prisma.serviceEvent.createMany({
      data: [
        { serviceRecordId: record2.id, actorId: manager.id, type: EventType.CREATED, createdAt: new Date(recentlyServiced.lastCompletedDate!.getTime() - (15 * 24 * 60 * 60 * 1000)) },
        { serviceRecordId: record2.id, actorId: techC.id, type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: recentlyServiced.lastCompletedDate },
      ]
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
