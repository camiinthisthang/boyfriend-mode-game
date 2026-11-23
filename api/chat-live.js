import { createRealtime, rawSql } from '@neon/realtime/server';

const latestMessages = rawSql('SELECT id, name, text, kind, created_at FROM chat_messages ORDER BY id DESC LIMIT 40');
let realtime = null;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    realtime ??= createRealtime({ secret: (process.env.NEON_REALTIME_SECRET || '').trim().replace(/^["']|["']$/g, ''), db: 'neondb' });
    res.status(200).json(await realtime.seal({ query: latestMessages }));
  } catch (e) {
    realtime = null;
    res.status(500).json({ error: 'seal failed', reason: e.message, hasSecret: Boolean(process.env.NEON_REALTIME_SECRET) });
  }
}
