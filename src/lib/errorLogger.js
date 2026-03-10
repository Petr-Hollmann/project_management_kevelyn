import { supabase } from '@/lib/supabase-client';

// ── Click tracker ────────────────────────────────────────────────────────────
const MAX_CLICKS = 15;
const clickHistory = [];

function describeElement(el) {
  if (!el || el === document || el === window) return null;
  const tag = el.tagName?.toLowerCase() || '?';
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string'
    ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
    : '';
  const text = el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) || '';
  const href = el.href || el.closest?.('a')?.href || null;
  return { tag, id, cls, text, href };
}

export function initClickTracker() {
  document.addEventListener('click', (e) => {
    const entry = {
      ts: new Date().toISOString(),
      url: window.location.pathname + window.location.search,
      el: describeElement(e.target),
      parent: describeElement(e.target?.parentElement),
    };
    clickHistory.push(entry);
    if (clickHistory.length > MAX_CLICKS) clickHistory.shift();
  }, { capture: true, passive: true });
}

export function getLastClicks() {
  return [...clickHistory];
}

// ── Error logger ─────────────────────────────────────────────────────────────
export async function logError(error, {
  componentStack = null,
  errorType = 'boundary',
  extra = null,
} = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('app_error_log').insert([{
      error_message: error?.message || String(error),
      error_stack: error?.stack || null,
      component_stack: componentStack,
      error_type: errorType,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      user_id: user?.id || null,
      user_email: user?.email || null,
      last_clicks: getLastClicks(),
      extra: extra ?? null,
    }]);
  } catch (logErr) {
    // Never let the logger throw — just silently fail
    console.error('[errorLogger] Failed to log error:', logErr);
  }
}

// ── Global handlers ───────────────────────────────────────────────────────────
export function initGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason ?? 'Unhandled promise rejection'));
    logError(err, { errorType: 'unhandled_rejection' });
  });

  window.addEventListener('error', (event) => {
    // Ignore ResizeObserver loop errors — benign browser noise
    if (event.message?.includes('ResizeObserver')) return;
    const err = event.error instanceof Error
      ? event.error
      : new Error(event.message || 'Unknown window error');
    logError(err, {
      errorType: 'window_error',
      extra: { source: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });
}
