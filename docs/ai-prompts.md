# AI Prompts

I used Gemini throughout this project for brainstorming approaches, drafting code, and debugging. I directed the work, reviewed everything it produced, and rejected or rewrote it in several places where it got things wrong.

## Building the service record lifecycle

### What I was trying to achieve
A single `PATCH /api/service-records/:id/transition` endpoint that enforces the DUE to BOOKED to IN_SERVICE to COMPLETED state machine and writes an audit event on each transition.

### Prompt (paraphrased)
"Here's my state machine for service records: DUE to BOOKED to IN_SERVICE to COMPLETED. Set up the transition logic with an audit event on each change."

### What it got wrong
The first draft looked reasonable at a glance. Transitions were in the right order, and it wrote an audit event each time. But it completely missed the most important part of "Completed": it never touched `vehicle.lastCompletedDate` or `vehicle.lastCompletedOdometer`. Since those two fields are what the whole due/overdue calculation depends on, this bug wouldn't have shown up in any obvious way. The app would have looked like it worked, right up until the next service cycle failed to compute correctly for every vehicle that had ever been serviced. It also crammed all of this logic directly into the route handler, which I didn't want.

### What I did
Rewrote it as a dedicated `serviceRecord.js` service function separate from the route, and added the vehicle counter reset inside the same transaction as the status update. Then I specifically wrote a test that completes a service and checks the vehicle's fields afterward, because this is exactly the kind of silent bug that manual clicking through the UI would never catch.

---

## Fixing a focus loss bug in ServiceDrawer

### What I was trying to achieve
The description textarea in the "Book service" drawer was losing focus after every single keystroke making it completely unusable.

### Prompt (paraphrased)
"This textarea loses focus after every character I type, what's going on?"

### What it got wrong
It confidently suggested adding a `key` prop and wrapping things in `useCallback`. Neither of those had anything to do with the actual problem, and I could tell pretty quickly it was pattern matching to textarea bugs in general rather than looking at what my component was actually doing.

### What I did
Went back through the component myself and found I'd defined a `Field` component inside `ServiceDrawer`'s function body. This means React sees a brand new component type on every render and remounts the textarea from scratch each keystroke, wiping focus. Moved `Field` to module scope, outside the component. One line of reasoning fix once I saw it, but the AI never got close to it.

---

## Deployment: Prisma not generating on Render

### What I was trying to achieve
The backend was returning 500 on every single route right after deploying to Render. No exceptions, nothing worked.

### Prompt (paraphrased)
"Every route on my Express backend returns 500 after deploying to Render. Prisma client is generated fine locally."

### What it got right
This one it nailed. The `@prisma/client` and `prisma` were sitting in `devDependencies`, so Render's production install skipped them entirely, and my `postinstall` script was actually `prisma skills sync`, not a real Prisma command, silently failing because of a trailing `exit 0`. It caught both issues from the error output alone.

### What I did
Applied the fix directly by moving both packages to `dependencies`, fixed `postinstall` to run `prisma generate`. Redeployed, still got a 500, this time from `EMAXCONNSESSION`. That one I traced myself. Supabase's session mode pooler was maxing out at 15 connections almost immediately. Switched `DATABASE_URL` to the transaction mode pooler (port 6543) with connection limit 1, kept `DIRECT_URL` on session mode for migrations.
