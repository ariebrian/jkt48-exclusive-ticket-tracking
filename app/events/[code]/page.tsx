import { notFound } from "next/navigation";
import { getEventByCode } from "@/lib/db/events";
import { getLatestSnapshotsForEvent } from "@/lib/db/snapshots";
import { sanitizeHtml } from "@/lib/sanitize";
import SessionsView from "./SessionsView";

export default async function EventDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const event = await getEventByCode(code);
  if (!event) notFound();

  const sessions = await getLatestSnapshotsForEvent(event.id);

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
