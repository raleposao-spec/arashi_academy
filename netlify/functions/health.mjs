// Public health check: which secrets are configured (yes/no only, never the values) and the last Ko-fi webhook result.
import { db, json, preflight } from './_lib.mjs';

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const last = await db().get('meta/last-webhook', { type: 'json' }).catch(() => null);
  return json({ kofiToken: !!Netlify.env.get('KOFI_TOKEN'), adminKey: !!Netlify.env.get('ADMIN_KEY'), lastWebhook: last || null });
};

export const config = { path: '/api/health', method: ['GET', 'OPTIONS'] };
