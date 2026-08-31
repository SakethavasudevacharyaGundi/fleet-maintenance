# Assignment 08 — Fleet Maintenance

## The scenario

Picture a small logistics company running a fleet of several dozen delivery vans and trucks, each
supposed to go in for service on a schedule — but "schedule" currently means whichever comes first
among a wall calendar, a technician's memory, and a driver mentioning the engine sounds odd.
Odometer readings get radioed in occasionally and written on a whiteboard that gets erased at the
end of the week.

The result is predictable. A van goes in for service six weeks late because nobody was tracking that
it had also quietly passed its mileage interval while everyone was only watching the calendar. A
reading gets entered wrong — lower than what was already on file — and the next few weeks of
tracking are built on bad data until someone notices the van has apparently driven backward. Asking
which vehicles are actually due for service today means checking two different systems and hoping
both are current.

They want one system: a fleet manager sets a date interval and a mileage interval for each vehicle,
technicians handle the service records assigned to them, and a vehicle is flagged the moment either
interval is reached. Anyone should be able to tell which vehicles are due, and which are overdue,
without cross-checking a calendar against a whiteboard. Build the system that replaces both.

## What it must do

Everything below is required. Several of the ten spell out exact rules — what happens on an illegal
move, what a bulk action must report back, when a dismissed alert is allowed to reappear — and those
specifics are the actual ask, not just the bold headline in front of them.

1. **Accounts and roles.** People sign in with an email and password, and there are at least two
roles — a fleet manager role and a technician role. Fleet managers create and archive vehicles, set
each vehicle's service intervals, assign technicians to service records, and see the whole fleet.
Technicians can only see and update service records assigned to them, and cannot create vehicles,
change service intervals, or reassign a record to someone else. The difference must be enforced on
the server, not just hidden in the interface.

2. **Vehicles.** Fleet managers create vehicles with a registration number, a make and model, a
current odometer reading, a date interval and a mileage interval for service, and can edit them
later. Vehicles can be archived and restored. Archiving removes a vehicle from the default fleet
view without destroying its service history.

3. **Service records.** Every service record belongs to exactly one vehicle and carries a
description of the work, plus which technicians are currently assigned to it. Records can be created
by a fleet manager, and their description of the work updated by whoever is assigned, but not who is
assigned to them. Opening a vehicle shows its service history.

4. **A service lifecycle with rules.** A service record moves through *Due → Booked → In Service →
Completed*. A vehicle becomes due for its next service when either its date interval or its mileage
interval is reached since its last completed service, whichever happens first; a record that remains
Due for longer than a set grace period without being booked counts as overdue. Booking assigns a
scheduled date and a technician, moving the record to Booked; work then moves it to In Service and
finally to Completed. Completing a service resets both counters, so the date and mileage intervals
both start again from that service's date and odometer reading, and any other move must be rejected
by the server with a message explaining why.

5. **Assignment.** Any number of technicians can be assigned to a service record, and a single
technician can be assigned to any number of records at once. Only a fleet manager can add or remove
a technician's assignment. Every technician can see one list of every record assigned to them,
across every vehicle.

6. **Finding service records.** One list shows service records across every vehicle the viewer can
see, with a text search over descriptions, filters for vehicle, status and technician, sorting by
scheduled date, status or last update, and pagination showing the total number of matches. All of
this must happen on the server — do not load every service record into the browser and filter there.

7. **Acting on many odometer readings at once.** Fleet managers can bulk-update odometer readings
from a CSV file of vehicle identifiers and readings. The result is a per-row report: a row succeeds
and updates the vehicle's current reading, or is rejected — with a reason — if its reading is lower
than that vehicle's most recently recorded one, and valid rows are applied even when others in the
same file are rejected. Separately, export the service history — every service record with its
vehicle, dates, and status — as a CSV file.

8. **A dashboard.** A landing view shows headline numbers — vehicles due for service, vehicles
currently in service, services completed this week, and vehicles overdue for service. It also breaks
service records down by status and by technician, and charts services completed per week over the
last eight weeks.

9. **History you cannot rewrite.** Every service record has a timeline showing when it was created,
every status change with the old and new value and who made it, every technician assignment and
unassignment, and any notes left on it. Nothing in this timeline can be edited or deleted after the
fact, including by fleet managers.

10. **Overdue service alerts.** A service record that has become overdue appears in an alerts area,
with a count badge visible in the navigation. A fleet manager can dismiss the alert for that
vehicle. If the vehicle becomes due again for its next service and is again left unbooked past the
same grace period, the alert returns.

## Stretch ideas (optional)

None of these are required, and none substitute for a goal above. If you finish all ten with time
left over, pick whichever of these sounds most useful and build it:

- Trip and mileage logs per driver.
- Fuel purchase and efficiency tracking.
- Parts inventory linked to service records.
- Vehicle inspection checklists.
- Insurance and registration renewal reminders.
- Cost reporting per vehicle over time.
- Driver assignment to vehicles.
- Location tracking integration.
- Warranty and recall tracking.


---

## What we are assessing

