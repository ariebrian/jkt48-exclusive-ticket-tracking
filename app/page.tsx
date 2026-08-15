import Link from "next/link";
import { listAllEvents } from "@/lib/db/events";
import { getMaxSessionDate } from "@/lib/db/sessions";
import { getEventQuotaSummary, type EventQuotaSummary } from "@/lib/db/snapshots";
import type { EventRow } from "@/lib/types/db";

interface EnrichedEvent {
  event: EventRow;
  maxSessionDate: string | null;
  quota: EventQuotaSummary;
}

export default async function HomePage() {
  const events = await listAllEvents();

  const enriched: EnrichedEvent[] = await Promise.all(
    events.map(async (event) => {
      const [maxSessionDate, quota] = await Promise.all([
        getMaxSessionDate(event.id),
        getEventQuotaSummary(event.id),
      ]);
      return { event, maxSessionDate, quota };
    }),
  );

  const today = new Date().toISOString().slice(0, 10);
  // Events with no sessions yet (just added, not polled) are treated as
  // active — "past" only once we have a date to prove it's over.
  const active = enriched.filter((e) => !e.maxSessionDate || e.maxSessionDate >= today);
  const past = enriched.filter((e) => e.maxSessionDate && e.maxSessionDate < today);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      {events.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">No events tracked yet.</p>
      ) : (
        <div className="flex flex-col gap-10">
          <EventSection title="Active" items={active} emptyText="No active events." />
          <EventSection title="Past" items={past} emptyText="No past events." />
        </div>
      )}
    </div>
  );
}

function EventSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: EnrichedEvent[];
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <EventCard key={item.event.id} {...item} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({ event, quota }: EnrichedEvent) {
  return (
    <Link
      href={`/events/${event.code}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{event.title}</h3>
        {quota.hasAnyQuotaData && quota.isSoldOut && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
            Sold out
          </span>
        )}
      </div>
      <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{event.code}</p>
      {quota.hasAnyQuotaData ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {quota.isSoldOut ? "0 remaining" : `${quota.totalAvailable.toLocaleString()} remaining`}
        </p>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Quota not available yet</p>
      )}
    </Link>
  );
}
