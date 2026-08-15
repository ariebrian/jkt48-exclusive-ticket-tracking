# Project overview

Tracks JKT48 "exclusive" events (digital photobook / handshake-style events). Fetches event data from the official JKT48 API, displays live ticket quota per member, and archives quota snapshots over time so trends can be shown (e.g. "sold out at X time", "quota drop over the week").

- Frontend: Next.js (React)
- Backend: Node.js (Next.js API routes / route handlers)
- Database: Supabase (Postgres)

# Data source

- Endpoint pattern: `https://jkt48.com/api/v1/exclusives/{code}?lang=id`
- `{code}` is a per-event code (e.g. `EX273E`), added manually — there is no listing/discovery endpoint, so new events are registered by hand in our own `events` table.
- Response shape (stable across events, confirmed from a live sample):
  - `data.exclusive_id`, `data.code`, `data.title`, `data.category`, `data.default_price`, `data.total_quota`, `data.max_purchase`
  - `data.sales_period[]` — OFC / General sale windows
  - `data.session[]` — one entry per date+time slot, each with `label`, `date`, `start_time`/`end_time`, and:
    - `session_detail[]` — one entry per "jalur" (lane), with `label`, `jkt48_member_name`, `tickets_sold`, `available_quota`
- Number of sessions per day and number of jalur per session **varies per event** — never assume a fixed count, always iterate the arrays.
- `available_quota: 0` means sold out for that member/jalur — this is a normal, expected state, not an error.
- No public rate-limit docs — add sane delay/backoff between fetches when polling multiple events, don't hammer the endpoint.

# Architecture

- **Event registry**: `events` table in Supabase — event `code`, title, active/tracked flag. Added manually when a new exclusive drops.
- **Fetch/snapshot job**: a scheduled job (Next.js API route hit by an external cron, or Supabase scheduled function) polls each active event's endpoint and writes a snapshot row per member/jalur per session into a `quota_snapshots` (or similar) table, timestamped.
- **Live view**: pages fetch the latest snapshot (or fetch live from the API directly) to show current quota per member.
- **History view**: charts/tables built from `quota_snapshots` over time per member/session.
- Keep the raw-fetch layer (calling the JKT48 API) separate from the storage layer (writing to Supabase) so either can be tested independently.

# Code style

- TypeScript throughout, ES modules (`import`/`export`), not CommonJS
- Match Next.js App Router conventions (route handlers under `app/api/`)
- Supabase client: server-side calls use the service role key only in server contexts (API routes / server components), never expose it client-side

# Workflow

- Run typecheck after making a series of changes
- Prefer running single/targeted tests over the full suite during iteration
- When adding a newly-dropped event, add its code to the `events` table rather than hardcoding it in application code

# Gotchas

- `lang=id` query param affects text fields (titles/descriptions) — keep it consistent across fetches so stored text doesn't mix languages
- Session dates/times are event-specific — don't assume events run daily or at fixed times
- `content_body` / `short_description` can contain HTML-ish or long text — sanitize before rendering
