"use client";

import { useMemo, useState } from "react";
import type { LiveSession, LiveSessionLane } from "@/lib/db/snapshots";
// Member photos disabled for now — fetched per-request from jkt48.com.
// Re-enable once photos are hosted locally: uncomment this import and the
// <MemberAvatar /> usage in LaneCard below.
// import MemberAvatar from "./MemberAvatar";

function groupSessionsByDate(sessions: LiveSession[]): [string, LiveSession[]][] {
  const map = new Map<string, LiveSession[]>();
  for (const session of sessions) {
    const list = map.get(session.sessionDate) ?? [];
    list.push(session);
    map.set(session.sessionDate, list);
  }
  return Array.from(map.entries());
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SessionsView({ sessions }: { sessions: LiveSession[] }) {
  const [selectedDate, setSelectedDate] = useState("all");
  const [search, setSearch] = useState("");

  const availableDates = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.sessionDate))).sort(),
    [sessions],
  );

  const query = search.trim().toLowerCase();

  const groupedByDate = useMemo(() => {
    const dateFiltered = selectedDate === "all" ? sessions : sessions.filter((s) => s.sessionDate === selectedDate);

    const searchFiltered = query
      ? dateFiltered
          .map((session) => ({
            ...session,
            lanes: session.lanes.filter((lane) => lane.memberName.toLowerCase().includes(query)),
          }))
          .filter((session) => session.lanes.length > 0)
      : dateFiltered;

    return groupSessionsByDate(searchFiltered);
  }, [sessions, selectedDate, query]);

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        No quota data yet — this event hasn&apos;t been polled. It should populate after the next scheduled fetch.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500"
        >
          <option value="all">All dates</option>
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member name…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
        />
      </div>

      {groupedByDate.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No members match your search.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {groupedByDate.map(([date, dateSessions]) => (
            <div key={date} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatDate(date)}</h2>
              <div className="flex flex-col gap-6">
                {dateSessions.map((session) => (
                  <SessionTable key={session.id} session={session} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionTable({ session }: { session: LiveSession }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{session.label ?? "Session"}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {session.startTime && session.startTime.slice(0, 5)}
          {session.endTime && `–${session.endTime.slice(0, 5)}`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
        {session.lanes.map((lane) => (
          <LaneCard key={lane.id} lane={lane} />
        ))}
      </div>
    </div>
  );
}

const NEAR_SOLD_OUT_THRESHOLD = 10;

function LaneCard({ lane }: { lane: LiveSessionLane }) {
  const hasData = lane.availableQuota !== null && lane.ticketsSold !== null;

  const isSoldOut = hasData && lane.availableQuota === 0;
  const isNearSoldOut = hasData && !isSoldOut && (lane.availableQuota ?? 0) <= NEAR_SOLD_OUT_THRESHOLD;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {/* <MemberAvatar memberName={lane.memberName} /> */}
      <p className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50">{lane.memberName}</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{lane.label}</p>
      {hasData && <p className="text-xs text-zinc-900 dark:text-white">{lane.ticketsSold} sold</p>}
      <div
        className={`w-full rounded-md px-2 py-1.5 text-xs font-medium ${
          isSoldOut
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            : isNearSoldOut
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
        }`}
      >
        {hasData ? (isSoldOut ? "Sold out" : `${lane.availableQuota} left`) : "—"}
      </div>
    </div>
  );
}
