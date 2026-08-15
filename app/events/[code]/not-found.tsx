import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center gap-3 px-4 py-10 sm:px-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No event found with that code.</p>
      <Link href="/" className="text-sm underline">
        Back to all events
      </Link>
    </div>
  );
}
