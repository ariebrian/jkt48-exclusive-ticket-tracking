export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
