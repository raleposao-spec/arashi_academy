// Public: what a handle has unlocked (only confirmed purchases).
import { db, cleanHandle, validHandle, json, preflight, publicStatus } from './_lib.mjs';

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const h = cleanHandle(new URL(req.url).searchParams.get('h'));
  if (!validHandle(h)) return json({ error: 'bad handle' }, 400);
  const rec = await db().get('ninja/' + h, { type: 'json' });
  return json({ handle: h, ...publicStatus(rec) });
};

export const config = { path: '/api/status', method: ['GET', 'OPTIONS'] };
