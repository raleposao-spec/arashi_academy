// Gives a buyer a one-time code tied to their @handle. They paste it in the Ko-fi message and DM it to the Instagram account.
import { db, cleanHandle, validHandle, json, preflight } from './_lib.mjs';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export default async (req, context) => {
  const pre = preflight(req); if (pre) return pre;
  let body = {}; try { body = await req.json(); } catch {}
  const handle = cleanHandle(body.handle);
  if (!validHandle(handle)) return json({ error: 'Type your Instagram @handle.' }, 400);
  const store = db();
  // light abuse limit: 20 codes per IP per hour
  const ipKey = 'rl/' + (context.ip || 'x') + '/' + Math.floor(Date.now() / 36e5);
  const n = (await store.get(ipKey, { type: 'json' })) || 0;
  if (n > 20) return json({ error: 'Too many tries. Wait a bit.' }, 429);
  await store.setJSON(ipKey, n + 1);
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const code = 'ARASHI-' + [...bytes].map(b => ABC[b % ABC.length]).join('');
  const item = String(body.item || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || null;
  await store.setJSON('claim/' + code, { handle, item, created: Date.now() });
  return json({ code, handle, item });
};

export const config = { path: '/api/claim', method: ['POST', 'OPTIONS'] };