A working application is table stakes. Almost every serious candidate will produce something that runs, has a login, and roughly does what was asked. That's the floor, not the differentiator.

What actually separates submissions is the record of thinking behind the app: the decisions you made and why, the trade-offs you weighed, what you built first and what you deliberately left out, and whether you can explain any part of your own system when asked. We are hiring for judgement. The app is the evidence for that judgement, not the deliverable in itself.

We also read the code itself for structure and readability, which counts for a small share of the overall score.

## Time budget

Budget about 12 hours total, spent roughly 2 hours a day across a week.

This is not a race. We are not timing you against other candidates, and submitting early scores nothing extra. Twelve hours is a size guide so you know how much to attempt — pace yourself, stop when you're tired, and spend some of that time thinking and documenting, not only typing code.

## Pick any stack you like

Use any language, any framework, any UI library, any ORM, and any database access approach you want. We have no house stack, and no stack scores better than another — this round is not a test of whether you know particular tools.

Use whatever you are fastest and most confident in. Time spent learning something new to impress us is time not spent on the ten goals above, and it will show.

## Using AI is allowed and encouraged

Use AI tools however you want — to scaffold code, debug a stuck problem, write tests, draft documentation, or anything else that helps you move faster. A few things to know about how we treat it:

- We do not penalise AI use, and we make no attempt to detect it.
- We care about whether you understood, directed and verified the output — not about who or what produced the first draft of it.
- `docs/ai-prompts.md` must contain the prompts you actually used, including the ones that produced bad output and what you changed afterwards. If you used no AI at all, say so here and describe how you worked instead — that is assessed the same way.
- Submitting generated code you cannot explain is the single most common way candidates fail this round.

You are accountable for everything in your submission. If a reviewer points at a piece of code and asks why it's there, or why it works the way it does, "the AI wrote it" is not an answer.

## Use git properly

Publish to a public GitHub repository, and commit incrementally as the work actually happens — after each meaningful step, not in one pass at the end.

A repository whose entire history is a single "initial commit" containing a finished app scores zero on git history, and it colours how we read everything else in your submission, however good the app itself is. Your history is how we see the order you built in, where you got stuck, and how the design changed along the way. If it isn't there, we can't assess it, and we won't assume the best.

## What you must commit

Alongside your code, commit these five files under `docs/`. Your zip includes a stub for each with the questions it needs to answer — fill them in as you go, not from memory at the end.

| File | What it must answer |
|------|----------------------|
| `docs/architecture.md` | What the moving pieces are, how they talk to each other, where each one runs, the request path for one representative user action end to end, and what you decided not to build. |
| `docs/schema.md` | Every table's columns and types, which relationships are one-to-many versus many-to-many, which constraints live in the database versus the application, what you deliberately denormalised, and what would break first at 100x the data. |
| `docs/plan.md` | How you split the work into sessions, what order you built in and why, what you estimated versus what it actually took, and what you cut when you ran short. |
| `docs/decisions.md` | At least five real decisions — what you chose, what you rejected, and why — including at least one you later reversed. |
| `docs/ai-prompts.md` | The prompts you actually used, in order, grouped by what you were trying to do, including at least one that produced something wrong and what you did about it. |

## Host it for free

Deploy the whole thing somewhere reachable by URL, using free tiers only.

One combination that works, if you would rather not decide:

- **Database** — a managed service such as Supabase.
- **Server-side code** — Render.
- **Browser-side code** — Vercel.

Deploy in that order: create the database first, give the server its connection details as environment variables, then point the browser-side part at the server's public URL.

This is one option, not a requirement. Any free host is equally acceptable — everything on a single provider, one virtual machine, a container platform, a static host with serverless functions. The choice earns and loses nothing.

Requirements:

- A working live URL.
- Seeded with enough demo data to show the system doing something, not an empty shell.
- Demo credentials for every role recorded in `SUBMISSION.md`.
- Connection strings, keys and passwords kept in environment variables, never in the repository.
- Free tiers often sleep when idle and can take a minute or more to wake. Note it in `SUBMISSION.md` if yours does, so a slow first load is not read as a broken deployment.
- If you cannot get it hosted, submit anyway and record in `SUBMISSION.md` what you tried and where it broke.

## How to submit

Send us:

- The URL of your public GitHub repository.
- The URL of your live, deployed application.
- Your completed `SUBMISSION.md`, committed to the repository.

That's the whole submission. Nothing else to prepare, no separate form.

## What happens next

If your submission clears the bar, we'll set up a short call. We will ask about specific decisions we can see in your repository and its history — why you modelled something a particular way, what a certain commit was fixing, what you'd change if you kept going.

We're telling you this now because it should change how carefully you document as you go. Write `docs/decisions.md` for a version of yourself who has to explain it three weeks from now.

## Scope

The 10 goals stated in this brief are the cutoff. Meet all 10, solidly, and you have a complete submission.

Stretch ideas are optional. They exist for candidates who finish the 10 with time left and want to keep building — they are never required, and they do not make up for a goal you didn't hit. Doing 8 goals well beats doing 10 goals badly. If time is short, finish fewer goals properly rather than leaving all ten half-done.
