"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventRow } from "@/lib/types/db";

export default function AdminClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), title: title.trim() }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Failed to add event");
      setSubmitting(false);
      return;
    }

    setEvents((prev) => [body.event, ...prev]);
    setCode("");
    setTitle("");
    setSubmitting(false);
  }

  async function handleToggleTracked(event: EventRow) {
    const nextTracked = !event.is_tracked;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, is_tracked: nextTracked } : e)));

    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, is_tracked: nextTracked }),
    });

    if (!res.ok) {
      // revert on failure
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, is_tracked: event.is_tracked } : e)));
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          Log out
        </button>
      </div>

      <form onSubmit={handleAddEvent} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add event</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Event code (e.g. EX273E)"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={submitting || !code.trim() || !title.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Tracked</th>
              <th className="px-4 py-2 font-medium">Last poll</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400 dark:text-zinc-500">
                  No events yet.
                </td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">{event.code}</td>
                <td className="px-4 py-2">{event.title}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleToggleTracked(event)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      event.is_tracked
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {event.is_tracked ? "On" : "Off"}
                  </button>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {event.last_polled_at ? new Date(event.last_polled_at).toLocaleString() : "never"}
                  {event.last_poll_status === "error" && (
                    <span className="ml-1 text-red-600 dark:text-red-400" title={event.last_poll_error ?? undefined}>
                      (error)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
