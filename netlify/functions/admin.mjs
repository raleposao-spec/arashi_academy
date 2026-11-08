// Admin (needs the ADMIN_KEY env var, sent as the x-admin-key header):
//   GET  /api/admin              → buyers waiting for Instagram confirmation, confirmed ninjas, unmatched payments
//   POST /api/admin {action:'verify', handle}          → confirm after the buyer DMed the code from that account
//   POST /api/admin {action:'unverify', handle}
//   POST /api/admin {action:'assign', payment, handle} → attach an unmatched payment to a handle
import { db, cleanHandle, validHandle, json, preflight, isAdmin, MEMBERSHIP_DAYS, assignSeat } from './_lib.mjs';

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (!isAdmin(req)) return json({ error: 'Wrong admin key' }, 401);
  const store = db();
  if (req.method === 'GET') {
    const out = { pending: [], verified: [], unmatched: [] };
    for (const { key } of (await store.list({ prefix: 'ninja/' })).blobs) { const r = await store.get(key, { type: 'json' }); if (r) (r.verified ? out.verified : out.pending).push(r); }
    for (const { key } of (await store.list({ prefix: 'unmatched/' })).blobs) { const r = await store.get(key, { type: 'json' }); if (r) out.unmatched.push(r); }
    return json(out);
  }
  let b = {}; try { b = await req.json(); } catch {}
  const h = cleanHandle(b.handle); if (!validHandle(h)) return json({ error: 'bad handle' }, 400);
  const key = 'ninja/' + h;
  if (b.action === 'verify' || b.action === 'unverify') {
    const r = await store.get(key, { type: 'json' }); if (!r) return json({ error: 'no purchase for that handle' }, 404);
    r.verified = b.action === 'verify'; r.verifiedAt = Date.now(); if (r.verified) await assignSeat(store, r); else delete r.seat; await store.setJSON(key, r); return json({ ok: true, ninja: r });
  }
  if (b.action === 'assign') {
    const p = await store.get('unmatched/' + b.payment, { type: 'json' }); if (!p) return json({ error: 'no such payment' }, 404);
    const r = (await store.get(key, { type: 'json' })) || { handle: h, verified: false, rank: 0, items: [], payments: [] };
    if (p.rank) { r.rank = Math.max(p.rank, r.rankUntil > Date.now() ? r.rank : 0); r.rankUntil = Date.now() + MEMBERSHIP_DAYS * 864e5; }
    r.items = [...new Set([...(r.items || []), ...(p.items || [])])]; r.payments = [...(r.payments || []), p.id]; r.email = r.email || p.email;
    if (r.verified) await assignSeat(store, r);
    await store.setJSON(key, r); await store.delete('unmatched/' + b.payment); return json({ ok: true, ninja: r });
  }
  return json({ error: 'unknown action' }, 400);
};

export const config = { path: '/api/admin', method: ['GET', 'POST', 'OPTIONS'] };
