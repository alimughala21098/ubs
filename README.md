# FAR Tech — Upwork Bid Pipeline

A sales-CRM-style tracker for Upwork bidding, with role-based access matching
the main FAR Tech Sales CRM: **admins** manage everything and create every
account from Settings → Team; **bidders** see and work only their own bids.

**Stack:** React 18 + Vite · Supabase (PostgreSQL + Realtime + Edge
Functions) · Netlify

---

## Roles

| Role     | Can do |
|----------|--------|
| `admin`  | See and edit every bid across the whole team · edit Settings · create, re-role, and remove teammate accounts from **Settings → Team** · see the "Performance by bidder" breakdown on the Dashboard |
| `bidder` | See and edit only the bids they personally created · view (read-only) Settings |

There is **no public self-signup**. `Login.jsx` is sign-in only — every
account is created by an admin, and the person can sign in immediately
(no email confirmation step).

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `profiles` (role: `bidder` or `admin`, auto-created whenever an auth
     user is created — including admin-created accounts)
   - `bids` (the core pipeline table, scoped per-bidder)
   - `bid_logs` (append-only communication log, one row per entry)
   - `settings` (single row: connects cap, win target, commission rate,
     escalation threshold)
   - Row Level Security policies: admins read/write everything; bidders
     read/write only bids (and logs on those bids) where `created_by`
     is themselves; only admins can update `settings`
   - Realtime publication for `bids`, `bid_logs`, `settings`, `profiles`
3. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.
4. Promote your own first login to `admin` once (every other account after
   that is created from inside the app):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   (You'll need to have signed in once already so the row exists — see
   step 3 below for the one manual first-user creation via the Supabase
   dashboard, or just run the SQL above after inviting yourself through
   **Authentication → Users → Add user** in the Supabase dashboard with
   "Auto Confirm User" checked.)

## 2. Deploy the `manage-employee` Edge Function

Account creation needs to happen server-side because it uses the Supabase
**service role key**, which must never be shipped to the browser. The
`manage-employee` function handles create / re-role / remove and is called
from Settings → Team.

```bash
npm install -g supabase   # if you don't already have the CLI
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy manage-employee
```

No manual secrets setup is needed — `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for every edge
function.

## 3. Configure the app

```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.3.
(Never put the service role key in `.env` — it's only used inside the edge
function, on Supabase's servers.)

## 4. Run locally

```bash
npm install
npm run dev
```
Open the printed local URL and sign in with the admin account you created
in step 1.4. From there, go to **Settings → Team** to add the rest of the
team — each new account can sign in immediately.

## 5. Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: `npm run build`, publish directory: `dist` (already set
   in `netlify.toml`).
4. Under **Site settings → Environment variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `netlify.toml` includes an SPA redirect so client-side routing
   doesn't 404 on refresh.

Standard update flow after that: push to `src/` → Netlify auto-deploys in
30–60 seconds. Only run SQL again in the Supabase editor for schema
changes, and re-run `supabase functions deploy manage-employee` if you
edit the edge function.

## How it's organized

```
src/
  supabaseClient.js       Supabase client singleton
  context/
    AuthContext.jsx       session + profile/role (isAdmin, isBidder)
    ToastContext.jsx      toast notifications
  hooks/
    useBids.js             fetch + realtime subscribe + CRUD for bids/logs
                            (RLS scopes rows automatically per role)
    useSettings.js         fetch + realtime subscribe + update for settings
  components/
    Login.jsx               sign-in only — no self-signup
    EmployeeManager.jsx      admin-only: create / re-role / remove accounts
    Header.jsx               brand, connects gauge, win stamps, primary actions
    ConnectsGauge.jsx        semicircular connects gauge (amber at 70%, red at 90%)
    WinStamps.jsx            probation win stamp row
    FilterBar.jsx            search / country / bidder (admin-only) / needs-review filter
    Board.jsx                kanban board, HTML5 drag-and-drop between stages
    BidCard.jsx              card + escalation/follow-up/stuck indicators + bidder name
    BidModal.jsx             full bid create/edit form + communication log
    SettingsModal.jsx        General tab (all) + Team tab (admin-only, wraps EmployeeManager)
    Dashboard.jsx            response/interview/win rate, sparkline, financials,
                             + admin-only "Performance by bidder" breakdown
  lib/
    constants.js             stage list, follow-up rules, defaults
    format.js                money/date formatting, day/hour math
supabase/
  schema.sql                 tables, RLS, triggers, realtime
  functions/
    manage-employee/index.ts  admin-only account create/re-role/remove
```

## Notes on judgment calls

- **"Needs follow-up"** is computed for bids in Replied, Interview, or
  Negotiation with no log entry in the last 24 hours (won/lost/archived
  bids don't need follow-up by definition).
- **"Stuck in negotiation"** uses a 5-day threshold since the brief didn't
  fix a number — change `STUCK_DAYS` in `src/lib/constants.js` if your team
  wants a different cutoff.
- **Role scoping is enforced at the database level** (Row Level Security),
  not just hidden in the UI — a bidder's Supabase queries physically cannot
  return another bidder's rows, even if someone opened dev tools.
- Removing a teammate (Settings → Team → Remove) deletes their login but
  keeps their historical bids on the board (`created_by` is set to `null`
  rather than cascading a delete).
- **Syncing a Won bid into the main FAR Tech CRM** is left as a manual
  step — the Won card holds everything an admin needs to copy over. If you
  have an existing CRM with an API, this is the natural next integration
  point (a Supabase Edge Function triggered on `bids.stage = 'won'` would be
  a clean way to push it automatically).
