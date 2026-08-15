export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-7 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
