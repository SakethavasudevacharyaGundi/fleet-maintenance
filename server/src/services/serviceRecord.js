const prisma = require('../utils/prisma');

class ServiceRecordError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServiceRecordError';
  }
}

async function updateDescription(serviceRecordId, description, actorId) {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({ where: { id: serviceRecordId } });
    if (!record) throw new ServiceRecordError('Service record not found');

    const updatedRecord = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: { description }
    });

    // Optional: we can generate a NOTE or an explicit EVENT for description change if required,
    // but the assignment typically treats description as just an update. However, to maintain
    // strict auditing of who touched the record, we can drop a NOTE.
    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'NOTE',
        newValue: `Description updated.`
      }
    });

    return updatedRecord;
  });
}

async function assignTechnician(serviceRecordId, technicianId, actorId) {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({ where: { id: serviceRecordId } });
    if (!record) throw new ServiceRecordError('Service record not found');

    const tech = await tx.user.findUnique({ where: { id: technicianId, role: 'TECHNICIAN' } });
    if (!tech) throw new ServiceRecordError('Technician not found');

    const existingAssignment = await tx.serviceAssignment.findUnique({
      where: {
        serviceRecordId_technicianId: {
          serviceRecordId,
          technicianId
        }
      }
    });
    
    if (existingAssignment) {
      throw new ServiceRecordError('Technician already assigned to this record');
    }

    const assignment = await tx.serviceAssignment.create({
      data: {
        serviceRecordId,
        technicianId
      }
    });

    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'ASSIGNED',
        newValue: technicianId
      }
    });

    return assignment;
  });
}

async function unassignTechnician(serviceRecordId, technicianId, actorId) {
  return await prisma.$transaction(async (tx) => {
    const existingAssignment = await tx.serviceAssignment.findUnique({
      where: {
        serviceRecordId_technicianId: {
          serviceRecordId,
          technicianId
        }
      }
    });

    if (!existingAssignment) {
      throw new ServiceRecordError('Technician is not assigned to this record');
    }

    await tx.serviceAssignment.delete({
      where: {
        serviceRecordId_technicianId: {
          serviceRecordId,
          technicianId
        }
      }
    });

    await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'UNASSIGNED',
        oldValue: technicianId
      }
    });

    return { success: true };
  });
}

async function addNote(serviceRecordId, text, actorId) {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.serviceRecord.findUnique({ where: { id: serviceRecordId } });
    if (!record) throw new ServiceRecordError('Service record not found');

    const event = await tx.serviceEvent.create({
      data: {
        serviceRecordId,
        actorId,
        type: 'NOTE',
        newValue: text
      }
    });

    return event;
  });
}

async function searchServiceRecords(query, baseWhere = {}) {
  const { q, vehicleId, status, technicianId, sort, order, page, pageSize } = query;

  const p = Math.max(1, parseInt(page) || 1);
  const size = Math.max(1, parseInt(pageSize) || 20);
  const skip = (p - 1) * size;
  const take = size;

  const allowedSorts = ['createdAt', 'scheduledDate', 'status', 'becameDueAt'];
  const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const orderBy = { [sortField]: sortOrder };

  const where = { ...baseWhere };
  if (q || technicianId) {
    where.AND = where.AND || [];
  }

  if (q) {
    where.AND.push({ description: { contains: q, mode: 'insensitive' } });
  }
  if (vehicleId) {
    where.vehicleId = vehicleId;
  }
  if (status) {
    const s = status.toUpperCase();
    if (['DUE', 'BOOKED', 'IN_SERVICE', 'COMPLETED'].includes(s)) {
      where.status = s;
    } else {
      where.id = 'invalid_status_filter'; // guaranteed no results
    }
  }
  if (technicianId) {
    where.AND.push({ assignments: { some: { technicianId } } });
  }

  if (where.AND && where.AND.length === 0) {
    delete where.AND;
  }

  const [data, total] = await Promise.all([
    prisma.serviceRecord.findMany({ 
      where, 
      orderBy, 
      skip, 
      take,
      include: {
        vehicle: true,
        assignments: { include: { technician: true } }
      }
    }),
    prisma.serviceRecord.count({ where })
  ]);

  return {
    data,
    pagination: {
      page: p,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size)
    }
  };
}

async function exportServiceRecords(query, baseWhere = {}) {
  const { q, vehicleId, status, technicianId, sort, order } = query;

  const allowedSorts = ['createdAt', 'scheduledDate', 'status', 'becameDueAt'];
  const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const orderBy = { [sortField]: sortOrder };

  const where = { ...baseWhere };
  if (q || technicianId) {
    where.AND = where.AND || [];
  }

  if (q) {
    where.AND.push({ description: { contains: q, mode: 'insensitive' } });
  }
  if (vehicleId) {
    where.vehicleId = vehicleId;
  }
  if (status) {
    const s = status.toUpperCase();
    if (['DUE', 'BOOKED', 'IN_SERVICE', 'COMPLETED'].includes(s)) {
      where.status = s;
    } else {
      where.id = 'invalid_status_filter'; // guaranteed no results
    }
  }
  if (technicianId) {
    where.AND.push({ assignments: { some: { technicianId } } });
  }

  if (where.AND && where.AND.length === 0) {
    delete where.AND;
  }

  const data = await prisma.serviceRecord.findMany({ 
    where, 
    orderBy,
    include: {
      vehicle: true
    }
  });

  return data;
}

module.exports = {
  ServiceRecordError,
  updateDescription,
  assignTechnician,
  unassignTechnician,
  addNote,
  searchServiceRecords,
  exportServiceRecords
};
