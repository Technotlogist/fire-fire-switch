import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // fast and cheap

function toNumber(input: any, fallback = 0) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const system = `Extract the user's FIRE inputs and return ONLY valid JSON:
{
  "age": number, "currentSavings": number, "monthlyContribution": number,
  "expectedReturn": number, "inflation": number, "targetNestEgg": number,
  "retirementAge": number
}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Text: """${text}"""` },
      ],
    }),
  });

  if (!r.ok) {
    return NextResponse.json({ error: await r.text() }, { status: 502 });
  }

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  // parse whatever the model gave us and coerce to numbers safely
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch {}

  const safe = {
    age: toNumber(parsed.age),
    currentSavings: toNumber(parsed.currentSavings),
    monthlyContribution: toNumber(parsed.monthlyContribution),
    expectedReturn: toNumber(parsed.expectedReturn),
    inflation: toNumber(parsed.inflation),
    targetNestEgg: toNumber(parsed.targetNestEgg),
    retirementAge: toNumber(parsed.retirementAge),
  };

  // basic sanity checks
  if (Object.values(safe).some(v => typeof v !== "number" || Number.isNaN(v))) {
    return NextResponse.json({ error: "Could not parse numbers from text." }, { status: 400 });
  }

  return NextResponse.json(safe);
}
