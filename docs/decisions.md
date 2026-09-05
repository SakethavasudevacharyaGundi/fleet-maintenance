# Architecture and Implementation Decisions

## 1. UUIDs over sequential IDs

I used `String @id @default(uuid())` for database entities rather than sequential IDs. Sequential identifiers expose iteration counts and make resource enumeration easier. UUIDs provide opaque identifiers for API routes and relationships, while the interface displays short professional staff identifiers where users need to see an ID.

## 2. Service lifecycle in a dedicated service module

Lifecycle logic lives in `server/src/services/lifecycle.js` rather than in the Express route handler. The route validates authentication and forwards the action. The service validates the current state, applies the transaction, updates related vehicle data when required, and writes the audit event.

The alternative was embedding each transition in the route. That would work at small scale, but it would be harder to test in isolation and would encourage special cases to accumulate in the HTTP layer.

## 3. Alert dismissal is tied to a service cycle

`AlertDismissal` uses a composite primary key of `(vehicleId, dueCycleStart)`, where `dueCycleStart` identifies the overdue service cycle.

The alternative was a single dismissed flag on the vehicle. That would permanently silence future alerts for the same vehicle. Tying dismissal to the cycle allows a new due cycle to produce a new alert automatically.

## 4. Odometer updates use a guarded update

The bulk odometer endpoint uses a Prisma `updateMany` operation with an `odometer <= newReading` condition. If the update count is zero, the reading is rejected as lower than the current reading.

The alternative was reading the vehicle first, comparing in application code, and then writing it. That approach has a race condition because two concurrent requests could read the same old value. The guarded update keeps the comparison and write atomic at the database level.

## 5. Dashboard metrics use aggregate queries

The dashboard service uses grouped counts and bounded completion queries instead of loading every vehicle or service record and counting them in application code. This keeps the request path predictable and avoids an N plus 1 query pattern.

## 6. Service events are append only

The history requirement means service events cannot be rewritten after the fact. The application has no update or delete route for events. New status changes, assignments, unassignments, and notes create new events instead.

## 7. Technician visibility is enforced on the server

Technicians receive records through the restricted `/api/service-records/mine` route, which limits results to assignments for the authenticated user. Manager permissions and assignment mutations are enforced by server side role middleware rather than relying on hidden frontend controls.

## 8. One decision I reversed: direct fetch calls versus the shared API helper

Early frontend code used direct relative `fetch` calls. That worked with the local Vite proxy but was fragile when the client and API were deployed separately. I moved requests to the shared API helper so authentication headers and the production API base are handled consistently in one place.

## 9. Supabase connection pooling mode

The initial deployment used Supabase session mode on port 5432. Prisma's connection pool exhausted the available session connections under concurrent requests. I changed the application connection to Supabase transaction mode on port 6543 with `pgbouncer=true` and `connection_limit=1`. The direct connection remains available for migration operations.
