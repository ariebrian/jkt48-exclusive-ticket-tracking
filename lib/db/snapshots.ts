import 'server-only';
import { supabaseServer } from './supabase-server';
import type { ResolvedLaneQuota } from './sessions';

export async function writeSnapshotBatch(rows: ResolvedLaneQuota[], snapshotAt: Date): Promise<void> {
  if (rows.length === 0) return;
  const db = supabaseServer();
  const insertRows = rows.map((r) => ({
    session_lane_id: r.sessionLaneId,
    tickets_sold: r.ticketsSold,
    available_quota: r.availableQuota,
    snapshot_at: snapshotAt.toISOString(),
  }));
  const { error } = await db.from('quota_snapshots').insert(insertRows);
  if (error) throw new Error(`Failed to write snapshot batch: ${error.message}`);
}

export interface LiveSessionLane {
  id: string;
  label: string;
  memberName: string;
  ticketsSold: number | null;
  availableQuota: number | null;
  snapshotAt: string | null;
}

export interface LiveSession {
  id: string;
  label: string | null;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  lanes: LiveSessionLane[];
}

// Latest snapshot_at across all lanes in all sessions, as an ISO string, or
// null if no lane has ever been snapshotted. All lanes from one poll run
// share a single snapshot_at (set once per writeSnapshotBatch call), so
// taking the max here is equivalent to reading any one lane's value.
export function getLatestSnapshotTimestamp(sessions: LiveSession[]): string | null {
  let latest: string | null = null;
  let latestMs = -Infinity;

  for (const session of sessions) {
    for (const lane of session.lanes) {
      if (!lane.snapshotAt) continue;
      const ms = new Date(lane.snapshotAt).getTime();
      if (Number.isNaN(ms)) continue;
      if (ms > latestMs) {
        latestMs = ms;
        latest = lane.snapshotAt;
      }
    }
  }

  return latest;
}

// Lane labels are "Jalur N" (jalur = lane in Indonesian) — sort on the
// trailing number rather than the stored `position` column, since existing
// rows only get a correct `position` after their next poll and sit at the
// backfill default (0) until then, which produces near-arbitrary ordering.
function laneLabelNumber(label: string): number {
  const match = label.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

// Live quota view for one event: sessions with their lanes, each lane
// carrying its latest snapshot (or nulls if it's never been polled yet).
export async function getLatestSnapshotsForEvent(eventId: string): Promise<LiveSession[]> {
  const db = supabaseServer();

  const { data: sessions, error: sessionsError } = await db
    .from('event_sessions')
    .select('id, label, session_date, start_time, end_time, session_lanes(id, label, member_name, position)')
    .eq('event_id', eventId)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (sessionsError) throw new Error(`Failed to load sessions for event ${eventId}: ${sessionsError.message}`);
  if (!sessions || sessions.length === 0) return [];

  const laneIds = sessions.flatMap(
    (s: { session_lanes: { id: string }[] }) => s.session_lanes?.map((l) => l.id) ?? [],
  );

  const latestByLaneId = new Map<
    string,
    { tickets_sold: number; available_quota: number; snapshot_at: string }
  >();

  if (laneIds.length > 0) {
    const { data: latest, error: latestError } = await db
      .from('latest_quota_snapshots')
      .select('session_lane_id, tickets_sold, available_quota, snapshot_at')
      .in('session_lane_id', laneIds);

    if (latestError) throw new Error(`Failed to load latest snapshots: ${latestError.message}`);
    for (const row of latest ?? []) {
      latestByLaneId.set(row.session_lane_id, row);
    }
  }

  return sessions.map(
    (session: {
      id: string;
      label: string | null;
      session_date: string;
      start_time: string | null;
      end_time: string | null;
      session_lanes: { id: string; label: string; member_name: string; position: number }[];
    }) => ({
      id: session.id,
      label: session.label,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      lanes: (session.session_lanes ?? [])
        .map((lane) => {
          const quota = latestByLaneId.get(lane.id);
          return {
            id: lane.id,
            label: lane.label,
            memberName: lane.member_name,
            ticketsSold: quota?.tickets_sold ?? null,
            availableQuota: quota?.available_quota ?? null,
            snapshotAt: quota?.snapshot_at ?? null,
          };
        })
        .sort((a, b) => laneLabelNumber(a.label) - laneLabelNumber(b.label)),
    }),
  );
}

export interface EventQuotaSummary {
  totalAvailable: number;
  hasAnyQuotaData: boolean;
  isSoldOut: boolean;
}

// Aggregate used by the homepage: is this event sold out everywhere, and
// how much quota is left in total. Small-scale app (a handful of tracked
// events) so per-event queries here are fine — no need for a summary view yet.
export async function getEventQuotaSummary(eventId: string): Promise<EventQuotaSummary> {
  const sessions = await getLatestSnapshotsForEvent(eventId);
  const lanes = sessions.flatMap((s) => s.lanes);
  const withData = lanes.filter((l) => l.availableQuota !== null);

  if (withData.length === 0) {
    return { totalAvailable: 0, hasAnyQuotaData: false, isSoldOut: false };
  }

  const totalAvailable = withData.reduce((sum, l) => sum + (l.availableQuota ?? 0), 0);
  return {
    totalAvailable,
    hasAnyQuotaData: true,
    isSoldOut: totalAvailable === 0,
  };
}
