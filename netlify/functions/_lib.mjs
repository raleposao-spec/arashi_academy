// Shared helpers for the Arashi Academy backend (Netlify Functions + Blobs).
import { getStore } from '@netlify/blobs';

export const RANK_OF_TIER = { chunin: 1, jonin: 2, sennin: 3 };
export const MEMBERSHIP_DAYS = 35;           // a monthly payment keeps the rank this long
export const db = () => getStore({ name: 'arashi', consistency: 'strong' });

export const cleanHandle = h => String(h || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
export const validHandle = h => /^[a-z0-9._]{2,30}$/.test(h);

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-admin-key', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
export const preflight = req => req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: CORS }) : null;

// Public view of one ninja: only confirmed purchases count.
export function publicStatus(rec, now = Date.now()) {
  if (!rec || !rec.verified) return { rank: 0, items: [], verified: false };
  const until = rec.rankUntil || 0;
  const active = until > now;
  return { rank: active ? rec.rank : 0, rankUntil: until, items: rec.items || [], verified: true, clan: rec.clan ?? null, seat: active ? rec.seat || null : null, look: rec.look || null };
}

export const isAdmin = req => { const k = Netlify.env.get('ADMIN_KEY'); return !!k && req.headers.get('x-admin-key') === k; };

// ---------- paid seats (must match index.html stands + scripts/followers.mjs) ----------
const DEG = Math.PI / 180, R0 = 34, D = 0.95, SPAN = 72 * DEG - 8 * DEG;
const rowCap = row => Math.floor((R0 + (row - 1) * D + 0.22) * SPAN / 0.5);
const ZONES = { 1: [8, 17], 2: [1, 7] }, LODGE_SEATS = 24;
const ROSTER_URL = 'https://raleposao-spec.github.io/arashi_academy/data/followers.json';

// Clan for a handle: their clan on the roster if they follow already, else a stable hash.
export async function clanOf(handle) {
  try { const r = await fetch(ROSTER_URL); const j = await r.json(); const p = (j.people || []).find(x => x[0] === handle); if (p) return p[1]; } catch {}
  let h = 0; for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 5;
}

// Give a confirmed, active buyer a seat in their rank's zone. Keeps the seat if it already fits.
export async function assignSeat(store, rec, now = Date.now()) {
  const rank = rec.rankUntil > now ? rec.rank : 0;
  if (!rank) { delete rec.seat; return rec; }
  if (rec.seat && rec.seat.rank === rank) return rec;
  if (rec.clan == null) rec.clan = await clanOf(rec.handle);
  const taken = new Set();
  for (const { key } of (await store.list({ prefix: 'ninja/' })).blobs) {
    if (key === 'ninja/' + rec.handle) continue;
    const r = await store.get(key, { type: 'json' });
    if (r && r.verified && r.seat && r.rankUntil > now) taken.add(r.seat.rank === 3 ? `L:${r.seat.seat}` : `${r.clan}:${r.seat.row}:${r.seat.seat}`);
  }
  if (rank === 3) { for (let s = 1; s <= LODGE_SEATS; s++) if (!taken.has(`L:${s}`)) { rec.seat = { rank, row: 0, seat: s }; return rec; } }
  else { const [a, b] = ZONES[rank]; for (let row = a; row <= b; row++) for (let s = 1; s <= rowCap(row); s++) if (!taken.has(`${rec.clan}:${row}:${s}`)) { rec.seat = { rank, row, seat: s }; return rec; } }
  return rec; // zone full: stays in their Genin seat
}

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => 'ARASHI-' + [...crypto.getRandomValues(new Uint8Array(5))].map(b => ABC[b % ABC.length]).join('');
