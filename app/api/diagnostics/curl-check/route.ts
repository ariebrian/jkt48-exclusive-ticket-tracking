import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetchExclusive } from '@/lib/jkt48-api';

const execFileAsync = promisify(execFile);

// One-off canary route to empirically verify, in the actual deployed
// runtime (e.g. Vercel Node serverless), the two risks called out in
// lib/jkt48-api.ts:
//   1. Is a `curl` binary present on PATH at all?
//   2. If present, does a real fetchExclusive() call still succeed, or
//      does Cloudflare 403 it anyway (e.g. due to IP/ASN reputation)?
// Not meant to stay in the app long-term — delete once the runtime is
// verified, or keep behind CRON_SECRET if kept as an ongoing health check.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let curlVersion: { ok: boolean; detail: string };
  try {
    const result = await execFileAsync('curl', ['--version'], { timeout: 5000 });
    curlVersion = { ok: true, detail: result.stdout.split('\n')[0] };
  } catch (err) {
    curlVersion = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  const testCode = process.env.JKT48_DIAGNOSTIC_CODE;
  let liveFetch: unknown = { skipped: 'set JKT48_DIAGNOSTIC_CODE to a known event code to test a real fetch' };
  if (testCode) {
    const result = await fetchExclusive(testCode);
    liveFetch = result.ok
      ? { ok: true, title: result.data.title }
      : { ok: false, error: result.error, detail: result.detail };
  }

  return NextResponse.json({ curlVersion, liveFetch });
}
