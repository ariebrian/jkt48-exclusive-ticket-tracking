import 'server-only';
import { fetchExclusive } from './jkt48-api';
import { listActiveEvents, applySuccessfulPoll, recordFailedPoll } from './db/events';
import { upsertSessionsAndLanes } from './db/sessions';
import { writeSnapshotBatch } from './db/snapshots';
import type { EventRow } from './types/db';

const SNAPSHOT_DELAY_MS = Number(process.env.SNAPSHOT_DELAY_MS) || 750;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 3000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SnapshotRunResult {
  ok: boolean;
  error?: string;
}

// Fetches one event with retry/backoff, then writes its sessions/lanes and
// a snapshot row per lane. Failure here never throws — it's recorded on the
// event row and reported in the run summary so one bad event doesn't abort
// the whole cron run.
export async function runSnapshotForEvent(event: EventRow): Promise<SnapshotRunResult> {
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await fetchExclusive(event.code);

    if (result.ok) {
      try {
        const snapshotAt = new Date();
        const resolvedLanes = await upsertSessionsAndLanes(event.id, result.data.session);
        await writeSnapshotBatch(resolvedLanes, snapshotAt);
        await applySuccessfulPoll(event.id, result.data);
        return { ok: true };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        break; // storage failure isn't retryable by re-fetching
      }
    }

    lastError = `${result.error}: ${result.detail}`;
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BACKOFF_MS[attempt]);
    }
  }

  await recordFailedPoll(event.id, lastError);
  return { ok: false, error: lastError };
}

export interface SnapshotJobSummary {
  total: number;
  succeeded: number;
  failed: number;
  errors: { code: string; error: string }[];
}

// Polls all tracked events sequentially with a delay between each — never
// in parallel — to stay friendly to an API with no published rate limits.
export async function runSnapshotJob(): Promise<SnapshotJobSummary> {
  const events = await listActiveEvents();
  const summary: SnapshotJobSummary = { total: events.length, succeeded: 0, failed: 0, errors: [] };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const result = await runSnapshotForEvent(event);

    if (result.ok) {
      summary.succeeded++;
    } else {
      summary.failed++;
      summary.errors.push({ code: event.code, error: result.error ?? 'unknown error' });
    }

    if (i < events.length - 1) {
      await sleep(SNAPSHOT_DELAY_MS);
    }
  }

  return summary;
}
