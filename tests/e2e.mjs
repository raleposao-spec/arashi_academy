const ENV = { KOFI_TOKEN: 'tok123', ADMIN_KEY: 'adm456' };
globalThis.Netlify = { env: { get: k => ENV[k] } };
globalThis.fetch = async () => { throw new Error('offline'); };   // roster fetch → hash clan
const fn = async n => (await import('./' + n + '.mjs')).default;
const [claim, kofi, status, admin, paid, loadout, health] = await Promise.all(['claim','kofi','status','admin','paid','loadout','health'].map(fn));
const J = r => r.json(); const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const post = (url, body, h = {}) => new Request('https://x' + url, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
const kofiReq = d => { const f = new FormData(); f.set('data', JSON.stringify(d)); return new Request('https://x/api/kofi', { method: 'POST', body: f }); };

// 1 claim
const c = await J(await claim(post('/api/claim', { handle: '@Marko.Ninja' }), { ip: '1.1.1.1' }));
ok(/^ARASHI-[A-Z0-9]{5}$/.test(c.code) && c.handle === 'marko.ninja', 'claim gives code ' + c.code);
// 2 webhook with wrong token
let r = await kofi(kofiReq({ verification_token: 'bad', type: 'Subscription', tier_name: 'Jonin', message: c.code, kofi_transaction_id: 't0' }));
ok(r.status === 401, 'wrong token rejected');
// 3 real Jonin subscription with the code
r = await kofi(kofiReq({ verification_token: 'tok123', type: 'Subscription', tier_name: 'Jonin', amount: '5.00', currency: 'USD', message: 'hi ' + c.code, email: 'm@x.com', from_name: 'Marko', kofi_transaction_id: 't1', is_first_subscription_payment: true }));
ok(r.status === 200, 'webhook accepted');
r = await kofi(kofiReq({ verification_token: 'tok123', type: 'Subscription', tier_name: 'Jonin', message: c.code, kofi_transaction_id: 't1' }));
ok(r.status === 200, 'duplicate accepted once');
let st = await J(await status(new Request('https://x/api/status?h=marko.ninja')));
ok(st.verified === false && st.rank === 0, 'not public before confirm');
// 4 admin
r = await admin(new Request('https://x/api/admin'));
ok(r.status === 401, 'admin needs key');
let list = await J(await admin(new Request('https://x/api/admin', { headers: { 'x-admin-key': 'adm456' } })));
ok(list.pending.length === 1 && list.pending[0].rank === 2, 'admin sees pending Jonin');
r = await J(await admin(post('/api/admin', { action: 'verify', handle: 'marko.ninja' }, { 'x-admin-key': 'adm456' })));
ok(r.ok && r.ninja.seat && r.ninja.seat.rank === 2 && r.ninja.seat.row >= 1 && r.ninja.seat.row <= 7, 'confirm gives Jonin seat ' + JSON.stringify(r.ninja.seat));
// 5 public views
st = await J(await status(new Request('https://x/api/status?h=marko.ninja')));
ok(st.verified && st.rank === 2 && st.seat, 'status shows Jonin + seat');
const pd = await J(await paid(new Request('https://x/api/paid')));
ok(pd.people.length === 1 && pd.people[0][0] === 'marko.ninja' && pd.people[0][2] === 2, 'arena list has him');
// 6 loadout
r = await loadout(post('/api/loadout', { handle: 'marko.ninja', code: 'ARASHI-WRONG', look: { outfit: 'Jonin Coat' } }));
ok(r.status === 403, 'wrong code cannot save look');
r = await J(await loadout(post('/api/loadout', { handle: 'marko.ninja', code: c.code.toLowerCase(), look: { outfit: 'Jonin Coat', mask: 'Fox mask', hack: '<x>' } })));
ok(r.ok && r.look.outfit === 'Jonin Coat' && !r.look.hack, 'right code saves look');
st = await J(await status(new Request('https://x/api/status?h=marko.ninja')));
ok(st.look && st.look.mask === 'Fox mask', 'status returns look');
// 7 single item via $2 tip with an item code; second buyer pays with @handle only
const c2 = await J(await claim(post('/api/claim', { handle: 'ana', item: 'fox-mask' }), { ip: '2.2.2.2' }));
await kofi(kofiReq({ verification_token: 'tok123', type: 'Tip', amount: '2.00', message: c2.code, kofi_transaction_id: 't2' }));
await kofi(kofiReq({ verification_token: 'tok123', type: 'Subscription', tier_name: 'Sennin', amount: '10.00', message: 'for @luka_s pls', kofi_transaction_id: 't3' }));
await kofi(kofiReq({ verification_token: 'tok123', type: 'Tip', amount: '3.00', message: 'love it', kofi_transaction_id: 't4' }));
list = await J(await admin(new Request('https://x/api/admin', { headers: { 'x-admin-key': 'adm456' } })));
ok(list.pending.find(x => x.handle === 'ana')?.items.includes('fox-mask'), '$2 tip with item code gives item');
ok(list.unmatched.length === 1, 'payment without handle goes to unmatched');
r = await J(await admin(post('/api/admin', { action: 'verify', handle: 'luka_s' }, { 'x-admin-key': 'adm456' })));
ok(r.ninja.seat.rank === 3 && /^ARASHI-/.test(r.ninja.code), 'Sennin by @handle gets lodge seat + a code to DM back');
r = await J(await admin(post('/api/admin', { action: 'assign', payment: 't4', handle: 'ana' }, { 'x-admin-key': 'adm456' })));
ok(r.ok, 'unmatched payment attached by hand');
// 8 expiry
const M = globalThis.__BLOBS; const rec = JSON.parse(M.get('ninja/marko.ninja')); rec.rankUntil = Date.now() - 1000; M.set('ninja/marko.ninja', JSON.stringify(rec));
st = await J(await status(new Request('https://x/api/status?h=marko.ninja')));
const pd2 = await J(await paid(new Request('https://x/api/paid')));
ok(st.rank === 0 && !pd2.people.find(p => p[0] === 'marko.ninja'), 'expired member drops back to Genin');
const hz = await J(await health(new Request('https://x/api/health')));
ok(hz.kofiToken && hz.adminKey && hz.lastWebhook.result === 'saved', 'health ok');
