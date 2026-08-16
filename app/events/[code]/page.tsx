import { notFound } from "next/navigation";
import { getEventByCode } from "@/lib/db/events";
import { getLatestSnapshotsForEvent, getLatestSnapshotTimestamp } from "@/lib/db/snapshots";
import { formatRelativeTime } from "@/lib/format-time";
import { sanitizeHtml } from "@/lib/sanitize";
import { shouldRefreshOnVisit } from "@/lib/refresh-policy";
import { runSnapshotForEvent } from "@/lib/snapshot-job";
import SessionsView from "./SessionsView";

// Ensure this page always renders dynamically on every visit rather than
// being statically prerendered/cached — the whole point of this route is
// to conditionally re-fetch live quota and reflect the latest Supabase state.
export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const event = await getEventByCode(code);
  if (!event) notFound();

  // Best-effort: never throws, failures are recorded on the event row and
  // this visit just renders whatever's already in Supabase.
  const refreshResult = shouldRefreshOnVisit(event) ? await runSnapshotForEvent(event, { maxRetries: 0 }) : null;

  const sessions = await getLatestSnapshotsForEvent(event.id);
  // Single timestamp for the whole page: relies on writeSnapshotBatch always
  // writing a whole batch with one shared snapshot_at (see lib/snapshot-job.ts).
  // If a future refactor writes lanes with independent timestamps, this
  // page-level "last updated" would need to move per-lane instead.
  const lastUpdatedAt = getLatestSnapshotTimestamp(sessions);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{event.code}</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {event.category && <span>{event.category}</span>}
          {event.default_price != null && <span>Rp{event.default_price.toLocaleString()}</span>}
          {event.max_purchase != null && <span>Max {event.max_purchase} tickets/order</span>}
        </div>
        <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          {lastUpdatedAt ? (
            <span title={new Date(lastUpdatedAt).toLocaleString()}>
              Last updated {formatRelativeTime(lastUpdatedAt)}
            </span>
          ) : (
            <span>No data yet</span>
          )}
          {refreshResult?.ok === false && (
            <span className="ml-2 text-amber-600 dark:text-amber-500">
              showing last known data — refresh temporarily unavailable
            </span>
          )}
        </div>
        {event.short_description && (
          <p
            className="mt-3 text-sm text-zinc-600 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.short_description) }}
          />
        )}
        {event.content_body && (
          <div
            className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.content_body) }}
          />
        )}
      </div>

      <SessionsView sessions={sessions} />
    </div>
  );
}
