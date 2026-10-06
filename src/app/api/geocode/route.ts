import { NextResponse } from "next/server";

type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  name?: string;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json([]);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "id");
  url.searchParams.set("viewbox", "106.65,-6.35,107.05,-6.05");

  const upstream = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TrackforgeDashboard/1.0",
    },
  });

  if (!upstream.ok) return NextResponse.json([], { status: 502 });

  const rows = (await upstream.json()) as NominatimHit[];
  return NextResponse.json(
    rows.map((row) => ({
      id: `geo-${row.place_id}`,
      title: row.name || row.display_name.split(",")[0],
      hint: `Location · ${row.display_name}`,
      position: [Number(row.lat), Number(row.lon)] as [number, number],
      target: "place" as const,
    })),
  );
}
