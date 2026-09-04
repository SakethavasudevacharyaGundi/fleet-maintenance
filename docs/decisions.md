# Architecture & Implementation Decisions

## Database & Schema Design

- **Primary Keys**: Used UUIDs (`String @id @default(uuid())`) rather than sequential IDs to avoid exposing iteration counts (e.g., `/service-records/1`) and ensure secure public referencing.
- **Timestamps**: Utilized PostgreSQL's native timezone handling (via Prisma's `DateTime`). The application logic will enforce operating in UTC consistently.
- **Vehicle Servicing State**: Modeled as nullable `lastCompletedDate` and `lastCompletedOdometer`. A `null` value indicates a vehicle has never had a completed service, implicitly meaning it is due for service immediately.
- **Service Cycle Tracking**: Added a required `becameDueAt` timestamp to `ServiceRecord`. This creates a reliable invariant to calculate `now - becameDueAt` without null checks.
- **Data Integrity (Composite Keys)**: 
  - Prevented duplicate technician assignments by establishing a composite primary key (`serviceRecordId`, `technicianId`) on `ServiceAssignment`.
  - Bound alert dismissals to specific service cycles using `@@id([vehicleId, dueCycleStart])`.
- **Indexing**: Indexed `vehicleId`, `status`, `scheduledDate`, and `updatedAt` for fast record retrieval, along with `createdAt` for events and `technicianId` for assignments.
