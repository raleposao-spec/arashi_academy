/* Arashi Academy — shared config + top navigation */
window.ARASHI = {
  // Set this to your Ko-fi username (ko-fi.com/<username>) and every Join / Buy button goes live.
  KOFI_USER: '',
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
  seatText(p) { return p.rank === 3 ? "Master's lodge · Seat " + p.seat : this.CLANS[p.clan].name + ' stand · Row ' + p.row + ' · Seat ' + p.seat; },
  wireKofi(root = document) {
    root.querySelectorAll('[data-kofi]').forEach(a => {
      const url = this.kofi(a.dataset.kofi);
      if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); }
      else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.title = 'Ko-fi opens soon'; if (a.dataset.soon !== 'keep') a.textContent = 'Opens soon'; }
    });
  },
};
(function nav() {
  const here = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const links = [['index', 'Arena'], ['ranks', 'Ranks'], ['shop', 'Shop'], ['ninja', 'My Ninja']];
  const n = document.createElement('nav'); n.className = 'sitenav'; n.setAttribute('aria-label', 'Site');
  if (!document.querySelector('link[rel=icon]')) { const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/png'; l.href = 'assets/brand/arashi-mark-64.png'; document.head.appendChild(l); const ap = document.createElement('link'); ap.rel = 'apple-touch-icon'; ap.href = 'assets/brand/arashi-badge-180.png'; document.head.appendChild(ap); }
  n.innerHTML = '<a class="sn-brand" href="index.html" aria-label="Arashi Academy home"><img src="assets/brand/arashi-mark-64.png" alt="" width="32" height="32"><span>Arashi Academy</span></a>' +
    '<div class="sn-links">' + links.map(([h, t]) => `<a href="${h}.html"${h === here ? ' aria-current="page"' : ''}>${t}</a>`).join('') + '</div>';
  document.body.prepend(n);
})();
