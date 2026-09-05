# Plan

## How I split the work

I worked in roughly four sessions:

1. **Schema and authentication**: designed the data model, set up the Express server, implemented JWT authentication, and seeded the database.
2. **Core backend routes**: implemented vehicle management, service record lifecycle, assignments, audit events, alerts, and CSV workflows.
3. **Frontend**: built the React application with login, dashboard, vehicles, service records, service detail, alerts, and bulk upload views.
4. **Polish and deployment**: added responsive UI behavior, transition states, technician profile workflows, expanded the demo seed, and prepared the Vercel, Render, and Supabase deployment.

## Order and why

I built the backend before the frontend so the API contract was stable before the UI depended on it. This avoided building a mock driven interface that would need to be rewritten when the real data shape was known.

I designed the schema before the routes. Defining the lifecycle, assignments, audit events, and service cycle fields first meant the route handlers could follow clear domain rules without later schema changes for missing concepts.

## Estimated versus actual

I estimated the service lifecycle would take two to three hours. It took longer because the overdue calculation, guarded odometer update, and illegal transition handling each needed separate testing. The lifecycle contains most of the application's business rules.

Deployment also took longer than expected because Prisma needed to generate correctly on Render and Supabase connection pooling needed to be configured for the deployment environment.

## What I cut

All 10 mandatory goals were implemented. I left out the optional stretch features such as fuel logs, inspection checklists, and trip logs so the required lifecycle, alerts, assignments, audit history, search, CSV workflows, and dashboard could be verified properly.
