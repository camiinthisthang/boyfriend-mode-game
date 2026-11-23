import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const name = clean(body.name, 24) || 'Guest';
  const text = clean(body.text, 200);
  if (!text) return res.status(400).json({ error: 'empty' });
  const [row] = await sql`INSERT INTO chat_messages (name, text) VALUES (${name}, ${text}) RETURNING id, pg_current_xact_id()::text AS txid`;
  res.status(200).json({ kind: 'committed', id: row.id, txid: row.txid });
}
