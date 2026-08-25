import { IMAGE_HOST } from "../../lib/gallery";

const ALLOWED_HOST = new URL(IMAGE_HOST).hostname;

// Same-origin passthrough for image-host media. WebGL cannot sample a
// cross-origin image/video into a canvas without tainting it, so the renderer
// loads media through here. The host is allowlisted to avoid an open proxy.
export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("u");
  if (!target) return new Response("Missing u", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
    return new Response("Forbidden host", { status: 403 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, { status: 200, headers });
}
