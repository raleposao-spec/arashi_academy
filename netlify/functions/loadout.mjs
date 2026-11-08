// Save a confirmed buyer's look so the daily fights and the arena can use it.
//   POST /api/loadout {handle, code, look}  — code = the buyer's ARASHI-XXXXX code (the one confirmed over DM)
//   The look is public (it shows in fights); only the code holder can change it.
import { db, cleanHandle, validHandle, json, preflight } from './_lib.mjs';

const KEYS = { outfit: 40, weapon: 40, jutsu: 40, mask: 40, scarf: 5, aura: 5, eyes: 10, entrance: 40, hair: 20, hairColor: 9, skin: 9 };
const clean = look => { const o = {}; for (const [k, max] of Object.entries(KEYS)) { const v = look?.[k]; if (v === true || v === null) o[k] = v; else if (typeof v === 'string' && v.length <= max) o[k] = v; } return o; };

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  let b = {}; try { b = await req.json(); } catch {}
  const h = cleanHandle(b.handle); if (!validHandle(h)) return json({ error: 'bad handle' }, 400);
  const store = db(), key = 'ninja/' + h, rec = await store.get(key, { type: 'json' });
  if (!rec || !rec.verified) return json({ error: 'Only confirmed members can save a loadout to the fights.' }, 403);
  if (!rec.code || String(b.code || '').trim().toUpperCase() !== rec.code) return json({ error: 'That code does not match this @handle.' }, 403);
  rec.look = clean(b.look); rec.lookSaved = Date.now();
  await store.setJSON(key, rec);
  return json({ ok: true, look: rec.look });
};

export const config = { path: '/api/loadout', method: ['POST', 'OPTIONS'] };
