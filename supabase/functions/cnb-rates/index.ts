const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Fetch CNB rate for a given date (tries up to 7 days back for weekends/holidays).
 * Returns map: { EUR: 25.34, USD: 23.12, ... }
 */
async function fetchRatesForDate(
  currencies: string[],
  dateStr: string
): Promise<Record<string, number> | null> {
  const url = `https://api.cnb.cz/cnbapi/exrates/daily?date=${dateStr}&lang=EN`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rates = data.rates as Array<{ currencyCode: string; rate: number; amount: number }>;
    if (!rates || rates.length === 0) return null;

    const result: Record<string, number> = {};
    for (const code of currencies) {
      const entry = rates.find((r) => r.currencyCode === code);
      if (entry) result[code] = entry.rate / entry.amount;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  // ?currencies=EUR,USD&date=2026-03-05
  const currenciesParam = url.searchParams.get("currencies") || "EUR,USD";
  const dateParam = url.searchParams.get("date");

  const currencies = currenciesParam.split(",").map((c) => c.trim()).filter(Boolean);

  // Default to today if no date provided
  const baseDate = dateParam
    ? new Date(dateParam + "T00:00:00")
    : new Date();

  // Try up to 7 days back (handles weekends + holidays)
  let result: Record<string, number> | null = null;
  for (let daysBack = 0; daysBack < 7; daysBack++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysBack);
    const ds = d.toISOString().split("T")[0];
    result = await fetchRatesForDate(currencies, ds);
    if (result && Object.keys(result).length > 0) break;
  }

  if (!result) {
    return new Response(
      JSON.stringify({ error: "Kurzy CNB nejsou dostupné" }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(result), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
