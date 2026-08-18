// dd-mm-yy h:m:s, zero-padded, always in Asia/Jakarta (WIB) — fixed
// regardless of the server's local timezone, so local dev (typically WIB)
// and Vercel prod (defaults to UTC) render the same wall-clock time for the
// same underlying timestamp.
export function formatExactTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'unknown';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(then);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}
