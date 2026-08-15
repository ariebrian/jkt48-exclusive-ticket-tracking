import 'server-only';
import type { EventRow } from './types/db';

const STALE_THRESHOLD_MS = Number(process.env.STALE_THRESHOLD_MS) || 60_000;

interface SalesPeriodEntry {
  end_date?: string | null;
}

// Returns the latest end_date across all sales periods, but only if every
// period has a valid, parseable end_date. Anything uncertain (empty array,
// malformed entry, missing/unparseable end_date) returns null — meaning
// "treat as still active" — since silently stopping refreshes on bad data
// would be worse than an occasional unnecessary fetch.
export function getSalesPeriodEndDate(salesPeriod: unknown): Date | null {
  if (!Array.isArray(salesPeriod) || salesPeriod.length === 0) return null;

  const endDates: Date[] = [];
  for (const entry of salesPeriod as SalesPeriodEntry[]) {
    if (!entry || typeof entry !== 'object' || !entry.end_date) return null;
    const parsed = new Date(entry.end_date);
    if (Number.isNaN(parsed.getTime())) return null;
    endDates.push(parsed);
  }

  return endDates.reduce((max, d) => (d > max ? d : max), endDates[0]);
}

// Gate for the visit-triggered refresh: skip if tracking is off, skip once
// sales have confirmably ended, otherwise refresh if never polled or the
// last snapshot is older than the staleness threshold.
export function shouldRefreshOnVisit(event: EventRow, now: Date = new Date()): boolean {
  if (!event.is_tracked) return false;

  const salesEndDate = getSalesPeriodEndDate(event.sales_period);
  if (salesEndDate && now > salesEndDate) return false;

  if (!event.last_polled_at) return true;

  const staleMs = now.getTime() - new Date(event.last_polled_at).getTime();
  return staleMs > STALE_THRESHOLD_MS;
}
