import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  const origin = req.nextUrl.origin; // works in Preview and Production

  // 1) NLP: turn free text into structured numbers
  const nlpRes = await fetch(`${origin}/api/nlp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!nlpRes.ok) {
    return NextResponse.json({ error: await nlpRes.text() }, { status: 400 });
  }
  const parsed = await nlpRes.json();

  // 2) Math: compute projections deterministically (Python)
  const mathRes = await fetch(`${origin}/api/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  if (!mathRes.ok) {
    return NextResponse.json({ error: await mathRes.text() }, { status: 502 });
  }
  const results = await mathRes.json();

  // 3) return merged payload
  return NextResponse.json({ inputs: parsed, results });
}
