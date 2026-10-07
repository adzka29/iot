import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, path: string[]) {
  const base = (process.env.EXPLORER_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const suffix = path.map((part) => encodeURIComponent(part)).join("/");
  const target = `${base}/api/operations${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`;
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const session = request.headers.get("x-session-id");
  if (accept) headers.set("accept", accept);
  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);
  if (session) headers.set("x-session-id", session);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Operations service is unavailable" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const type = upstream.headers.get("content-type");
  if (type) responseHeaders.set("content-type", type);
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}
