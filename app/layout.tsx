import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./ThemeToggle";
import EventPicker from "./EventPicker";
import { listAllEvents } from "@/lib/db/events";
import { getMinSessionDate } from "@/lib/db/sessions";
import { getCategoryLabel } from "@/lib/category-labels";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JKT48 Exclusive Quota Tracker",
  description: "Live ticket quota tracking for JKT48 exclusive events",
};

// Defaults to dark unless the visitor previously chose light — runs
// synchronously before paint so there's no flash of the wrong theme.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const events = await listAllEvents();
  const eventOptionsUnsorted = await Promise.all(
    events.map(async (event) => {
      const minDate = await getMinSessionDate(event.id);
      const categoryLabel = getCategoryLabel(event.category);
      const monthYear = minDate
        ? new Date(`${minDate}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : null;
      return {
        code: event.code,
        label: monthYear ? `${categoryLabel} - ${monthYear}` : categoryLabel,
        sortDate: minDate ?? "9999-99-99", // events with no session data yet sort last
      };
    }),
  );
  const eventOptions = eventOptionsUnsorted
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.label.localeCompare(b.label))
    .map(({ code, label }) => ({ code, label }));

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="shrink-0 font-semibold">
              JKT48 Exclusive Tracker
            </Link>
            <div className="flex items-center gap-3">
              <EventPicker events={eventOptions} />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
