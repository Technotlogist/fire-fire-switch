import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// --- Choose your mailer: RESEND (simplest) ---
async function sendWithResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "FIRE Calculator <no-reply@yourdomain.com>", // if you verified a domain in Resend, use it here
      to,
      subject,
      html
    })
  });

  if (!r.ok) {
    const msg = await r.text();
    throw new Error(`Resend error: ${msg}`);
  }
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);
}

export async function POST(req: NextRequest) {
  const { email, inputs, results } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
  }
  if (!results?.projections?.length) {
    return NextResponse.json({ error: "Missing projections/results" }, { status: 400 });
  }

  const {
    age, currentSavings, monthlyContribution, expectedReturn, inflation, targetNestEgg, retirementAge
  } = inputs ?? {};

  // build a simple HTML email
  const first = results.projections[0];
  const last = results.projections[results.projections.length - 1];

  const rows = results.projections.slice(0, 12).map((p: any) => `
    <tr>
      <td style="padding:6px;border:1px solid #eee;">${p.age}</td>
      <td style="padding:6px;border:1px solid #eee;">${fmtCurrency(p.balance_nominal)}</td>
      <td style="padding:6px;border:1px solid #eee;">${fmtCurrency(p.balance_real)}</td>
    </tr>
  `).join("");

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 8px">Your FIRE Plan</h2>
    <p style="margin:0 0 16px">Here’s a quick snapshot based on what you shared.</p>

    <h3 style="margin:16px 0 6px">Inputs</h3>
    <ul style="margin:0 0 16px;padding-left:18px">
      <li>Age: <b>${age}</b></li>
      <li>Current savings: <b>${fmtCurrency(currentSavings)}</b></li>
      <li>Monthly contribution: <b>${fmtCurrency(monthlyContribution)}</b></li>
      <li>Expected return: <b>${(expectedReturn*100).toFixed(1)}%</b></li>
      <li>Inflation: <b>${(inflation*100).toFixed(1)}%</b></li>
      <li>Target nest egg: <b>${fmtCurrency(targetNestEgg)}</b></li>
      <li>Retirement age: <b>${retirementAge}</b></li>
    </ul>

    <h3 style="margin:16px 0 6px">Outcome</h3>
    <p style="margin:0 0 8px">
      ${results.reached
        ? `🎯 You reach your target in about <b>${results.years_to_target}</b> year(s).`
        : `📈 You do not reach the target by age ${retirementAge}. Consider increasing contributions or return assumption.`}
    </p>

    <h3 style="margin:16px 0 6px">Projection (first 12 years)</h3>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee;margin:8px 0;">
      <thead>
        <tr>
          <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Age</th>
          <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Balance (Nominal)</th>
          <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Balance (Real)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="font-size:12px;color:#555;margin-top:16px">
      Nominal balances include growth and contributions; “real” balances are inflation-adjusted.
    </p>
  </div>
  `;

  try {
    await sendWithResend(email, "Your FIRE Plan", html);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to send" }, { status: 500 });
  }
}
