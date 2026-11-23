import express from 'express';
import { neon } from '@neondatabase/serverless';
import chatLive from './api/chat-live.js';
import chatSend from './api/chat-send.js';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const app = express();
app.post('/api/chat-live', (req, res) => chatLive(req, res).catch((e) => res.status(500).json({ error: e.message })));
app.post('/api/chat-send', express.json(), (req, res) => chatSend(req, res).catch((e) => res.status(500).json({ error: e.message })));
app.use(express.static(path.join(__dirname, 'dist'), { maxAge: '1h', index: 'index.html', setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/health', (_req, res) => res.json({ ok: true, players: players.size }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });
const players = new Map();
let nextId = 1;
const MAX_PLAYERS = 150;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const cleanLook = (look) => {
  if (!look || typeof look !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(look).slice(0, 24)) {
    if (!/^[a-zA-Z]{1,16}$/.test(k)) continue;
    if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && v.length <= 24) out[k] = v;
  }
  return out;
};
const history = [];
const sqlDb = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const announce = (name, text) => { if (sqlDb) sqlDb`INSERT INTO chat_messages (name, text, kind) VALUES (${name}, ${text}, 'system')`.catch((e) => console.error('announce failed', e.message)); };
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const TICKET_FILE = path.join(DATA_DIR, 'tickets.json');
const EGG_TITLES = { 1: 'Stunt King', 2: 'Secret Island' };
let tickets;
try { tickets = JSON.parse(fs.readFileSync(TICKET_FILE, 'utf8')); } catch { tickets = {}; }
const saveTickets = () => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(TICKET_FILE, JSON.stringify(tickets, null, 1)); } catch (e) { console.error('ticket save failed', e.message); } };
const ticketStatus = () => Object.keys(EGG_TITLES).map((id) => ({ id: +id, claimedBy: tickets[id]?.name || null }));
const newCode = () => 'RM27-' + crypto.randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})/, '$1-');
const boards = { street: [], bay: [] };
const RACE_NAMES = { street: 'Brickell Street Race', bay: 'Biscayne Bay Jet Ski Run' };
const broadcast = (msg, except) => {
  const data = JSON.stringify(msg);
  for (const p of players.values()) if (p.ws !== except && p.ws.readyState === 1) p.ws.send(data);
};

wss.on('connection', (ws) => {
  if (players.size >= MAX_PLAYERS) { ws.close(1013, 'full'); return; }
  const id = nextId++;
  let me = null;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !me) {
      me = { id, ws, name: clean(m.name, 16) || `Dev${id}`, look: cleanLook(m.look), s: [-10, 0, -18, Math.PI, 0], lastChat: 0 };
      players.set(id, me);
      ws.send(JSON.stringify({ t: 'welcome', id, history, boards, tickets: ticketStatus(), players: [...players.values()].filter((p) => p.id !== id).map((p) => ({ id: p.id, name: p.name, look: p.look, s: p.s })) }));
      broadcast({ t: 'joined', id, name: me.name, look: me.look, s: me.s }, ws);
      return;
    }
    if (!me) return;
    if (m.t === 's' && Array.isArray(m.s) && (m.s.length === 5 || m.s.length === 6) && m.s.every((n) => Number.isFinite(n))) {
      me.s = m.s.map((n, i) => (i === 4 ? Math.max(0, Math.min(9, Math.round(n))) : i === 5 ? Math.max(0, Math.min(99, Math.round(n))) : Math.round(n * 100) / 100));
    } else if (m.t === 'chat') {
      const now = Date.now();
      const text = clean(m.text, 140);
      if (!text || now - me.lastChat < 700) return;
      me.lastChat = now;
      const msg = { t: 'chat', id, name: me.name, text, at: now };
      history.push(msg); if (history.length > 40) history.shift();
      broadcast(msg);
    } else if (m.t === 'score' && boards[m.race] && Number.isFinite(m.ms) && m.ms > 5000 && m.ms < 900000) {
      const b = boards[m.race], ms = Math.round(m.ms);
      const prev = b.find((e) => e[0] === me.name);
      if (prev && prev[1] <= ms) return;
      if (prev) prev[1] = ms; else b.push([me.name, ms]);
      b.sort((x, y) => x[1] - y[1]);
      b.length = Math.min(b.length, 10);
      const record = b[0][0] === me.name && b[0][1] === ms;
      broadcast({ t: 'board', boards });
      const msg = { t: 'chat', id: 0, name: 'RACE', text: `${me.name} finished the ${RACE_NAMES[m.race]} in ${(ms / 1000).toFixed(2)}s${record ? ' - new record!' : ''}`, at: Date.now() };
      history.push(msg); if (history.length > 40) history.shift();
      broadcast(msg);
      announce(msg.name, msg.text);
    } else if (m.t === 'egg' && EGG_TITLES[m.id]) {
      const tid = String(m.id);
      if (tickets[tid]) { ws.send(JSON.stringify({ t: 'ticketTaken', id: +tid, by: tickets[tid].name })); return; }
      const code = newCode();
      tickets[tid] = { name: me.name, code, at: new Date().toISOString() };
      saveTickets();
      console.log(`TICKET CLAIMED #${tid} ${EGG_TITLES[tid]} by ${me.name} code ${code}`);
      ws.send(JSON.stringify({ t: 'ticket', id: +tid, title: EGG_TITLES[tid], name: me.name, code }));
      const left = Object.keys(EGG_TITLES).filter((k) => !tickets[k]).length;
      const msg = { t: 'chat', id: 0, name: 'GOLDEN TICKET', text: `${me.name} found Golden Ticket #${tid} (${EGG_TITLES[tid]}) - a free ticket to React Miami 2027! ${left} of ${Object.keys(EGG_TITLES).length} left.`, at: Date.now() };
      history.push(msg); if (history.length > 40) history.shift();
      broadcast(msg);
      announce(msg.name, msg.text);
      broadcast({ t: 'tickets', tickets: ticketStatus() });
    } else if (m.t === 'look') {
      me.look = cleanLook(m.look);
      me.name = clean(m.name, 16) || me.name;
      broadcast({ t: 'look', id, name: me.name, look: me.look }, ws);
    }
  });
  ws.on('close', () => {
    if (players.delete(id)) broadcast({ t: 'left', id });
  });
});

setInterval(() => {
  if (!players.size) return;
  broadcast({ t: 'snap', p: [...players.values()].map((p) => [p.id, ...p.s]) });
}, 100);

server.listen(PORT, () => console.log(`React Miami game on :${PORT}`));
