import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ODA_FPS_BASE_URL = "https://cloud.opendesign.com/examples/fps/";

function contentTypeFor(path: string) {
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".wasm")) return "application/wasm";
  if (path.endsWith(".data")) return "application/octet-stream";
  if (path.endsWith(".mem")) return "application/octet-stream";
  return "application/octet-stream";
}

export async function GET(_request: NextRequest, context: RouteContext<"/api/oda-fps/[...path]">) {
  const { path } = await context.params;
  const safePath = path.join("/");

  if (!safePath || safePath.includes("..")) {
    return NextResponse.json({ error: "Invalid ODA asset path." }, { status: 400 });
  }

  const upstreamUrl = new URL(safePath, ODA_FPS_BASE_URL);
  if (upstreamUrl.origin !== "https://cloud.opendesign.com" || !upstreamUrl.pathname.startsWith("/examples/fps/")) {
    return NextResponse.json({ error: "Invalid ODA asset path." }, { status: 400 });
  }

  const upstream = await fetch(upstreamUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Unable to load ODA trial asset: ${safePath}` },
      { status: upstream.status || 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? contentTypeFor(safePath),
      "cache-control": "no-store",
    },
  });
}
