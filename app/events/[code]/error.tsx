"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center gap-3 px-4 py-10 sm:px-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Something went wrong loading this event.</p>
      <button
        onClick={reset}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Try again
      </button>
    </div>
  );
}
