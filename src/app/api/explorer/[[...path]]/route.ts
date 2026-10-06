import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const base = (process.env.EXPLORER_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  if (!base) {
    return NextResponse.json({ error: "EXPLORER_API_BASE is not configured" }, { status: 503 });
  }

  const { path = [] } = await context.params;
  const suffix = path.map((part) => encodeURIComponent(part)).join("/");
  const target = `${base}/api/explorer${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { Accept: request.headers.get("accept") ?? "*/*" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Search service is unavailable" }, { status: 502 });
  }

  const headers = new Headers();
  const type = upstream.headers.get("content-type");
  const disposition = upstream.headers.get("content-disposition");
  if (type) headers.set("content-type", type);
  if (disposition) headers.set("content-disposition", disposition);
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
