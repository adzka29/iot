import { NextResponse } from "next/server";

type TileParams = {
  z: string;
  x: string;
  y: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<TileParams> },
) {
  const { z, x, y } = await context.params;
  const tileY = y.replace(/\.png$/i, "");

  if (!/^\d{1,2}$/.test(z) || !/^\d{1,6}$/.test(x) || !/^\d{1,7}$/.test(tileY)) {
    return new NextResponse(null, { status: 400 });
  }

  const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${tileY}.png`, {
    headers: {
      Accept: "image/png",
      "User-Agent": "TrackforgeDashboard/1.0",
    },
  });

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
