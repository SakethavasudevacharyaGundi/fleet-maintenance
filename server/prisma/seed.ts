import { PrismaClient, UserRole, ServiceStatus, EventType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/* ─── Fixed, human-readable UUIDs ───────────────────────────────────────────
   Pattern: 000000XX-0000-4000-8000-000000000000
   XX = 01 (manager), 02-0b (Tech A–J)
   These are valid UUID v4-compatible values and are stable across re-seeds.
 ──────────────────────────────────────────────────────────────────────────── */
const IDS = {
  manager: '00000001-0000-4000-8000-000000000000',
  techA:   '00000002-0000-4000-8000-000000000000',
  techB:   '00000003-0000-4000-8000-000000000000',
  techC:   '00000004-0000-4000-8000-000000000000',
  techD:   '00000005-0000-4000-8000-000000000000',
  techE:   '00000006-0000-4000-8000-000000000000',
  techF:   '00000007-0000-4000-8000-000000000000',
  techG:   '00000008-0000-4000-8000-000000000000',
  techH:   '00000009-0000-4000-8000-000000000000',
  techI:   '0000000a-0000-4000-8000-000000000000',
  techJ:   '0000000b-0000-4000-8000-000000000000',
};

const daysAgo     = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  console.log('Clearing existing data…');

  // Delete in FK-safe order
  await prisma.alertDismissal.deleteMany();
  await prisma.serviceEvent.deleteMany();
  await prisma.serviceAssignment.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleared. Seeding…');

  const hash = await bcrypt.hash('password123', 10);

  // ── Users with fixed IDs ────────────────────────────────────────────────
  const USERS = [
    { id: IDS.manager, email: 'manager@fleet.com', name: 'Arjun Sharma',    role: UserRole.MANAGER },
    { id: IDS.techA,   email: 'techa@fleet.com',   name: 'Ravi Teja',       role: UserRole.TECHNICIAN },
    { id: IDS.techB,   email: 'techb@fleet.com',   name: 'Priya Venkat',    role: UserRole.TECHNICIAN },
    { id: IDS.techC,   email: 'techc@fleet.com',   name: 'Suresh Anand',    role: UserRole.TECHNICIAN },
    { id: IDS.techD,   email: 'techd@fleet.com',   name: 'Kavitha Reddy',   role: UserRole.TECHNICIAN },
    { id: IDS.techE,   email: 'teche@fleet.com',   name: 'Mohammed Salim',  role: UserRole.TECHNICIAN },
    { id: IDS.techF,   email: 'techf@fleet.com',   name: 'Deepak Joshi',    role: UserRole.TECHNICIAN },
    { id: IDS.techG,   email: 'techg@fleet.com',   name: 'Anita Mishra',    role: UserRole.TECHNICIAN },
    { id: IDS.techH,   email: 'techh@fleet.com',   name: 'Rajesh Pillai',   role: UserRole.TECHNICIAN },
    { id: IDS.techI,   email: 'techi@fleet.com',   name: 'Sunita Bose',     role: UserRole.TECHNICIAN },
    { id: IDS.techJ,   email: 'techj@fleet.com',   name: 'Amar Singh',      role: UserRole.TECHNICIAN },
  ];

  await prisma.user.createMany({ data: USERS.map(u => ({ ...u, passwordHash: hash })) });
  console.log('✓ 11 users created with fixed IDs');

  // ── Vehicles ────────────────────────────────────────────────────────────
  const vehiclesData = [
    { reg: 'TS07AB1001', make: 'Tata',          model: 'Ace',           km: 16200,  iD: 180, iK: 10000, lastDate: daysAgo(20),  lastKm: 15800 },
    { reg: 'TS09CD2002', make: 'Mahindra',       model: 'Bolero',        km: 23500,  iD: 180, iK: 10000, lastDate: daysAgo(35),  lastKm: 22800 },
    { reg: 'TS11EF3003', make: 'Ashok Leyland',  model: 'Dost',          km: 29000,  iD: 180, iK: 8000,  lastDate: daysAgo(60),  lastKm: 27500 },
    { reg: 'MH12GH4004', make: 'Mercedes',       model: 'Sprinter',      km: 51000,  iD: 365, iK: 20000, lastDate: daysAgo(45),  lastKm: 49500 },
    { reg: 'MH14JK5005', make: 'Ford',           model: 'Transit',       km: 38000,  iD: 180, iK: 10000, lastDate: daysAgo(10),  lastKm: 37200 },
    { reg: 'MH04LM6006', make: 'Tata',           model: '407',           km: 62000,  iD: 365, iK: 15000, lastDate: daysAgo(80),  lastKm: 59000 },
    { reg: 'KA01NP7007', make: 'Mahindra',       model: 'Supro',         km: 18500,  iD: 180, iK: 8000,  lastDate: daysAgo(25),  lastKm: 17800 },
    { reg: 'KA05QR8008', make: 'Force',          model: 'Traveller',     km: 44000,  iD: 180, iK: 12000, lastDate: daysAgo(15),  lastKm: 43100 },
    { reg: 'DL08ST9009', make: 'Mercedes',       model: 'Actros',        km: 88000,  iD: 365, iK: 25000, lastDate: daysAgo(55),  lastKm: 85000 },
    { reg: 'DL03UV0010', make: 'Volvo',          model: 'FH16',          km: 120000, iD: 365, iK: 30000, lastDate: daysAgo(70),  lastKm: 117000 },
    { reg: 'TN22WX1011', make: 'Tata',           model: 'LPT 1613',      km: 55000,  iD: 180, iK: 12000, lastDate: daysAgo(30),  lastKm: 53500 },
    { reg: 'TN38YZ2012', make: 'Mahindra',       model: 'Jeeto',         km: 9800,   iD: 180, iK: 8000,  lastDate: daysAgo(12),  lastKm: 9200  },
    { reg: 'GJ01AB3013', make: 'Eicher',         model: 'Pro 3015',      km: 41000,  iD: 365, iK: 15000, lastDate: daysAgo(40),  lastKm: 39500 },
    { reg: 'GJ18CD4014', make: 'BharatBenz',     model: '914R',          km: 33000,  iD: 180, iK: 10000, lastDate: daysAgo(5),   lastKm: 32500 },
    { reg: 'RJ14EF5015', make: 'Tata',           model: 'Ultra 1014',    km: 27000,  iD: 365, iK: 12000, lastDate: daysAgo(90),  lastKm: 25000 },
    { reg: 'UP32GH6016', make: 'Ashok Leyland',  model: 'Captain 1415',  km: 76000,  iD: 365, iK: 20000, lastDate: daysAgo(110), lastKm: 72000 },
    { reg: 'UP80JK7017', make: 'Mahindra',       model: 'Furio 7',       km: 15000,  iD: 180, iK: 8000,  lastDate: daysAgo(8),   lastKm: 14500 },
    { reg: 'WB44LM8018', make: 'Tata',           model: 'Signa 1923S',   km: 92000,  iD: 365, iK: 25000, lastDate: daysAgo(65),  lastKm: 88000 },
    { reg: 'MP09NP9019', make: 'Eicher',         model: 'Pro 6016',      km: 48000,  iD: 365, iK: 15000, lastDate: daysAgo(50),  lastKm: 46000 },
    { reg: 'PB10QR0020', make: 'Force',          model: 'Gurkha',        km: 22000,  iD: 180, iK: 10000, lastDate: daysAgo(22),  lastKm: 21200 },
    // Overdue
    { reg: 'OVR-TS-001', make: 'Ford',           model: 'Transit',       km: 36000,  iD: 180, iK: 10000, lastDate: daysAgo(380), lastKm: 20000 },
    { reg: 'OVR-MH-002', make: 'Mercedes',       model: 'Sprinter',      km: 62000,  iD: 365, iK: 20000, lastDate: daysAgo(400), lastKm: 30000 },
    { reg: 'OVR-KA-003', make: 'Tata',           model: 'Ace Gold',      km: 28000,  iD: 180, iK: 8000,  lastDate: daysAgo(220), lastKm: 19000 },
    // Due
    { reg: 'DUE-DL-001', make: 'Ford',           model: 'Transit',       km: 19000,  iD: 180, iK: 10000, lastDate: daysAgo(190), lastKm: 18200 },
    { reg: 'DUE-TN-002', make: 'Tata',           model: '407',           km: 44000,  iD: 180, iK: 12000, lastDate: daysAgo(185), lastKm: 43100 },
    { reg: 'DUE-GJ-003', make: 'Mercedes',       model: 'Sprinter',      km: 21000,  iD: 365, iK: 10000, lastDate: daysAgo(120), lastKm: 10500 },
    // Archived
    { reg: 'ARC-001',    make: 'Ford',           model: 'Transit',       km: 100000, iD: 180, iK: 10000, lastDate: daysAgo(400), lastKm: 99000,  archived: true },
    { reg: 'ARC-002',    make: 'Mercedes',       model: 'Sprinter',      km: 155000, iD: 365, iK: 20000, lastDate: daysAgo(420), lastKm: 145000, archived: true },
    { reg: 'ARC-003',    make: 'Tata',           model: 'Prima 4038.S',  km: 200000, iD: 365, iK: 30000, lastDate: daysAgo(500), lastKm: 190000, archived: true },
  ];

  await prisma.vehicle.createMany({
    data: vehiclesData.map(v => ({
      registration:          v.reg,
      make:                  v.make,
      model:                 v.model,
      odometer:              v.km,
      dateIntervalDays:      v.iD,
      mileageInterval:       v.iK,
      lastCompletedDate:     v.lastDate,
      lastCompletedOdometer: v.lastKm,
      archivedAt:            v.archived ? new Date() : undefined,
    })),
  });
  console.log(`✓ ${vehiclesData.length} vehicles created`);

  // ── Helper ────────────────────────────────────────────────────────────────
  const veh = async (reg: string) => {
    const v = await prisma.vehicle.findUnique({ where: { registration: reg } });
    if (!v) throw new Error(`Vehicle ${reg} not found`);
    return v;
  };

  async function makeRecord(opts: {
    id: string; reg: string; desc: string; status: ServiceStatus;
    becameDueAt: Date; scheduledDate?: Date; completedAt?: Date; createdAt: Date;
    techIds: string[];
    events: { id: string; actorId: string; type: EventType; oldValue?: string; newValue?: string; createdAt: Date }[];
  }) {
    const vehicle = await veh(opts.reg);
    await prisma.serviceRecord.create({
      data: {
        id: opts.id, vehicleId: vehicle.id, description: opts.desc, status: opts.status,
        becameDueAt: opts.becameDueAt, scheduledDate: opts.scheduledDate,
        completedAt: opts.completedAt, createdAt: opts.createdAt,
      },
    });
    await prisma.serviceAssignment.createMany({
      data: opts.techIds.map(tid => ({ serviceRecordId: opts.id, technicianId: tid })),
    });
    await prisma.serviceEvent.createMany({
      data: opts.events.map(e => ({ ...e, serviceRecordId: opts.id })),
    });
  }

  // ── Service records ────────────────────────────────────────────────────────
  const M = IDS.manager;
  await makeRecord({
    id: 'sr-001', reg: 'OVR-TS-001',
    desc: 'Overdue full maintenance — engine oil, air filter, brake pads, tyre rotation',
    status: ServiceStatus.IN_SERVICE, becameDueAt: daysAgo(200), scheduledDate: daysAgo(3), createdAt: daysAgo(6),
    techIds: [IDS.techA, IDS.techB],
    events: [
      { id: 'se-001-1', actorId: M,          type: EventType.CREATED,       createdAt: daysAgo(6) },
      { id: 'se-001-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE',    newValue: 'BOOKED',     createdAt: daysAgo(5) },
      { id: 'se-001-3', actorId: M,          type: EventType.ASSIGNED,                          newValue: IDS.techA,    createdAt: daysAgo(5) },
      { id: 'se-001-4', actorId: M,          type: EventType.ASSIGNED,                          newValue: IDS.techB,    createdAt: daysAgo(5) },
      { id: 'se-001-5', actorId: IDS.techA,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(3) },
      { id: 'se-001-6', actorId: IDS.techA,  type: EventType.NOTE,          newValue: 'Brake pads worn — replacing both axles. Oil flush complete.', createdAt: daysAgo(2) },
    ],
  });

  await makeRecord({
    id: 'sr-002', reg: 'TS07AB1001',
    desc: 'Standard 10k service — oil change, tyre rotation, cabin filter',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(28), scheduledDate: daysAgo(22), completedAt: daysAgo(20), createdAt: daysAgo(30),
    techIds: [IDS.techC],
    events: [
      { id: 'se-002-1', actorId: M,          type: EventType.CREATED,       createdAt: daysAgo(30) },
      { id: 'se-002-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE',        newValue: 'BOOKED',     createdAt: daysAgo(29) },
      { id: 'se-002-3', actorId: IDS.techC,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED',     newValue: 'IN_SERVICE', createdAt: daysAgo(22) },
      { id: 'se-002-4', actorId: IDS.techC,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED',  createdAt: daysAgo(20) },
      { id: 'se-002-5', actorId: IDS.techC,  type: EventType.NOTE,          newValue: 'All good. Next service in 10,000 km.', createdAt: daysAgo(20) },
    ],
  });

  await makeRecord({
    id: 'sr-003', reg: 'DUE-DL-001',
    desc: 'Date-triggered inspection — full safety check',
    status: ServiceStatus.BOOKED, becameDueAt: daysAgo(10), scheduledDate: daysFromNow(2), createdAt: daysAgo(8),
    techIds: [IDS.techB],
    events: [
      { id: 'se-003-1', actorId: M,         type: EventType.CREATED,       createdAt: daysAgo(8) },
      { id: 'se-003-2', actorId: M,         type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(7) },
      { id: 'se-003-3', actorId: M,         type: EventType.ASSIGNED,                       newValue: IDS.techB, createdAt: daysAgo(7) },
    ],
  });

  await makeRecord({
    id: 'sr-004', reg: 'MH12GH4004',
    desc: 'Annual major service — gearbox flush, clutch inspection, all fluids',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(50), scheduledDate: daysAgo(44), completedAt: daysAgo(42), createdAt: daysAgo(52),
    techIds: [IDS.techD, IDS.techE],
    events: [
      { id: 'se-004-1', actorId: M,          type: EventType.CREATED,       createdAt: daysAgo(52) },
      { id: 'se-004-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(51) },
      { id: 'se-004-3', actorId: M,          type: EventType.ASSIGNED,      newValue: IDS.techD, createdAt: daysAgo(51) },
      { id: 'se-004-4', actorId: M,          type: EventType.ASSIGNED,      newValue: IDS.techE, createdAt: daysAgo(51) },
      { id: 'se-004-5', actorId: IDS.techD,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(44) },
      { id: 'se-004-6', actorId: IDS.techD,  type: EventType.NOTE,          newValue: 'Clutch at 60% — advised replacement within 15k km.', createdAt: daysAgo(43) },
      { id: 'se-004-7', actorId: IDS.techD,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: daysAgo(42) },
    ],
  });

  await makeRecord({
    id: 'sr-005', reg: 'KA01NP7007',
    desc: '8k mileage check — tyres, lights, coolant level',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(14), scheduledDate: daysAgo(10), completedAt: daysAgo(9), createdAt: daysAgo(15),
    techIds: [IDS.techF],
    events: [
      { id: 'se-005-1', actorId: M,          type: EventType.CREATED, createdAt: daysAgo(15) },
      { id: 'se-005-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(14) },
      { id: 'se-005-3', actorId: M,          type: EventType.ASSIGNED, newValue: IDS.techF, createdAt: daysAgo(14) },
      { id: 'se-005-4', actorId: IDS.techF,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(10) },
      { id: 'se-005-5', actorId: IDS.techF,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: daysAgo(9) },
    ],
  });

  await makeRecord({
    id: 'sr-006', reg: 'OVR-MH-002',
    desc: 'Long-overdue engine overhaul — cylinders, gaskets, coolant system',
    status: ServiceStatus.BOOKED, becameDueAt: daysAgo(35), scheduledDate: daysFromNow(4), createdAt: daysAgo(7),
    techIds: [IDS.techG, IDS.techH],
    events: [
      { id: 'se-006-1', actorId: M,  type: EventType.CREATED, createdAt: daysAgo(7) },
      { id: 'se-006-2', actorId: M,  type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(6) },
      { id: 'se-006-3', actorId: M,  type: EventType.ASSIGNED, newValue: IDS.techG, createdAt: daysAgo(6) },
      { id: 'se-006-4', actorId: M,  type: EventType.ASSIGNED, newValue: IDS.techH, createdAt: daysAgo(6) },
    ],
  });

  await makeRecord({
    id: 'sr-007', reg: 'TN22WX1011',
    desc: 'Brake system overhaul — disc replacement front and rear',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(40), scheduledDate: daysAgo(35), completedAt: daysAgo(33), createdAt: daysAgo(42),
    techIds: [IDS.techI],
    events: [
      { id: 'se-007-1', actorId: M,          type: EventType.CREATED, createdAt: daysAgo(42) },
      { id: 'se-007-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(41) },
      { id: 'se-007-3', actorId: IDS.techI,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(35) },
      { id: 'se-007-4', actorId: IDS.techI,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: daysAgo(33) },
    ],
  });

  await makeRecord({
    id: 'sr-008', reg: 'DL08ST9009',
    desc: 'Transmission service — filter and fluid change',
    status: ServiceStatus.IN_SERVICE, becameDueAt: daysAgo(20), scheduledDate: daysAgo(5), createdAt: daysAgo(22),
    techIds: [IDS.techJ, IDS.techA],
    events: [
      { id: 'se-008-1', actorId: M,          type: EventType.CREATED, createdAt: daysAgo(22) },
      { id: 'se-008-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(21) },
      { id: 'se-008-3', actorId: M,          type: EventType.ASSIGNED, newValue: IDS.techJ, createdAt: daysAgo(21) },
      { id: 'se-008-4', actorId: IDS.techJ,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(5) },
    ],
  });

  await makeRecord({
    id: 'sr-009', reg: 'UP32GH6016',
    desc: 'Electrical fault — intermittent starting failure, alternator replacement',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(60), scheduledDate: daysAgo(55), completedAt: daysAgo(53), createdAt: daysAgo(62),
    techIds: [IDS.techB, IDS.techC],
    events: [
      { id: 'se-009-1', actorId: M,          type: EventType.CREATED, createdAt: daysAgo(62) },
      { id: 'se-009-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(61) },
      { id: 'se-009-3', actorId: IDS.techB,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(55) },
      { id: 'se-009-4', actorId: IDS.techB,  type: EventType.NOTE, newValue: 'Faulty alternator identified and replaced. Battery terminals cleaned.', createdAt: daysAgo(54) },
      { id: 'se-009-5', actorId: IDS.techB,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: daysAgo(53) },
    ],
  });

  await makeRecord({
    id: 'sr-010', reg: 'GJ01AB3013',
    desc: 'Pre-monsoon inspection — wipers, lights, drainage, coolant flush',
    status: ServiceStatus.COMPLETED, becameDueAt: daysAgo(75), scheduledDate: daysAgo(70), completedAt: daysAgo(68), createdAt: daysAgo(77),
    techIds: [IDS.techE],
    events: [
      { id: 'se-010-1', actorId: M,          type: EventType.CREATED, createdAt: daysAgo(77) },
      { id: 'se-010-2', actorId: M,          type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(76) },
      { id: 'se-010-3', actorId: IDS.techE,  type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(70) },
      { id: 'se-010-4', actorId: IDS.techE,  type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: daysAgo(68) },
    ],
  });

  // Additional records keep the demo useful across pagination and include
  // unassigned due work for the manager workflow.
  const demoVehicles = vehiclesData.filter(v => !v.archived).map(v => v.reg);
  const demoTechnicians = [IDS.techA, IDS.techB, IDS.techC, IDS.techD, IDS.techE, IDS.techF, IDS.techG, IDS.techH, IDS.techI, IDS.techJ];
  const demoStatuses = [ServiceStatus.DUE, ServiceStatus.BOOKED, ServiceStatus.IN_SERVICE, ServiceStatus.COMPLETED];

  for (let i = 11; i <= 40; i++) {
    const status = demoStatuses[i % demoStatuses.length];
    const createdAt = daysAgo(i + 4);
    const scheduledDate = status === ServiceStatus.DUE ? undefined : daysAgo(i + 2);
    const completedAt = status === ServiceStatus.COMPLETED ? daysAgo(i % 5) : undefined;
    const isUnassigned = status === ServiceStatus.DUE && i % 2 === 1;
    const techIds = isUnassigned ? [] : [demoTechnicians[i % demoTechnicians.length]];
    const events: { id: string; actorId: string; type: EventType; oldValue?: string; newValue?: string; createdAt: Date }[] = [
      { id: `se-${i}-1`, actorId: M, type: EventType.CREATED, createdAt },
    ];

    if (techIds.length > 0) {
      events.push({ id: `se-${i}-2`, actorId: M, type: EventType.ASSIGNED, newValue: techIds[0], createdAt: daysAgo(i + 3) });
    }
    if (status !== ServiceStatus.DUE) {
      events.push({ id: `se-${i}-3`, actorId: M, type: EventType.STATUS_CHANGE, oldValue: 'DUE', newValue: 'BOOKED', createdAt: daysAgo(i + 2) });
    }
    if (status === ServiceStatus.IN_SERVICE || status === ServiceStatus.COMPLETED) {
      events.push({ id: `se-${i}-4`, actorId: techIds[0] || M, type: EventType.STATUS_CHANGE, oldValue: 'BOOKED', newValue: 'IN_SERVICE', createdAt: daysAgo(i + 1) });
    }
    if (status === ServiceStatus.COMPLETED) {
      events.push({ id: `se-${i}-5`, actorId: techIds[0] || M, type: EventType.STATUS_CHANGE, oldValue: 'IN_SERVICE', newValue: 'COMPLETED', createdAt: completedAt! });
    }

    await makeRecord({
      id: `sr-${String(i).padStart(3, '0')}`,
      reg: demoVehicles[i % demoVehicles.length],
      desc: `Scheduled maintenance check ${i} — fluids, brakes and safety inspection`,
      status,
      becameDueAt: createdAt,
      scheduledDate,
      completedAt,
      createdAt,
      techIds,
      events,
    });
  }

  // ── Alert dismissal ───────────────────────────────────────────────────────
  const ovrMh = await veh('OVR-MH-002');
  await prisma.alertDismissal.create({
    data: { vehicleId: ovrMh.id, dueCycleStart: daysAgo(35), dismissedAt: daysAgo(30) },
  });

  console.log('✓ Service records and events seeded');
  console.log('\n── Credentials ───────────────────────────────────────────────');
  console.log('  manager@fleet.com  / password123  (Arjun Sharma — Manager)');
  console.log('  ID: 00000001-0000-4000-8000-000000000000');
  for (let i = 0; i < 10; i++) {
    const label = String.fromCharCode(65 + i); // A-J
    const hex   = (i + 2).toString(16).padStart(8, '0');
    const u     = USERS[i + 1];
    console.log(`  ${u.email.padEnd(22)} / password123  (${u.name}) — ID: ${hex}-0000-4000-8000-000000000000`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
