import 'server-only';
import { supabaseServer } from './supabase-server';
import type { EventRow } from '../types/db';
import type { ExclusiveData } from '../types/jkt48';

export async function getEventByCode(code: string): Promise<EventRow | null> {
  const db = supabaseServer();
  const { data, error } = await db.from('events').select('*').eq('code', code).maybeSingle();
  if (error) throw new Error(`Failed to load event ${code}: ${error.message}`);
  return data;
}

export async function listActiveEvents(): Promise<EventRow[]> {
  const db = supabaseServer();
  const { data, error } = await db.from('events').select('*').eq('is_tracked', true).order('code');
  if (error) throw new Error(`Failed to list active events: ${error.message}`);
  return data ?? [];
}

export async function listAllEvents(): Promise<EventRow[]> {
  const db = supabaseServer();
  const { data, error } = await db.from('events').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to list events: ${error.message}`);
  return data ?? [];
}

export async function createEvent(input: { code: string; title: string }): Promise<EventRow> {
  const db = supabaseServer();
  const { data, error } = await db
    .from('events')
    .insert({ code: input.code, title: input.title })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create event ${input.code}: ${error.message}`);
  return data;
}

export async function setEventTracked(eventId: string, isTracked: boolean): Promise<void> {
  const db = supabaseServer();
  const { error } = await db.from('events').update({ is_tracked: isTracked }).eq('id', eventId);
  if (error) throw new Error(`Failed to update event ${eventId}: ${error.message}`);
}

// Refreshes an event's cached API fields (title/category/etc, raw for
// content_body/short_description — sanitized only at render) after a
// successful poll, and records poll outcome for the admin dashboard.
export async function applySuccessfulPoll(eventId: string, data: ExclusiveData): Promise<void> {
  const db = supabaseServer();
  const { error } = await db
    .from('events')
    .update({
      exclusive_id: data.exclusive_id,
      title: data.title,
      category: data.category ?? null,
      default_price: data.default_price ?? null,
      total_quota: data.total_quota ?? null,
      max_purchase: data.max_purchase ?? null,
      sales_period: data.sales_period,
      content_body: data.content_body ?? null,
      short_description: data.short_description ?? null,
      last_polled_at: new Date().toISOString(),
      last_poll_status: 'ok',
      last_poll_error: null,
    })
    .eq('id', eventId);
  if (error) throw new Error(`Failed to record successful poll for ${eventId}: ${error.message}`);
}

export async function recordFailedPoll(eventId: string, errorDetail: string): Promise<void> {
  const db = supabaseServer();
  const { error } = await db
    .from('events')
    .update({
      last_polled_at: new Date().toISOString(),
      last_poll_status: 'error',
      last_poll_error: errorDetail,
    })
    .eq('id', eventId);
  if (error) throw new Error(`Failed to record failed poll for ${eventId}: ${error.message}`);
}
