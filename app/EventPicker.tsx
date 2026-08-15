"use client";

import { useRouter, usePathname } from "next/navigation";

interface EventOption {
  code: string;
  label: string;
}

export default function EventPicker({ events }: { events: EventOption[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const match = pathname.match(/^\/events\/([^/]+)/);
  const currentCode = match ? match[1] : "";

  if (events.length === 0) return null;

  return (
    <select
      value={currentCode}
      onChange={(e) => {
        if (e.target.value) router.push(`/events/${e.target.value}`);
      }}
      className="max-w-[10rem] rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-500"
    >
      <option value="">Choose event…</option>
      {events.map((event) => (
        <option key={event.code} value={event.code}>
          {event.label}
        </option>
      ))}
    </select>
  );
}
