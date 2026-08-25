import { configUrl } from "../../lib/gallery";

// The image host is append-only: once a filename exists, re-uploading it is
// ignored. So the admin writes the gallery config as an incrementing version
// file (…-v1.json, …-v2.json, …). Here we discover the highest version that
// exists and return its contents. Reads run server-side to dodge CORS and CDN
// caching so edits show up right after publishing.

const bust = () => `?t=${Date.now()}`;

async function exists(version: number): Promise<boolean> {
  try {
    const head = await fetch(configUrl(version) + bust(), {
      method: "HEAD",
      cache: "no-store",
    });
    // Some hosts don't implement HEAD; fall back to a GET status check.
    if (head.status === 405 || head.status === 501) {
      const get = await fetch(configUrl(version) + bust(), { cache: "no-store" });
      return get.ok;
    }
    return head.ok;
  } catch {
    return false;
  }
}

// Exponential probe then binary search for the highest existing version.
// Versions are contiguous (each publish increments by one), so the boundary is
// well defined. Returns 0 when nothing has been published yet.
async function latestVersion(): Promise<number> {
  if (!(await exists(1))) return 0;
  let lo = 1;
  let hi = 2;
  while (await exists(hi)) {
    lo = hi;
    hi *= 2;
  }
  // Invariant: version `lo` exists, version `hi` does not.
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (await exists(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export async function GET(): Promise<Response> {
  try {
    const version = await latestVersion();
    if (version > 0) {
      const res = await fetch(configUrl(version) + bust(), { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { slides?: unknown };
        if (data && typeof data === "object" && Array.isArray(data.slides)) {
          return json({ ...data, latestVersion: version });
        }
      }
    }
  } catch {
    // fall through to the empty default
  }
  return json({ version: 1, slides: [], latestVersion: 0 });
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
