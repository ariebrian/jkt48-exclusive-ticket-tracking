import { listAllEvents } from "@/lib/db/events";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const events = await listAllEvents();
  return <AdminClient initialEvents={events} />;
}
