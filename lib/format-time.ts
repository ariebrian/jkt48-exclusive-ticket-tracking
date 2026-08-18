// dd-mm-yy h:m:s, zero-padded, in the viewer's local timezone.
export function formatExactTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'unknown';

  const pad = (n: number) => String(n).padStart(2, '0');

  const day = pad(then.getDate());
  const month = pad(then.getMonth() + 1);
  const year = pad(then.getFullYear() % 100);
  const hours = pad(then.getHours());
  const minutes = pad(then.getMinutes());
  const seconds = pad(then.getSeconds());

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
