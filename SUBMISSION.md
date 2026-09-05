# Submission

## Links

- **GitHub repository:** https://github.com/SakethavasudevacharyaGundi/fleet-maintenance
- **Live application:** https://fleet-maintenance-beta.vercel.app

## Notes for the reviewer

The backend uses Render's free tier and may sleep after inactivity. The first request may take 20 to 60 seconds while the instance wakes up.

## Demo credentials

| Role | Email | Password |
| ---- | ----- | -------- |
| Manager | manager@fleet.com | password123 |
| Technician | techa@fleet.com | password123 |
| Technician | techb@fleet.com | password123 |
| Technician | techc@fleet.com | password123 |
| Technician | techd@fleet.com | password123 |
| Technician | teche@fleet.com | password123 |

## Stack

| Layer | What you used | Why |
| ----- | ------------- | --- |
| Frontend | React 19, Vite, TypeScript | Fast to build in, and TypeScript catches lifecycle/role mismatches before runtime |
| Backend | Node.js, Express 5 | Lightweight server for this application size |
| Database | PostgreSQL on Supabase with Prisma | Managed PostgreSQL with a clear ORM workflow |
| Hosting | Vercel and Render | Free tier hosting with GitHub deployment |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
| - | ---- | ------ | ----- |
| 1 | Accounts and roles | Done | JWT authentication and server side role enforcement |
| 2 | Vehicles | Done | Create, edit, archive, restore, and history preservation |
| 3 | Service records | Done | Vehicle records, descriptions, assignments, and history |
| 4 | Service lifecycle | Done | DUE to BOOKED to IN_SERVICE to COMPLETED with validation |
| 5 | Assignment | Done | Manager assignment and technician record visibility |
| 6 | Finding service records | Done | Server side search, filters, sorting, and pagination |
| 7 | Bulk odometer update and export | Done | Per row CSV results and service history export |
| 8 | Dashboard | Done | Summary metrics and eight week completion chart |
| 9 | Immutable history | Done | Append only service events |
| 10 | Overdue service alerts | Done | Grace period, dismissal, and cycle based reappearance |

## How much time did you actually spend?

10 hours total, spread across 4 days.

## What would you do next, with another 12 hours?

Broaden integration tests, add clearer UI error and retry states, improve real time update delivery, add password reset, and benchmark search with a larger dataset.

## What are you least happy with in this codebase, and why?

Vehicle status calculation is duplicated between the vehicle route and alert logic. I would extract it into a shared vehicle status service so changes to the grace period rule have one owner.
