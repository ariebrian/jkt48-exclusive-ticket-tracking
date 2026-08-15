export interface EventRow {
  id: string;
  code: string;
  exclusive_id: string | null;
  title: string;
  category: string | null;
  default_price: number | null;
  total_quota: number | null;
  max_purchase: number | null;
  sales_period: unknown;
  content_body: string | null;
  short_description: string | null;
  is_tracked: boolean;
  last_polled_at: string | null;
  last_poll_status: 'ok' | 'error' | null;
  last_poll_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSessionRow {
  id: string;
  event_id: string;
  label: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
}

export interface SessionLaneRow {
  id: string;
  session_id: string;
  label: string;
  member_name: string;
}

export interface LatestQuotaRow {
  session_lane_id: string;
  tickets_sold: number;
  available_quota: number;
  snapshot_at: string;
}
