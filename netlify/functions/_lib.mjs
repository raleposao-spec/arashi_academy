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
  return { rank: until > now ? rec.rank : 0, rankUntil: until, items: rec.items || [], verified: true };
}

export const isAdmin = req => { const k = Netlify.env.get('ADMIN_KEY'); return !!k && req.headers.get('x-admin-key') === k; };
