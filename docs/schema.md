# Schema

## Tables

### `User`

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| email | String | Unique |
| name | String | Display name |
| passwordHash | String | bcrypt, never stored in plaintext |
| role | Enum (MANAGER, TECHNICIAN) | Enforced server side |
| createdAt | DateTime | |

### `Vehicle`

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| registration | String | Unique |
| make | String | |
| model | String | |
| odometer | Int | Current reading, guarded against lower updates |
| dateIntervalDays | Int | Days between services |
| mileageInterval | Int | Distance between services |
| lastCompletedDate | DateTime? | Null means never serviced and implicitly due |
| lastCompletedOdometer | Int? | Null means never serviced |
| archivedAt | DateTime? | Null means active; soft delete |
| createdAt | DateTime | |

### `ServiceRecord`

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| vehicleId | String | Foreign key to Vehicle |
| description | String | Work description |
| status | Enum (DUE, BOOKED, IN_SERVICE, COMPLETED) | Lifecycle state |
| becameDueAt | DateTime | Used for overdue calculation |
| scheduledDate | DateTime? | Set when booked |
| completedAt | DateTime? | Set when completed |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `ServiceAssignment`

| Column | Type | Notes |
|--------|------|-------|
| serviceRecordId | String | Composite primary key with technicianId |
| technicianId | String | Composite primary key with serviceRecordId |

This is the many to many relationship between service records and technicians. The composite primary key prevents duplicate assignments.

### `ServiceEvent`

| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| serviceRecordId | String | Foreign key to ServiceRecord |
| actorId | String | Foreign key to User |
| type | Enum (CREATED, STATUS_CHANGE, ASSIGNED, UNASSIGNED, NOTE) | Event type |
| oldValue | String? | Previous value for a status change or unassignment |
| newValue | String? | New value, assignment, or note text |
| createdAt | DateTime | Immutable audit timestamp |

Service events are append only. There are no update or delete routes for them.

### `AlertDismissal`

| Column | Type | Notes |
|--------|------|-------|
| vehicleId | String | Composite primary key |
| dueCycleStart | DateTime | Composite primary key and service cycle identifier |
| dismissedAt | DateTime | |

The composite primary key `(vehicleId, dueCycleStart)` ties a dismissal to one service cycle rather than permanently suppressing alerts for a vehicle. A new due cycle has a new `dueCycleStart`, so its alert can reappear.

## Relationships

Vehicle to ServiceRecord is one to many.

ServiceRecord to ServiceAssignment is one to many.

User to ServiceAssignment is one to many because a technician can be assigned to many records.

ServiceRecord to ServiceEvent is one to many.

Vehicle to AlertDismissal is one to many, with one dismissal per due cycle.

## Constraints: database versus application

| Rule | Where enforced |
|------|----------------|
| Unique registration | Database (`@unique`) |
| Unique email | Database (`@unique`) |
| Duplicate assignment prevention | Database (composite primary key) |
| Duplicate alert dismissal | Database (composite primary key) |
| State machine transitions | Application (`lifecycle.js`) |
| Odometer monotonicity | Application and database update guard (`updateMany` with `lte`) |
| Role based access | Application (`requireRole` middleware) |
| Service event immutability | Application because no update or delete endpoint exists |

## What would break first at 100 times the data

The service record search query with joins across assignments, vehicles, and related records would be the first likely bottleneck. The main lookup fields are indexed, but description search uses Prisma `contains`, which can become a sequential scan. At larger scale, PostgreSQL `pg_trgm` or a dedicated search index would be appropriate. The dashboard uses bounded aggregate queries rather than an N plus 1 pattern, so it should hold up longer.
