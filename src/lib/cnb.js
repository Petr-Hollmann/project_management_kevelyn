const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const CNB_FUNCTION_URL = BASE_URL ? `${BASE_URL}/functions/v1/cnb-rates` : '';

/**
 * Fetch CNB exchange rate for a given currency and date via Supabase Edge Function.
 * Returns how many CZK = 1 unit of the given currency.
 * For CZK returns 1.
 */
export async function fetchCNBRate(currencyCode, dateStr) {
  if (!currencyCode || currencyCode === 'CZK') return 1;
  if (!CNB_FUNCTION_URL) throw new Error('VITE_SUPABASE_URL není nastavena');

  const params = new URLSearchParams({ currencies: currencyCode, date: dateStr });
  const res = await fetch(`${CNB_FUNCTION_URL}?${params}`);
  if (!res.ok) throw new Error(`CNB Edge Function vrátila ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const rate = data[currencyCode];
  if (!rate) throw new Error(`Kurz pro ${currencyCode} nebyl nalezen`);
  return rate;
}

/**
 * Fetch today's CNB rates for a list of currency codes.
 * Returns an object: { EUR: 25.34, USD: 23.12, ... }
 */
export async function fetchTodayCNBRates(currencyCodes) {
  if (!currencyCodes || currencyCodes.length === 0) return {};
  if (!CNB_FUNCTION_URL) return {};

  const today = new Date().toISOString().split('T')[0];
  const params = new URLSearchParams({ currencies: currencyCodes.join(','), date: today });
  try {
    const res = await fetch(`${CNB_FUNCTION_URL}?${params}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data.error) return {};
    return data;
  } catch {
    return {};
  }
}
