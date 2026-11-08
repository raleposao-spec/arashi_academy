/* Arashi Academy — shared config + top navigation */
window.ARASHI = {
  // Set this to your Ko-fi username (ko-fi.com/<username>) and every Join / Buy button goes live.
  KOFI_USER: 'arashiacademy',
  INSTAGRAM: '',   // e.g. 'arashi.academy' — fill in when the account name is final; links and texts use it
  // Backend (Netlify Functions): same site when served from Netlify, otherwise the Netlify address.
  API: /netlify\.app$/.test(location.hostname) ? '' : 'https://arashi-academy.netlify.app',
  async saveLook(handle, code, look) { try { const r = await fetch(this.API + '/api/loadout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle, code, look }) }); return await r.json(); } catch (e) { return { error: 'Could not reach the server. Try again.' }; } },
  async status(handle) { try { const r = await fetch(this.API + '/api/status?h=' + encodeURIComponent(handle), { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } },
  kofi(path) { return this.KOFI_USER ? 'https://ko-fi.com/' + this.KOFI_USER + (path || '') : null; },
  CLANS: [
    { name: 'Ember', el: 'Fire', c: '#e0522a', c2: '#f5a03a' },
    { name: 'Tide', el: 'Water', c: '#2a76c4', c2: '#36c6c0' },
    { name: 'Volt', el: 'Lightning', c: '#e9c62b', c2: '#8b4fd8' },
    { name: 'Gale', el: 'Wind', c: '#e6ebe2', c2: '#3fa463' },
    { name: 'Stone', el: 'Earth', c: '#8a5a33', c2: '#d9a63f' },
  ],
  RANKS: [
    { n: 'GENIN', col: '#b3aa9b', price: 'Free', per: 'follow', where: 'Upper stands', fight: 'Top comment of the day gets the fight' },
    { n: 'CHUNIN', col: '#5fbf96', price: '$3', per: '/month', where: 'Middle stands', fight: 'In the daily fight draw' },
    { n: 'JONIN', col: '#e2583f', price: '$5', per: '/month', where: 'Front rows by the field', fight: 'Daily draw with 3× odds' },
    { n: 'SENNIN', col: '#e7b54a', price: '$10', per: '/month', where: "Master's lodge", fight: 'Guaranteed fight within 14 days' },
  ],
  async roster() {
    if (this._r) return this._r;
    const j = await (await fetch('data/followers.json', { cache: 'no-cache' })).json();
    this._r = j.people.map(([handle, clan, rank, row, seat, w, l]) => ({ handle, clan, rank, row, seat, w, l }));
    this._demo = !!j.demo; return this._r;
  },
  // Roster entry + confirmed Ko-fi purchases from the backend. Returns null if the handle has neither.
  async lookup(handle) {
    const [all, st] = await Promise.all([this.roster(), this.status(handle)]);
    let p = all.find(x => x.handle === handle);
    if (!p && st && st.verified) { let h = 0; for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0; p = { handle, clan: h % 5, rank: 0, row: 0, seat: 0, w: 0, l: 0 }; }
    if (!p) return null;
    p = { ...p, owned: (st && st.items) || [], verified: !!(st && st.verified), serverLook: (st && st.look) || null };
    if (st && st.verified && st.seat) { p.rank = st.seat.rank; p.row = st.seat.row; p.seat = st.seat.seat; if (st.clan != null) p.clan = st.clan; }
    else if (st && st.verified && st.rank > p.rank) p.rank = st.rank;
    return p;
  },
  seatText(p) { if (!p.row && !p.seat) return 'Seat assigned with the next follower import'; return p.rank === 3 ? "Master's lodge · Seat " + p.seat : this.CLANS[p.clan].name + ' stand · Row ' + p.row + ' · Seat ' + p.seat; },
  wireKofi(root = document) {
    root.querySelectorAll('[data-kofi]').forEach(a => {
      const url = this.kofi(a.dataset.kofi);
      if (!url) { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.title = 'Ko-fi opens soon'; if (a.dataset.soon !== 'keep') a.textContent = 'Opens soon'; return; }
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled');
      if (!a.dataset.wired) { a.dataset.wired = '1'; a.addEventListener('click', e => { e.preventDefault(); this.unlock(url, a.dataset.what || a.textContent.trim(), a.dataset.item); }); }
    });
  },
  // Unlock flow: @handle → one-time code → pay on Ko-fi with the code in the message → DM the code from that Instagram account.
  unlock(url, what, item) {
    let d = document.getElementById('unlockDlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'unlockDlg'; d.className = 'unlock'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
    const H = localStorage.getItem('arashi.me') || '';
    d.innerHTML = `<form method="dialog" class="u-x"><button aria-label="Close">×</button></form>
      <p class="u-eye">Unlock</p><h2>${what.replace(/</g, '&lt;')}</h2>
      <ol class="u-steps">
        <li><b>Your Instagram</b><div class="u-row"><span>@</span><input id="uH" value="${H}" placeholder="your_handle" autocapitalize="off" spellcheck="false"><button type="button" id="uGo">Get my code</button></div><p class="u-err" id="uErr" role="alert"></p></li>
        <li class="u-off" id="uS2"><b>${item ? 'Send a $2 support on Ko-fi' : 'Pick your tier on Ko-fi'}</b> and paste this in the message: <code id="uCode">—</code> <button type="button" class="u-copy" id="uCopy">Copy</button>
          <label class="u-ok"><input type="checkbox" id="uAgree"><span>I agree to the <a href="terms.html" target="_blank">Terms</a> and want my perks to start as soon as they're confirmed.</span></label>
          <a class="u-pay is-off" id="uPay" href="${url}" target="_blank" rel="noopener" aria-disabled="true">Open Ko-fi →</a></li>
        <li class="u-off" id="uS3"><b>DM the same code</b> to ${this.INSTAGRAM ? `<a href="https://instagram.com/${this.INSTAGRAM}" target="_blank" rel="noopener">@${this.INSTAGRAM}</a>` : 'our Instagram'} from @<span id="uH2">you</span>. That proves the account is yours, so nobody else can take your rank. Your seat and gear update once we confirm. <strong>Keep the code</strong>: you use it on My Ninja to save your look for the fights.</li>
      </ol>`;
    const $ = id => d.querySelector('#' + id);
    $('uGo').onclick = async () => {
      const h = $('uH').value.trim().toLowerCase().replace(/^@+/, '');
      if (!/^[a-z0-9._]{2,30}$/.test(h)) { $('uErr').textContent = 'Type your Instagram @handle.'; return; }
      $('uErr').textContent = ''; $('uGo').disabled = true; $('uGo').textContent = '…';
      let code = null;
      try { const r = await fetch(this.API + '/api/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: h, item: item || null }) }); const j = await r.json(); code = j.code; if (!code) $('uErr').textContent = j.error || 'Try again.'; } catch (e) {}
      if (!code) { code = '@' + h; if (!$('uErr').textContent) $('uErr').textContent = 'Could not make a code right now. Write your @handle in the Ko-fi message instead.'; }
      try { localStorage.setItem('arashi.me', h); } catch (e) {}
      $('uCode').textContent = code; $('uH2').textContent = h; $('uS2').classList.remove('u-off'); $('uS3').classList.remove('u-off');
      $('uGo').disabled = false; $('uGo').textContent = 'New code';
    };
    $('uAgree').onchange = () => { const on = $('uAgree').checked; $('uPay').classList.toggle('is-off', !on); $('uPay').setAttribute('aria-disabled', String(!on)); };
    $('uPay').addEventListener('click', e => { if (!$('uAgree').checked) { e.preventDefault(); $('uAgree').focus(); } });
    $('uCopy').onclick = () => { navigator.clipboard?.writeText($('uCode').textContent); $('uCopy').textContent = 'Copied'; };
    d.showModal(); if (!H) $('uH').focus();
  },
};
(function foot() {
  const add = () => { if (document.querySelector('.sitefoot') || /(^|\/)(index\.html)?$/.test(location.pathname)) return;
    const f = document.createElement('footer'); f.className = 'sitefoot';
    f.innerHTML = '<img src="assets/brand/arashi-mark-64.png" alt="" width="22" height="22"> Arashi Academy · <a href="terms.html">Terms &amp; Privacy</a> · <a href="https://ko-fi.com/' + (window.ARASHI.KOFI_USER || '') + '" target="_blank" rel="noopener">Ko-fi</a> · Not affiliated with Naruto or its creators.';
    document.body.appendChild(f); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
(function nav() {
  const here = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const links = [['index', 'Arena'], ['ranks', 'Ranks'], ['shop', 'Shop'], ['ninja', 'My Ninja']];
  const n = document.createElement('nav'); n.className = 'sitenav'; n.setAttribute('aria-label', 'Site');
  if (!document.querySelector('link[rel=icon]')) { const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/png'; l.href = 'assets/brand/arashi-mark-64.png'; document.head.appendChild(l); const ap = document.createElement('link'); ap.rel = 'apple-touch-icon'; ap.href = 'assets/brand/arashi-badge-180.png'; document.head.appendChild(ap); }
  n.innerHTML = '<a class="sn-brand" href="index.html" aria-label="Arashi Academy home"><img src="assets/brand/arashi-mark-64.png" alt="" width="32" height="32"><span>Arashi Academy</span></a>' +
    '<div class="sn-links">' + links.map(([h, t]) => `<a href="${h}.html"${h === here ? ' aria-current="page"' : ''}>${t}</a>`).join('') + '</div>';
  document.body.prepend(n);
})();
