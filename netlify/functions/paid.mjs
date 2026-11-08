// Public: confirmed buyers with an active rank and their arena seats, for the arena to place them.
// Rows match data/followers.json: [handle, clan, rank, row, seat, w, l]
import { db, json, preflight } from './_lib.mjs';

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const store = db(), now = Date.now(), out = [];
  for (const { key } of (await store.list({ prefix: 'ninja/' })).blobs) {
    const r = await store.get(key, { type: 'json' });
    if (r && r.verified && r.seat && r.rankUntil > now) out.push([r.handle, r.clan, r.seat.rank, r.seat.row, r.seat.seat, r.w || 0, r.l || 0]);
  }
  const res = json({ people: out });
  res.headers.set('cache-control', 'public, max-age=60');
  return res;
};

export const config = { path: '/api/paid', method: ['GET', 'OPTIONS'] };
