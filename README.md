# FAR Tech — Upwork Bid Pipeline

A sales-CRM-style tracker for Upwork bidding. Built for Saman (bidder) with
review access for Ali Mirza and Rohaan Mughal (admins).

**Stack:** React 18 + Vite · Supabase (PostgreSQL + Realtime) · Netlify

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `profiles` (role: `bidder` or `admin`, auto-created on signup)
   - `bids` (the core pipeline table)
   - `bid_logs` (append-only communication log, one row per entry)
   - `settings` (single row: connects cap, win target, commission rate, escalation threshold)
   - Row Level Security policies (any signed-in team member can read/write the
     board; only `admin` role can edit settings)
   - Realtime publication for `bids`, `bid_logs`, `settings`
3. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.
4. After running the SQL, promote Ali and Rohaan to admins once they've
   signed up once:
   ```sql
   update public.profiles set role = 'admin' where full_name in ('Ali Mirza', 'Rohaan Mughal');
   ```

## 2. Configure the app

```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.3.

## 3. Run locally

```bash
npm install
npm run dev
```
Open the printed local URL. The first person to sign up becomes a `bidder`
by default — update their role in the `profiles` table if needed.

## 4. Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: `npm run build`, publish directory: `dist` (already set
   in `netlify.toml`).
4. Under **Site settings → Environment variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `netlify.toml` includes an SPA redirect so client-side routing
   doesn't 404 on refresh.

## How it's organized

```
src/
  supabaseClient.js       Supabase client singleton
  context/
    AuthContext.jsx       session + profile/role
    ToastContext.jsx      toast notifications
  hooks/
    useBids.js            fetch + realtime subscribe + CRUD for bids/logs
    useSettings.js        fetch + realtime subscribe + update for settings
  components/
    Login.jsx             email/password auth
    Header.jsx             brand, connects gauge, win stamps, primary actions
    ConnectsGauge.jsx      semicircular connects gauge (amber at 70%, red at 90%)
    WinStamps.jsx          probation win stamp row
    FilterBar.jsx          search / country / needs-review filter
    Board.jsx              kanban board, HTML5 drag-and-drop between stages
    BidCard.jsx            card + escalation/follow-up/stuck indicators
    BidModal.jsx           full bid create/edit form + communication log
    SettingsModal.jsx      editable settings (admin-only save)
    Dashboard.jsx          response/interview/win rate, sparkline, financials
  lib/
    constants.js           stage list, follow-up rules, defaults
    format.js               money/date formatting, day/hour math
```

## Notes on judgment calls

- **"Needs follow-up"** is computed for bids in Replied, Interview, or
  Negotiation with no log entry in the last 24 hours (won/lost/archived
  bids don't need follow-up by definition).
- **"Stuck in negotiation"** uses a 5-day threshold since the brief didn't
  fix a number — change `STUCK_DAYS` in `src/lib/constants.js` if your team
  wants a different cutoff.
- **Syncing a Won bid into the main FAR Tech CRM** is left as a manual
  step — the Won card holds everything an admin needs to copy over. If you
  have an existing CRM with an API, this is the natural next integration
  point (a Supabase Edge Function triggered on `bids.stage = 'won'` would be
  a clean way to push it automatically).
