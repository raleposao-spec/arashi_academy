// Ko-fi webhook: Ko-fi POSTs every payment here (form field "data" with JSON).
// Set the URL on Ko-fi → Settings → API → Webhooks, and the KOFI_TOKEN env var to the Verification Token shown there.
import { db, RANK_OF_TIER, MEMBERSHIP_DAYS, cleanHandle, validHandle, assignSeat } from './_lib.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let d;
  try { const form = await req.formData(); d = JSON.parse(form.get('data')); } catch { return new Response('Bad payload', { status: 400 }); }
  const token = Netlify.env.get('KOFI_TOKEN');
  if (!token || d.verification_token !== token) { console.log('kofi: rejected (verification token missing or wrong)'); return new Response('Unauthorized', { status: 401 }); }

  const store = db();
  const id = d.kofi_transaction_id || d.message_id;
  if (await store.get('pay/' + id)) return new Response('ok');            // Ko-fi may retry; handle each payment once

  // Who is it for? Prefer a site code (ARASHI-XXXXX), else an @handle in the message.
  const msg = String(d.message || '');
  const code = (msg.match(/ARASHI-[A-Z0-9]{5}/i) || [])[0]?.toUpperCase() || null;
  let handle = null, claimItem = null;
  if (code) { const c = await store.get('claim/' + code, { type: 'json' }); if (c) { handle = c.handle; claimItem = c.item; } }
  if (!handle) { const m = msg.match(/@([A-Za-z0-9._]{2,30})/); if (m) handle = cleanHandle(m[1]); }

  const tier = String(d.tier_name || '').trim().toLowerCase();
  const rank = d.type === 'Subscription' ? (RANK_OF_TIER[tier] || 0) : 0;
  const items = (d.shop_items || []).map(i => i.direct_link_code).filter(Boolean);
  // single item bought with a $2+ tip and a site code
  if (claimItem && (d.type === 'Donation' || d.type === 'Tip') && parseFloat(d.amount) >= 2) items.push(claimItem);
  const pay = { id, type: d.type, tier: d.tier_name || null, rank, items, amount: d.amount, currency: d.currency, from: d.from_name || null,
    email: d.email || null, message: msg.slice(0, 300), code, handle, at: d.timestamp || new Date().toISOString(), firstSub: !!d.is_first_subscription_payment };
  await store.setJSON('pay/' + id, pay);

  if (handle && validHandle(handle)) {
    const key = 'ninja/' + handle, rec = (await store.get(key, { type: 'json' })) || { handle, verified: false, rank: 0, items: [], payments: [] };
    if (rank) { rec.rank = Math.max(rank, rec.rankUntil > Date.now() ? rec.rank : 0); rec.rankUntil = Date.now() + MEMBERSHIP_DAYS * 864e5; }
    rec.items = [...new Set([...(rec.items || []), ...items])];
    rec.payments = [...(rec.payments || []), id].slice(-50);
    rec.email = rec.email || pay.email; rec.code = rec.code || code; rec.updated = Date.now();
    if (rec.verified) await assignSeat(store, rec);   // renewals / upgrades of confirmed buyers move straight away
    await store.setJSON(key, rec);
  } else {
    await store.setJSON('unmatched/' + id, pay);                           // no handle: shows up in the admin page to sort out by hand
  }
  console.log(`kofi: saved ${d.type} ${d.tier_name || ''} ${d.amount} ${d.currency} → ${handle ? '@' + handle : 'no handle (admin: unmatched)'}`);
  return new Response('ok');
};

export const config = { path: '/api/kofi', method: 'POST' };
