import { createRealtimeClient } from '@neon/realtime/client';
import { NEON_REALTIME_URL } from './neonConfig.js';

// Global chat on Neon Realtime: rows in chat_messages, delivered live to every browser.
export function startNeonChat({ onMessages, onStatus }) {
  const client = createRealtimeClient({ url: NEON_REALTIME_URL });
  const fetchSealed = async () => {
    const r = await fetch('/api/chat-live', { method: 'POST' });
    if (!r.ok) throw new Error('seal ' + r.status);
    return r.json();
  };
  const seen = new Set();
  let sub = null, timer = null, first = true;
  const renewLater = (expiresAt) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { const next = await fetchSealed(); sub.renew(next); renewLater(next.expiresAt); }
      catch { renewLater(Date.now() + 11000); }
    }, Math.max(0, expiresAt - Date.now() - 10000));
  };
  fetchSealed().then((sealed) => {
    sub = client.subscribe(sealed);
    sub.onChange((snap) => {
      onStatus?.(snap.status);
      if (!snap.data) return;
      const rows = [...snap.data].sort((a, b) => Number(a.id) - Number(b.id));
      const fresh = rows.filter((r) => !seen.has(String(r.id)));
      fresh.forEach((r) => seen.add(String(r.id)));
      if (fresh.length) onMessages(fresh, first);
      first = false;
    });
    renewLater(sealed.expiresAt);
  }).catch(() => onStatus?.('error'));
  return {
    send: (name, text) => fetch('/api/chat-send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, text }) }).then((r) => r.ok),
  };
}
