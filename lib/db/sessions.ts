import 'server-only';
import { supabaseServer } from './supabase-server';
import type { ExclusiveSession } from '../types/jkt48';

export async function getMaxSessionDate(eventId: string): Promise<string | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from('event_sessions')
    .select('session_date')
    .eq('event_id', eventId)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load max session date for ${eventId}: ${error.message}`);
  return data?.session_date ?? null;
}

export async function getMinSessionDate(eventId: string): Promise<string | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from('event_sessions')
    .select('session_date')
    .eq('event_id', eventId)
    .order('session_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load min session date for ${eventId}: ${error.message}`);
  return data?.session_date ?? null;
}

export interface ResolvedLaneQuota {
  sessionLaneId: string;
  ticketsSold: number;
  availableQuota: number;
}

// Upserts event_sessions and session_lanes by their natural keys (the API
// gives no stable IDs for either), and returns each lane's resolved id
// paired with the quota values from this fetch — ready for a snapshot write.
export async function upsertSessionsAndLanes(
  eventId: string,
  sessions: ExclusiveSession[],
): Promise<ResolvedLaneQuota[]> {
  const db = supabaseServer();
  const resolved: ResolvedLaneQuota[] = [];

  for (const session of sessions) {
    const { data: sessionRow, error: sessionError } = await db
      .from('event_sessions')
      .upsert(
        {
          event_id: eventId,
          label: session.label ?? null,
          session_date: session.date,
          start_time: session.start_time ?? null,
          end_time: session.end_time ?? null,
        },
        { onConflict: 'event_id,session_date,start_time,end_time,label' },
      )
      .select('id')
      .single();

    if (sessionError || !sessionRow) {
      throw new Error(`Failed to upsert session ${session.date}: ${sessionError?.message}`);
    }

    if (session.session_detail.length === 0) continue;

    const laneRows = session.session_detail.map((detail, position) => ({
      session_id: sessionRow.id,
      label: detail.label,
      member_name: detail.jkt48_member_name,
      position,
    }));

    const { data: lanes, error: laneError } = await db
      .from('session_lanes')
      .upsert(laneRows, { onConflict: 'session_id,label,member_name' })
      .select('id, label, member_name');

    if (laneError || !lanes) {
      throw new Error(`Failed to upsert lanes for session ${sessionRow.id}: ${laneError?.message}`);
    }

    for (const detail of session.session_detail) {
      const lane = lanes.find(
        (l: { id: string; label: string; member_name: string }) =>
          l.label === detail.label && l.member_name === detail.jkt48_member_name,
      );
      if (lane) {
        resolved.push({
          sessionLaneId: lane.id,
          ticketsSold: detail.tickets_sold,
          availableQuota: detail.available_quota,
        });
      }
    }
  }

  return resolved;
}
