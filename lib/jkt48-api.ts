import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exclusiveResponseSchema, type ExclusiveData } from './types/jkt48';

const execFileAsync = promisify(execFile);

const DEFAULT_BASE = 'https://jkt48.com/api/v1/exclusives';

// jkt48.com sits behind Cloudflare bot management that fingerprints at the
// TLS/HTTP-client level, not just the User-Agent header. Confirmed by
// experiment: curl with a browser User-Agent consistently gets 200s; Node's
// native fetch (undici) gets 403'd even with identical headers and tuned
// TLS cipher/version options. Shelling out to curl is the pragmatic fix
// since curl's fingerprint is the one Cloudflare accepts.
//
// RISK: this assumes a `curl` binary is present on PATH in the deployment
// runtime. It's present in local dev; verify it's present on Vercel's Node
// serverless runtime before relying on this in production (deploy this
// route and hit it once) — if it's ever missing there, the exec call fails
// closed with error: 'exec_failed' rather than silently returning bad data.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CURL_TIMEOUT_MS = 15_000;
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;
// execFile disallows NUL bytes in args, so use a marker string unlikely to
// appear in a JSON response body to split it from curl's appended status code.
const STATUS_MARKER = '\n__CURL_HTTP_STATUS__';

export type ExclusiveApiResult =
  | { ok: true; data: ExclusiveData }
  | { ok: false; error: 'network' | 'http_status' | 'exec_failed' | 'parse'; detail: string };

// Fetch + validate. No Supabase import — independently testable against
// fixture JSON, per CLAUDE.md's requirement to separate the raw-fetch layer
// from storage.
export async function fetchExclusive(code: string, lang = 'id'): Promise<ExclusiveApiResult> {
  const base = process.env.JKT48_API_BASE || DEFAULT_BASE;
  const url = `${base}/${encodeURIComponent(code)}?lang=${encodeURIComponent(lang)}`;

  let stdout: string;
  let httpStatus: number;
  try {
    // -sS: silent but show errors; -w appends the HTTP status code after a
    // NUL separator so it can be split from the body reliably.
    const result = await execFileAsync(
      'curl',
      [
        '-sS',
        '-A',
        BROWSER_USER_AGENT,
        '-H',
        'Accept: application/json',
        '--max-time',
        String(CURL_TIMEOUT_MS / 1000),
        '-w',
        `${STATUS_MARKER}%{http_code}`,
        url,
      ],
      { timeout: CURL_TIMEOUT_MS + 2000, maxBuffer: MAX_BUFFER_BYTES },
    );
    const separatorIndex = result.stdout.lastIndexOf(STATUS_MARKER);
    if (separatorIndex === -1) {
      return { ok: false, error: 'exec_failed', detail: 'curl output missing status marker' };
    }
    stdout = result.stdout.slice(0, separatorIndex);
    httpStatus = Number(result.stdout.slice(separatorIndex + STATUS_MARKER.length));
  } catch (err) {
    return { ok: false, error: 'exec_failed', detail: err instanceof Error ? err.message : String(err) };
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    return { ok: false, error: 'http_status', detail: `HTTP ${httpStatus}` };
  }

  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    return { ok: false, error: 'parse', detail: 'Response was not valid JSON' };
  }

  const parsed = exclusiveResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'parse', detail: parsed.error.message };
  }

  return { ok: true, data: parsed.data.data };
}
