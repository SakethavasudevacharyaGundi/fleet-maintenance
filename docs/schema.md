# Schema

Our data model consists of five main entities:

- `User`: Represents both managers and technicians.
- `Vehicle`: Tracks vehicles, including last service completion details to compute maintenance cycles.
- `ServiceRecord`: Core entity for a maintenance cycle, explicitly defining `becameDueAt`.
- `ServiceAssignment`: Maps technicians to service records via a composite key (`serviceRecordId`, `technicianId`).
- `ServiceEvent`: Audit log and lifecycle tracking for service records.
- `AlertDismissal`: Tracks when a manager dismisses an alert for a specific service cycle.
