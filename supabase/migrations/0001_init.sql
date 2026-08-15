-- JKT48 Exclusive Ticket Quota Tracker — initial schema
-- events -> event_sessions -> session_lanes -> quota_snapshots (time-series fact table)

create extension if not exists pgcrypto;

create table events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  exclusive_id text,
  title text not null,
  category text,
  default_price integer,
  total_quota integer,
  max_purchase integer,
  sales_period jsonb,
  content_body text,
  short_description text,
  is_tracked boolean not null default true,
  last_polled_at timestamptz,
  last_poll_status text,
  last_poll_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text,
  session_date date not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, session_date, start_time, end_time, label)
);

create table session_lanes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references event_sessions(id) on delete cascade,
  label text not null,
  member_name text not null,
  created_at timestamptz not null default now(),
  unique (session_id, label, member_name)
);

create table quota_snapshots (
  id bigserial primary key,
  session_lane_id uuid not null references session_lanes(id) on delete cascade,
  tickets_sold integer not null,
  available_quota integer not null,
  snapshot_at timestamptz not null default now(),
  unique (session_lane_id, snapshot_at)
);

create index idx_quota_snapshots_lane_time on quota_snapshots (session_lane_id, snapshot_at desc);
create index idx_quota_snapshots_snapshot_at on quota_snapshots (snapshot_at);
create index idx_event_sessions_event_id on event_sessions (event_id);
create index idx_session_lanes_session_id on session_lanes (session_id);

create view latest_quota_snapshots as
select distinct on (session_lane_id)
  session_lane_id, tickets_sold, available_quota, snapshot_at
from quota_snapshots
order by session_lane_id, snapshot_at desc;

-- RLS: deny-all. All access goes through the service-role key server-side,
-- this just guards against accidental anon-key exposure.
alter table events enable row level security;
alter table event_sessions enable row level security;
alter table session_lanes enable row level security;
alter table quota_snapshots enable row level security;
