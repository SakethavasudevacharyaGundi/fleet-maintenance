# Architecture

## Moving pieces

The system has three runtime components:

**React frontend.** Vite and TypeScript serve the interface from Vercel. It handles login, the dashboard, vehicle management, service records, alerts, bulk upload, and CSV export.

**Express backend.** Node.js runs on Render. It owns business logic, authentication, authorization, and database access. The frontend never talks to the database directly.

**PostgreSQL database.** Supabase hosts the database. The backend accesses it through Prisma ORM.

## How they talk to each other

The frontend communicates with the backend over HTTPS through the shared `api.ts` utility. It attaches a Bearer JWT token to authenticated requests and emits an `auth:unauthorized` event on a 401 response. `AuthContext` listens for that event and clears the session.

The backend validates the JWT on protected routes, checks the authenticated user's role where required, runs business logic through service modules, and queries Supabase through Prisma.

## Where each piece runs

| Component | Host | URL |
|-----------|------|-----|
| Frontend | Vercel | https://fleet-maintenance-beta.vercel.app |
| Backend | Render | https://fleet-maintenance-mnd5.onrender.com |
| Database | Supabase | aws-0-ap-south-1 (private) |

The Render instance uses Supabase's transaction mode pooler on port 6543 with `pgbouncer=true` and `connection_limit=1` to avoid exhausting Supabase's session connection limit.

## Representative request path: Manager books a service record

1. Manager clicks "Book service" on a service detail page.
2. A custom date picker modal opens in the React UI (no `window.prompt`).
3. On confirm, `api.patch('/api/service-records/:id/transition', { action: 'book', scheduledDate, technicianIds })` fires.
4. The request hits the Express router at `PATCH /api/service-records/:id/transition`.
5. `requireAuth` middleware validates the JWT and attaches `req.user`.
6. The route calls `ServiceRecordService.transition(id, action, payload, user)`.
7. The service validates that the current state is `DUE` (rejects with 409 if not).
8. Prisma runs a transaction: updates the record status to `BOOKED`, sets `scheduledDate`, writes a `STATUS_CHANGE` `ServiceEvent` (capturing the user's ID so the timeline can display their name), and creates `ServiceAssignment` rows.
9. A 200 response with the updated record is returned.
10. The frontend re fetches the record and re renders the page.

## What I decided not to build

**Notifications outside the app.** Alerts surface in the dashboard and alerts view. I focused on making the underlying detection logic fully correct first, such as when something becomes overdue, and when a dismissal should and shouldn't reappear. Once that is solid, adding an email or SMS channel on top is a straightforward integration, not a design problem, so it made sense to build it later rather than in parallel with the harder logic.

**Polling instead of WebSockets.** The dashboard and alerts refresh on a short interval rather than pushing updates instantly. For the way this tool is actually used, a manager checking status periodically, not a room full of people watching a live feed, that is a good match: no persistent connections to manage, no reconnect logic, nothing extra to deploy. I would switch to a push based approach if the usage pattern ever called for true real time coordination between multiple simultaneous viewers.

**No stretch features.** Fuel logs, inspection checklists, and similar additions were left out entirely. I put the full time budget into making the 10 required goals hold up under real scrutiny, ensuring correct state transitions, atomic odometer guards, cycle based alerts, and an audit trail that is actually immutable, rather than spreading that time across more features built to a shallower standard.
