import { z } from 'zod';

// Response shape confirmed from a live sample (see CLAUDE.md). Session and
// jalur counts vary per event, so arrays are never length-constrained.

const sessionDetailSchema = z.object({
  label: z.string(),
  jkt48_member_name: z.string(),
  tickets_sold: z.coerce.number(),
  available_quota: z.coerce.number(),
});

const sessionSchema = z.object({
  label: z.string().nullable().optional(),
  date: z.string(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  session_detail: z.array(sessionDetailSchema),
});

// sales_period[] shape isn't load-bearing for this app — stored raw as jsonb
// and rendered as-is, so it's captured loosely rather than fully modeled.
const salesPeriodSchema = z.record(z.string(), z.unknown());

export const exclusiveDataSchema = z.object({
  exclusive_id: z.union([z.string(), z.number()]).transform(String),
  code: z.string(),
  title: z.string(),
  category: z.string().nullable().optional(),
  default_price: z.coerce.number().nullable().optional(),
  total_quota: z.coerce.number().nullable().optional(),
  max_purchase: z.coerce.number().nullable().optional(),
  sales_period: z.array(salesPeriodSchema).default([]),
  content_body: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  session: z.array(sessionSchema),
});

export const exclusiveResponseSchema = z.object({
  data: exclusiveDataSchema,
});

export type ExclusiveData = z.infer<typeof exclusiveDataSchema>;
export type ExclusiveSession = z.infer<typeof sessionSchema>;
export type ExclusiveSessionDetail = z.infer<typeof sessionDetailSchema>;
