import { NextResponse } from 'next/server';
import { createEvent, getEventByCode, setEventTracked } from '@/lib/db/events';
import { runSnapshotForEvent } from '@/lib/snapshot-job';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  if (!code || !title) {
    return NextResponse.json({ error: 'code and title are required' }, { status: 400 });
  }

  const existing = await getEventByCode(code);
  if (existing) {
    return NextResponse.json({ error: `Event ${code} already exists` }, { status: 409 });
  }

  const event = await createEvent({ code, title });

  // Best-effort immediate poll so the detail page isn't empty until the next cron tick.
  const snapshotResult = await runSnapshotForEvent(event);

  return NextResponse.json({ event, snapshot: snapshotResult });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const isTracked = typeof body?.is_tracked === 'boolean' ? body.is_tracked : undefined;

  if (!id || isTracked === undefined) {
    return NextResponse.json({ error: 'id and is_tracked are required' }, { status: 400 });
  }

  await setEventTracked(id, isTracked);
  return NextResponse.json({ ok: true });
}
