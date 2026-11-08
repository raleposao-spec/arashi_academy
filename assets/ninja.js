/* Arashi Academy — character system.
   NINJA.build({rank, clan, outfit, weapon, mask, scarf, aura, eyes, hair, hairColor, skin, seed})
   returns { group, bones, face, setPose(pose,k), update(dt,t), hands:{L,R}, feet:{L,R}, headTop }.
   Faces +z. About 1.8 units tall. Requires global THREE (r147). */
window.NINJA = (function () {
  const T = THREE, V3 = T.Vector3, V2 = T.Vector2;
  const CLANS = [
    { name: 'Ember', el: 'Fire', c: '#d8452a', c2: '#f5a03a', ink: '#fff3e6', glyph: 'fire' },
    { name: 'Tide', el: 'Water', c: '#2569b8', c2: '#36c6c0', ink: '#eaf8ff', glyph: 'water' },
    { name: 'Volt', el: 'Lightning', c: '#e3bd1f', c2: '#8b4fd8', ink: '#2a1846', glyph: 'bolt' },
    { name: 'Gale', el: 'Wind', c: '#e6ebe2', c2: '#3fa463', ink: '#1f5a35', glyph: 'wind' },
    { name: 'Stone', el: 'Earth', c: '#8a5a33', c2: '#d9a63f', ink: '#fff1d6', glyph: 'earth' },
  ];
  const RANK_OUTFIT = ['Academy Gi', 'Shadow Runner', 'Jonin Coat', 'Celestial Sage'];
  const SKINS = ['#f1c9a5', '#e7b28c', '#d39a72', '#b97a52', '#8d5a3b', '#6b4129'];
  const HAIRS = ['#1d1611', '#2b1d16', '#3b2418', '#5a3a22', '#141414', '#6b2a1e', '#c9ccd4', '#8a6a3a', '#3a2a4a', '#1f2a3a', '#a33a2a', '#d9c27a'];
  const HAIRSTYLES = ['spiky', 'swept', 'tall', 'long', 'short', 'bun'];

  /* ---------- materials ---------- */
  let grad = null;
  const gradMap = () => { if (grad) return grad; grad = new T.DataTexture(new Uint8Array([72, 72, 72, 255, 142, 142, 142, 255, 208, 208, 208, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat); grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true; return grad; };
  const cache = {};
  function M(col, opt) { const k = col + (opt ? JSON.stringify(opt) : ''); if (!cache[k]) cache[k] = new T.MeshToonMaterial(Object.assign({ color: col, gradientMap: gradMap() }, opt || {})); return cache[k]; }
  function B(col) { const k = 'b' + col; if (!cache[k]) cache[k] = new T.MeshBasicMaterial({ color: col }); return cache[k]; }
  const OUT = new T.ShaderMaterial({ uniforms: { w: { value: .0085 }, c: { value: new T.Color(0x0d0907) } }, side: T.BackSide,
    vertexShader: 'uniform float w; void main(){ vec3 p=position+normal*w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }',
    fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor=vec4(c,1.); }' });
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  let glowTex = null;
  function glow() { if (!glowTex) glowTex = canvasTex(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); return glowTex; }
  function drawGlyph(g, c, x, y, s) { g.fillStyle = c.ink; g.strokeStyle = c.ink; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.save(); g.translate(x, y); g.scale(s, s);
    if (c.glyph === 'fire') { g.beginPath(); g.moveTo(0, -90); g.bezierCurveTo(80, -10, 70, 80, 0, 90); g.bezierCurveTo(-70, 80, -80, -10, -20, -40); g.bezierCurveTo(-20, 0, 0, 10, 0, -90); g.fill(); }
    if (c.glyph === 'water') { for (let i = -1; i <= 1; i++) { g.beginPath(); for (let s2 = 0; s2 <= 40; s2++) { const px = -80 + s2 * 4, py = i * 50 + Math.sin(s2 / 40 * Math.PI * 3) * 16; s2 ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } }
    if (c.glyph === 'bolt') { g.beginPath(); g.moveTo(20, -95); g.lineTo(-50, 15); g.lineTo(-2, 15); g.lineTo(-24, 100); g.lineTo(52, -15); g.lineTo(4, -15); g.closePath(); g.fill(); }
    if (c.glyph === 'wind') { [[-20, -45, 52], [10, 25, 40], [-30, 70, 26]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(dx, dy, r, Math.PI * .9, Math.PI * 2.6); g.lineTo(dx - r * 2.2, dy + r); g.stroke(); }); }
    if (c.glyph === 'earth') { g.beginPath(); g.moveTo(-90, 80); g.lineTo(-25, -50); g.lineTo(10, 5); g.lineTo(40, -80); g.lineTo(95, 80); g.closePath(); g.fill(); }
    g.restore(); }
  const plateCache = {};
  function plateTex(kind) { if (plateCache[kind]) return plateCache[kind];
    const P = { steel: [['#7f8891', '#c3cad1'], '#2a2e33'], bronze: [['#7a4f22', '#d29a52'], '#3a220c'], silver: [['#3b3f47', '#8d939c'], '#e7b54a'] }[kind];
    return plateCache[kind] = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, P[0][0]); gr.addColorStop(.5, P[0][1]); gr.addColorStop(1, P[0][0]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = P[1]; g.lineWidth = 7; g.strokeRect(6, 6, w - 12, h - 12); const cx = w / 2, cy = h / 2 + 4; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 40, 0, 7); g.stroke(); g.fillStyle = P[1]; g.beginPath(); g.moveTo(cx - 30, cy + 20); g.lineTo(cx, cy - 24); g.lineTo(cx + 30, cy + 20); g.closePath(); g.fill();
      g.lineWidth = 4; [[-52, -36, 1], [-2, -48, .3], [48, -36, -1]].forEach(([dx, dy, s]) => { g.beginPath(); g.moveTo(cx + dx, cy + dy); g.lineTo(cx + dx + 6 * s, cy + dy + 12); g.lineTo(cx + dx - 3 * s, cy + dy + 14); g.lineTo(cx + dx + 4 * s, cy + dy + 28); g.stroke(); }); }); }

  /* ---------- geometry helpers ---------- */
  function lathe(prof, seg = 14, ps = 0, pl = Math.PI * 2) { return new T.LatheGeometry(prof.map(([r, y]) => new V2(Math.max(1e-3, r), y)), seg, ps, pl); }
  function limbGeo(len, r0, r1, bulge = 0, bulgeAt = .4) { const p = [], N = 6;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI / 2; p.push([r1 * Math.sin(a), -len - r1 * .6 * Math.cos(a)]); }
    for (let i = 1; i < 12; i++) { const t = 1 - i / 12; const b = bulge * Math.exp(-Math.pow((t - bulgeAt) / .28, 2)); p.push([r0 + (r1 - r0) * t + b, -t * len]); }
    for (let i = 0; i <= N; i++) { const a = (1 - i / N) * Math.PI / 2; p.push([r0 * Math.sin(a), r0 * .6 * Math.cos(a)]); }
    return lathe(p, 14); }
  function joint(parent, x, y, z, name, bones) { const g = new T.Group(); g.position.set(x, y, z); g.name = name; parent.add(g); if (bones) bones[name] = g; return g; }
  function put(parent, geo, mat, pos, rot, scl, outline = true) { const m = new T.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scl) m.scale.set(...scl); if (outline && !mat.side) m.add(new T.Mesh(geo, OUT)); parent.add(m); return m; }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d), sph = (r, a = 14, b = 10) => new T.SphereGeometry(r, a, b), cyl = (a, b, h, s = 12, open = false, ts = 0, tl = Math.PI * 2) => new T.CylinderGeometry(a, b, h, s, 1, open, ts, tl), cone = (r, h, s = 7) => new T.ConeGeometry(r, h, s), tor = (r, t, a = 6, b = 18) => new T.TorusGeometry(r, t, a, b);
  function aim(m, dir) { m.quaternion.setFromUnitVectors(new V3(0, 1, 0), new V3(...dir).normalize()); return m; }
  function rnd(seed) { let a = seed | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- outfits: segment colors + extra pieces ---------- */
  const OUTFITS = {
    'Academy Gi': c => ({ torso: '#4d5562', pelvis: '#2b2f37', upper: '#4d5562', fore: '#cfc6b6', hand: 'skin', thigh: '#2b2f37', shin: '#2b2f37', foot: '#1c1a18', looseLegs: 1,
      extra(b, k) { k.skirt('#4d5562', .17, .22, .16); k.sash(new T.Color(c.c).lerp(new T.Color('#6b6b6b'), .3)); k.wraps('#cfc6b6'); k.pouch(); } }),
    'Shadow Runner': c => ({ torso: '#1d1f24', pelvis: '#1d1f24', upper: '#1d1f24', fore: '#5d3b24', hand: '#141519', thigh: '#1d1f24', shin: '#8e8a82', foot: '#121316',
      extra(b, k) { k.chestPanels('#3b414b'); k.scarf(c.c); k.belt('#2a2018'); k.holster(); } }),
    'Storm Monk': c => ({ torso: '#6c6f76', pelvis: '#55585e', upper: '#6c6f76', fore: 'skin', hand: 'skin', thigh: '#55585e', shin: '#55585e', foot: '#3a2a1e', wideSleeves: '#6c6f76',
      extra(b, k) { k.robeSkirt('#6c6f76', .62); k.sash('#2a2622'); k.beads(); } }),
    'Clan Vest': c => ({ torso: '#1d1f24', pelvis: '#23262c', upper: '#1d1f24', fore: '#1d1f24', hand: '#141519', thigh: '#23262c', shin: '#23262c', foot: '#121316',
      extra(b, k) { k.vest(c); k.belt('#2a2018'); k.shinGuards('#3a3f47'); } }),
    'Jonin Coat': c => ({ torso: '#2a2d34', pelvis: '#121418', upper: '#24262b', fore: '#3c4048', hand: '#0d0e10', thigh: '#121418', shin: '#121418', foot: '#121418',
      extra(b, k) { k.coat('#24262b', c.c, .78); k.halfMask('#0d0e10'); k.backSymbol(c); k.vestBands('#1e2126'); } }),
    'Crimson Ronin': c => ({ torso: '#2b1d1a', pelvis: '#1c1614', upper: '#9b2a22', fore: '#2b1d1a', hand: 'skin', thigh: '#1c1614', shin: '#c9c1b2', foot: '#2a1d14',
      extra(b, k) { k.coat('#9b2a22', '#3a1410', .7, true); k.strawHat(); k.sash('#e0c48a'); } }),
    'Mist Hunter': c => ({ torso: '#1e2a3a', pelvis: '#16202c', upper: '#26405e', fore: '#16202c', hand: '#0d0e10', thigh: '#16202c', shin: '#16202c', foot: '#0f141c',
      extra(b, k) { k.coat('#26405e', '#122033', .86); k.hood('#26405e'); k.halfMask('#cfd6df'); } }),
    'Iron Fang': c => ({ torso: '#2a2d33', pelvis: '#1e2126', upper: '#2a2d33', fore: '#6f7680', hand: '#2a2d33', thigh: '#1e2126', shin: '#6f7680', foot: '#2a2d33',
      extra(b, k) { k.plateArmor('#8a929c'); k.cape(c.c, .5); } }),
    'Celestial Sage': c => ({ torso: '#d8d2c6', pelvis: '#d8d2c6', upper: '#d8d2c6', fore: '#d8d2c6', hand: 'skin', thigh: '#d8d2c6', shin: '#d8d2c6', foot: '#d9a63f', wideSleeves: '#d8d2c6',
      extra(b, k) { k.robeSkirt('#d8d2c6', .86, '#d9a63f'); k.collar('#d8d2c6'); k.beads(); k.sash('#d9a63f'); k.scroll(); } }),
    'Oni Warlord': c => ({ torso: '#1a1414', pelvis: '#141010', upper: '#1a1414', fore: '#3a2a28', hand: '#1a1414', thigh: '#141010', shin: '#3a2a28', foot: '#141010',
      extra(b, k) { k.plateArmor('#3a2a28', '#8f1d18'); k.furCloak(); k.horns(); } }),
  };

  function build(o = {}) {
    const rank = o.rank | 0, clan = CLANS[o.clan == null ? 2 : o.clan], R = rnd(o.seed == null ? 7 : o.seed);
    const skin = o.skin || SKINS[1], hairCol = o.hairColor || HAIRS[[1, 5, 6, 4][rank]];
    const outfitName = o.outfit || RANK_OUTFIT[rank], spec = (OUTFITS[outfitName] || OUTFITS[RANK_OUTFIT[rank]])(clan);
    const mat = k => { const v = spec[k]; return v === 'skin' ? M(skin) : M(v); };
    const root = new T.Group(), bones = {}, anim = [];
    const hips = joint(root, 0, .98, 0, 'hips', bones);
    const spine = joint(hips, 0, .09, 0, 'spine', bones);
    const neck = joint(spine, 0, .335, 0, 'neck', bones);
    const head = joint(neck, 0, .085, 0, 'head', bones);
    const face = new T.Group(); face.position.set(0, .11, 0); head.add(face);
    // pelvis + torso
    put(hips, lathe([[.05, -.15], [.12, -.12], [.148, -.06], [.152, .02], [.135, .1]]), mat('pelvis'), null, null, [1, 1, .72]);
    put(spine, lathe([[.124, -.02], [.13, .06], [.16, .16], [.178, .24], [.17, .29], [.13, .32], [.06, .345]]), mat('torso'), null, null, [1, 1, .66]);
    put(neck, cyl(.043, .048, .11, 10), M(skin), [0, .035, 0], null, null, false);
    // head
    put(face, sph(.112, 22, 16), M(skin), [0, 0, 0], null, [1, 1.04, 1]);
    put(face, sph(.086, 18, 12), M(skin), [0, -.05, .016], null, [.9, .86, .94]);
    [-1, 1].forEach(s => put(face, sph(.022, 10, 8), M(skin), [s * .11, -.005, -.005], null, [.45, .8, .7], false));
    put(face, box(.008, .018, .01), M(new T.Color(skin).multiplyScalar(.8).getStyle()), [0, -.03, .111], [-.3, 0, 0], null, false);
    // arms
    const arm = s => { const n = s < 0 ? 'L' : 'R';
      const sh = joint(spine, s * .19, .265, 0, 'sh' + n, bones); sh.userData.rest = [0, 0, s * .09];
      put(sh, sph(.058, 12, 10), mat('upper'), null, null, null, false);
      put(sh, limbGeo(.27, .052, .042, .008, .35), mat('upper'));
      const el = joint(sh, 0, -.27, 0, 'el' + n, bones);
      put(el, limbGeo(.24, .043, .033, .007, .3), mat('fore'));
      const wr = joint(el, 0, -.245, 0, 'wr' + n, bones);
      const hm = spec.hand === 'skin' ? M(skin) : mat('hand');
      put(wr, sph(.04, 12, 10), hm, [0, -.045, .005], null, [.78, 1.25, .62]);
      put(wr, limbGeo(.05, .013, .011), hm, [s * -.03, -.02, .022], [0, 0, s * .6], null, false);
      put(wr, box(.06, .035, .045), hm, [0, -.095, .006], [.25, 0, 0], null, false);
      const hand = new T.Group(); hand.position.set(0, -.08, .01); wr.add(hand); bones['hand' + n] = hand;
      if (spec.wideSleeves) { put(sh, limbGeo(.26, .065, .1, 0), M(spec.wideSleeves), [0, -.02, 0], null, null, true); put(el, limbGeo(.17, .1, .14, 0), M(spec.wideSleeves), [0, 0, 0], null, null, true); }
    };
    arm(-1); arm(1);
    // legs
    const leg = s => { const n = s < 0 ? 'L' : 'R', loose = spec.looseLegs ? 1.18 : 1;
      const th = joint(hips, s * .095, -.05, 0, 'th' + n, bones);
      put(th, limbGeo(.43, .075 * loose, .053 * loose, .012, .25), mat('thigh'));
      const kn = joint(th, 0, -.43, 0, 'kn' + n, bones);
      put(kn, limbGeo(.42, .054 * loose, .036 * (spec.looseLegs ? 1.3 : 1), .013, .3), mat('shin'));
      const an = joint(kn, 0, -.42, 0, 'an' + n, bones);
      put(an, sph(.05, 14, 10), mat('foot'), [0, -.035, .045], null, [.95, .7, 2.1]);
      put(an, sph(.036, 10, 8), mat('foot'), [0, -.048, .125], null, [1.1, .6, 1.2], false);
      const ft = new T.Group(); ft.position.set(0, -.07, .07); an.add(ft); bones['foot' + n] = ft;
    };
    leg(-1); leg(1);

    /* ----- outfit kit ----- */
    const k = {
      skirt(col, r0, r1, len) { put(hips, cyl(r0, r1, len, 16, true), M(col, { side: T.DoubleSide }), [0, -.1 - len / 2 + .04, 0], null, [1, 1, .75], false); },
      sash(col) { const cm = M(new T.Color(col).getStyle ? new T.Color(col).getStyle() : col); put(hips, tor(.15, .022, 6, 22), cm, [0, .055, 0], [Math.PI / 2, 0, 0], [1, .73, 1], false); put(hips, box(.04, .16, .014), cm, [.1, -.03, .1], [0, 0, .25], null, false); },
      wraps(col) { ['knL', 'knR'].forEach(n => put(bones[n], cyl(.042, .042, .05, 10), M(col), [0, -.39, 0], null, null, false)); },
      pouch() { put(hips, box(.07, .07, .05), M('#6b4a2e'), [-.155, -.02, .03]); },
      chestPanels(col) { [-1, 1].forEach(s => put(spine, box(.085, .1, .025), M(col), [s * .058, .2, .112], [0, s * .32, 0], null, false)); },
      scarf(col) { const m = M(col); put(neck, tor(.068, .035, 8, 16), m, [0, .0, 0], [Math.PI / 2, 0, 0]); const t1 = new T.Group(); t1.position.set(.03, 0, -.07); neck.add(t1); put(t1, box(.055, .28, .012), m, [0, -.14, 0], null, null, false); const t2 = new T.Group(); t2.position.set(-.03, 0, -.07); neck.add(t2); put(t2, box(.05, .22, .012), m, [0, -.11, 0], null, null, false); anim.push((dt, t) => { t1.rotation.x = .55 + .18 * Math.sin(t * 7); t2.rotation.x = .45 + .15 * Math.sin(t * 6 + 1); }); },
      belt(col) { put(hips, tor(.148, .018, 6, 22), M(col), [0, .07, 0], [Math.PI / 2, 0, 0], [1, .73, 1], false); put(hips, box(.04, .032, .015), M('#d9a63f'), [0, .07, .112], null, null, false); },
      holster() { put(bones.thR, tor(.077, .01, 6, 16), M('#2a2018'), [0, -.16, 0], [Math.PI / 2, 0, 0], null, false); put(bones.thR, box(.04, .1, .035), M('#2a2018'), [.075, -.17, .01]); put(bones.thR, tor(.014, .005, 5, 10), M('#6b7078'), [.075, -.1, .01], null, null, false); },
      beads() { for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; put(spine, sph(.014, 8, 6), M('#2a1d17'), [.14 * Math.sin(a), .3 - .12 * Math.max(0, Math.cos(a)), .1 * Math.cos(a) + .01], null, null, false); } },
      robeSkirt(col, len, trim) { const m = M(col, { side: T.DoubleSide });
        [-1, 1].forEach(s => { const th = bones[s < 0 ? 'thL' : 'thR']; put(th, cyl(.1, .15, len, 12, true, s < 0 ? Math.PI * .1 : -Math.PI * .6, Math.PI * 1.5), m, [s * .01, -len / 2 + .05, .01], null, null, false);
          if (trim) put(th, cyl(.151, .151, .03, 12, true, s < 0 ? Math.PI * .1 : -Math.PI * .6, Math.PI * 1.5), M(trim, { side: T.DoubleSide }), [s * .01, -len + .065, .01], null, null, false); });
        put(hips, cyl(.15, .24, len + .05, 14, true, Math.PI * .55, Math.PI * .9), m, [0, -len / 2 - .02, -.02], null, [1, 1, .8], false); },
      vest(c) { put(spine, lathe([[.135, -.01], [.142, .06], [.17, .16], [.186, .24], [.15, .3]], 16, .35, Math.PI * 2 - .7), M(c.c, { side: T.DoubleSide }), null, null, [1, 1, .7], false);
        const t = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); drawGlyph(g, Object.assign({}, c, { ink: c.c2 }), 64, 64, .5); }); const p = new T.Mesh(new T.PlaneGeometry(.09, .09), new T.MeshBasicMaterial({ map: t, transparent: true })); p.position.set(-.075, .2, .125); p.rotation.y = -.35; spine.add(p);
        [-1, 1].forEach(s => put(bones['sh' + (s < 0 ? 'L' : 'R')], sph(.07, 12, 8, ), M(c.c), [0, .01, 0], null, [1, .55, 1], false)); },
      shinGuards(col) { ['knL', 'knR'].forEach(n => put(bones[n], box(.07, .24, .03), M(col), [0, -.2, .045], [-.05, 0, 0])); },
      coat(col, lining, len, flared) { const om = M(col, { side: T.DoubleSide }), lm = M(lining, { side: T.BackSide });
        put(spine, lathe([[.14, -.04], [.145, .06], [.172, .16], [.19, .24], [.18, .29], [.13, .325]], 18, .5, Math.PI * 2 - 1.0), om, null, null, [1, 1, .72], false);
        [-1, 1].forEach(s => { const th = bones[s < 0 ? 'thL' : 'thR']; const ts = s < 0 ? -Math.PI * .05 : -Math.PI * .45, tl = Math.PI * .5;
          const g = cyl(.11, flared ? .19 : .15, len, 10, true, ts, tl); put(th, g, om, [s * .03, -len / 2 + .06, 0], null, null, false); put(th, g, lm, [s * .03, -len / 2 + .06, 0], null, [.97, 1, .97], false); });
        const bg = cyl(.16, flared ? .3 : .25, len + .04, 14, true, Math.PI * .6, Math.PI * .8); put(hips, bg, om, [0, -len / 2, -.02], null, [1, 1, .85], false); put(hips, bg, lm, [0, -len / 2, -.02], null, [.97, 1, .82], false);
        put(neck, tor(.075, .03, 8, 18), M(col), [0, -.01, .0], [Math.PI / 2 + .3, 0, 0], [1, .85, 1]); },
      halfMask(col) { const m = new T.Mesh(new T.SphereGeometry(.116, 22, 14, Math.PI / 2 - 1.2, 2.4, Math.PI * .56, Math.PI * .3), M(col)); m.scale.set(1.02, 1.06, 1.03); face.add(m); },
      backSymbol(c) { const t = canvasTex(256, 256, (x, w, h) => { x.fillStyle = c.c; x.beginPath(); x.arc(w / 2, h / 2, 120, 0, 7); x.fill(); x.strokeStyle = c.c2; x.lineWidth = 10; x.stroke(); drawGlyph(x, c, w / 2, h / 2, .85); });
        const p = new T.Mesh(new T.PlaneGeometry(.17, .17), new T.MeshBasicMaterial({ map: t, transparent: true })); p.position.set(0, .2, -.132); p.rotation.y = Math.PI; spine.add(p); },
      vestBands(col) { [.13, .19, .25].forEach(y => put(spine, box(.17, .016, .02), M(col), [0, y, .118], null, null, false)); },
      strawHat() { put(face, cone(.24, .1, 24), M('#c9a45c'), [0, .14, 0]); put(face, cyl(.08, .09, .04, 16), M('#3a1410'), [0, .1, 0], null, null, false); },
      hood(col) { put(face, new T.SphereGeometry(.135, 20, 14, Math.PI / 2 + .8, Math.PI * 2 - 1.6, 0, Math.PI * .72), M(col, { side: T.DoubleSide }), [0, .01, -.012], null, [1.02, 1.08, 1.06], false); },
      plateArmor(col, accent) { const m = M(col); put(spine, lathe([[.15, .1], [.18, .17], [.19, .24], [.165, .29]], 16, -.9, 1.8), m, [0, 0, .006], null, [1, 1, .74], false);
        [-1, 1].forEach(s => { put(bones['sh' + (s < 0 ? 'L' : 'R')], new T.SphereGeometry(.085, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5), m, [s * .015, .01, 0], [0, 0, -s * .3], [1, .8, 1]); put(bones['th' + (s < 0 ? 'L' : 'R')], box(.13, .14, .1), m, [s * .02, -.03, .02], [0, 0, -s * .1]); });
        if (accent) put(spine, box(.06, .06, .02), M(accent), [0, .2, .13], [0, 0, Math.PI / 4], null, false); },
      cape(col, len) { const g = new T.Group(); g.position.set(0, .3, -.11); spine.add(g); put(g, new T.PlaneGeometry(.36, len + .4), M(col, { side: T.DoubleSide }), [0, -(len + .4) / 2, 0], null, null, false); anim.push((dt, t) => { g.rotation.x = .12 + .05 * Math.sin(t * 2.5); }); },
      furCloak() { const g = new T.Group(); g.position.set(0, .3, -.11); spine.add(g); put(g, new T.PlaneGeometry(.42, .9), M('#141010', { side: T.DoubleSide }), [0, -.45, 0], null, null, false);
        for (let i = 0; i < 14; i++) { const a = i / 13 * Math.PI; put(spine, cone(.035, .09, 5), M('#1e1716'), [Math.cos(a) * .17, .31 + Math.sin(a) * .02, -.02 - Math.sin(a) * .1], [Math.PI * .5, 0, Math.cos(a) * .8], null, false); }
        anim.push((dt, t) => { g.rotation.x = .1 + .04 * Math.sin(t * 2); }); },
      horns() { [-1, 1].forEach(s => { const h = put(face, cone(.02, .1, 6), M('#e8dcc8'), [s * .07, .12, .02], null, null, true); h.rotation.set(-.2, 0, -s * .5); }); },
      collar(col) { put(neck, cyl(.09, .065, .11, 18, true), M(col, { side: T.DoubleSide }), [0, .02, 0], null, null, false); put(neck, tor(.09, .007, 5, 22), M('#d9a63f'), [0, .075, 0], [Math.PI / 2, 0, 0], null, false); },
      scroll() { const s = new T.Group(); s.position.set(0, .15, 0); spine.add(s); const t = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2a1e'; for (let i = 0; i < 22; i++) for (let j = 0; j < 4; j++) if ((i * 7 + j * 3) % 5) x.fillRect(20 + i * 22, 18 + j * 26, 10, 14); x.strokeStyle = '#b3261e'; x.lineWidth = 5; x.strokeRect(4, 4, w - 8, h - 8); });
        s.add(new T.Mesh(cyl(.5, .5, .2, 28, true, 0, 1.5), new T.MeshToonMaterial({ map: t, gradientMap: gradMap(), side: T.DoubleSide })));
        [0, 1.5].forEach(a => put(s, cyl(.02, .02, .25, 8), M('#5a2a1a'), [.5 * Math.sin(a), 0, .5 * Math.cos(a)]));
        anim.push((dt, t) => { s.rotation.y = Math.PI - .75 + Math.sin(t * .5) * .9; s.position.y = .15 + Math.sin(t * 1.1) * .03; }); },
    };
    spec.extra(bones, k);

    /* ----- face ----- */
    const irisCol = o.eyes === 'glow' ? null : (o.iris || ['#3a2a1e', '#1f5f9e', '#5a2a8a', '#2f6b3a', '#7a4a1a'][o.clan == null ? 2 : o.clan]);
    const F = { eyes: [], brows: [], cur: { bl: 0, by: 0, eo: 1, mo: 0, mw: 1, sweat: 0 } };
    [-1, 1].forEach(s => { const eg = new T.Group(); eg.position.set(s * .043, .004, .096); eg.rotation.y = s * .28; face.add(eg);
      const sc = new T.Mesh(sph(.025, 14, 10), B('#f4efe6')); sc.scale.set(1, 1.3, .32); eg.add(sc);
      const irisM = o.eyes === 'glow' ? new T.MeshBasicMaterial({ color: new T.Color().setRGB(3.2, 1.6, .5) }) : B(irisCol);
      const ir = new T.Mesh(sph(.018, 14, 10), irisM); ir.scale.set(.86, 1.22, .34); ir.position.z = .004; eg.add(ir);
      const pu = new T.Mesh(sph(.008, 10, 8), B('#0a0706')); pu.scale.set(1, 1.25, .4); pu.position.z = .007; eg.add(pu);
      const hl = new T.Mesh(sph(.0052, 8, 6), B('#ffffff')); hl.position.set(-.006, .011, .01); eg.add(hl);
      const lash = new T.Mesh(box(.054, .009, .012), B('#120c09')); lash.position.set(0, .03, .006); lash.rotation.z = s * -.12; eg.add(lash);
      F.eyes.push({ g: eg, lash });
      const bp = new T.Group(); bp.position.set(s * .045, .063, .1); face.add(bp); const br = new T.Mesh(box(.05, .01, .012), B(new T.Color(hairCol).multiplyScalar(.6).getStyle())); bp.add(br); F.brows.push({ g: bp, s, y: bp.position.y }); });
    const mg = new T.Group(); mg.position.set(0, -.058, .088); face.add(mg);
    const mi = new T.Mesh(sph(.018, 14, 10), B('#3a0f0c')); mi.scale.set(1, .18, .3); mg.add(mi);
    const te = new T.Mesh(box(.026, .006, .004), B('#ffffff')); te.position.set(0, .006, .005); mg.add(te);
    F.mouth = mi; F.teeth = te;
    const sw = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(64, 64, g => { g.fillStyle = '#8fd3ff'; g.strokeStyle = '#1d5f8a'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 5); g.bezierCurveTo(52, 36, 52, 60, 32, 60); g.bezierCurveTo(12, 60, 12, 36, 32, 5); g.fill(); g.stroke(); }), transparent: true }));
    sw.scale.setScalar(.05); sw.position.set(-.115, .06, .06); sw.visible = false; face.add(sw); F.sweat = sw;
    const EX = { neutral: { bl: 0, by: 0, eo: 1, mo: 0, mw: 1 }, smirk: { bl: -.12, by: .004, eo: .72, mo: .12, mw: 1.25 }, angry: { bl: .45, by: -.008, eo: .7, mo: .15, mw: 1.1 },
      shout: { bl: .5, by: -.01, eo: .95, mo: 1, mw: 1.35 }, pain: { bl: -.4, by: .008, eo: .12, mo: .6, mw: 1.25, sweat: 1 }, shock: { bl: -.35, by: .016, eo: 1.4, mo: .7, mw: .8, sweat: 1 },
      focus: { bl: .3, by: -.005, eo: .82, mo: 0, mw: .9 }, happy: { bl: -.22, by: .01, eo: .45, mo: .5, mw: 1.35 }, grit: { bl: .45, by: -.008, eo: .6, mo: .28, mw: 1.4 } };
    let exName = 'neutral', talk = 0;
    F.set = (n) => { exName = EX[n] ? n : 'neutral'; }; F.talk = a => { talk = a; };
    F.update = (dt, t) => { const tg = EX[exName], c = F.cur, kk = Math.min(1, dt * 14);
      ['bl', 'by', 'eo', 'mo', 'mw', 'sweat'].forEach(x => { c[x] += ((tg[x] || 0) - c[x]) * kk; });
      let mo = c.mo; if (talk > .04) mo = Math.max(mo * .4, Math.min(1, talk * 1.3));
      const blink = (t % 3.3) < .1 && c.eo > .3 ? .1 : 1;
      F.eyes.forEach(e => { e.g.scale.y = Math.max(.08, c.eo) * blink; });
      F.brows.forEach(b => { b.g.rotation.z = b.s * c.bl; b.g.position.y = b.y + c.by; });
      mi.scale.set(.7 + .45 * c.mw, .16 + 1.15 * mo, .3); te.visible = mo > .35 && exName !== 'pain'; sw.visible = c.sweat > .5; };

    /* ----- hair ----- */
    const hm = M(hairCol), style = o.hair || ['spiky', 'swept', 'tall', 'bun'][rank];
    if (!/Ronin|Hunter/.test(outfitName)) {
      put(face, new T.SphereGeometry(.12, 22, 14, 0, Math.PI * 2, 0, Math.PI * .5), hm, [0, .012, -.006], null, [1.03, 1.12, 1.08]);
      put(face, new T.SphereGeometry(.116, 20, 14, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, Math.PI * .78), hm, [0, -.004, -.008], null, [1.05, 1.1, 1.08]);
      const H = new V3(0, .02, -.01);
      const strand = (d, r, h) => { const D = new V3(...d).normalize(), b = H.clone().addScaledVector(D, .09); const m = put(face, cone(r, h, 7), hm, [b.x + D.x * h * .5, b.y + D.y * h * .5, b.z + D.z * h * .5]); aim(m, d); };
      const bangs = (n, len) => { for (let i = 0; i < n; i++) { const x = (i / (n - 1) - .5) * .15; const m = put(face, cone(.024, len, 6), hm, [x, .07, .1 - Math.abs(x) * .25]); m.rotation.set(Math.PI * .82, 0, -x * 3.2); } };
      const side = (len) => [-1, 1].forEach(s => { const m = put(face, cone(.022, len, 6), hm, [s * .1, -.03, .03]); m.rotation.set(Math.PI, 0, s * .12); });
      if (style === 'spiky') { [[0, 1, -.3], [.55, .8, -.4], [-.55, .8, -.4], [.85, .4, -.3], [-.85, .4, -.3], [.3, .55, -.9], [-.3, .55, -.9], [0, .25, -1], [.6, 0, -.8], [-.6, 0, -.8]].forEach(d => strand(d, .042, .1 + R() * .05)); bangs(5, .075); side(.07); }
      if (style === 'swept') { [[0, .6, -.8], [.35, .5, -.8], [-.35, .5, -.8], [.2, .15, -1], [-.2, .15, -1], [.6, .3, -.6], [-.6, .3, -.6]].forEach(d => strand(d, .042, .13 + R() * .04)); bangs(3, .06); const p = put(face, limbGeo(.2, .035, .012), hm, [0, -.01, -.12]); p.rotation.x = .5; side(.09); }
      if (style === 'tall') { [[0, 1, -.15], [.35, 1, -.2], [-.35, 1, -.2], [.7, .75, -.25], [-.7, .75, -.25], [.2, .8, -.6], [-.2, .8, -.6], [.9, .35, -.3], [-.9, .35, -.3], [0, .5, -.9]].forEach(d => strand(d, .045, .16 + R() * .07)); bangs(4, .07); }
      if (style === 'long') { put(face, box(.21, .36, .06), hm, [0, -.13, -.1], [.1, 0, 0]); put(face, box(.17, .2, .05), hm, [0, -.33, -.12], [.18, 0, 0]); bangs(5, .07); side(.17); }
      if (style === 'short') { bangs(5, .05); }
      if (style === 'bun') { put(face, sph(.05, 14, 10), hm, [0, .13, -.04]); put(face, tor(.022, .006, 5, 12), M('#d9a63f'), [0, .175, -.04], [Math.PI / 2, 0, 0], null, false); put(face, box(.18, .3, .05), hm, [0, -.1, -.1], [.12, 0, 0]); bangs(4, .05); }
    }
    /* ----- rank markers ----- */
    if (rank < 3) { const cloth = M(rank === 0 ? '#2b3240' : '#15161a', { side: T.DoubleSide });
      put(face, cyl(.117, .117, .03, 26, true), cloth, [0, .046, 0], null, [1, 1, 1.02], false);
      const pm = M('#6b7078'), plate = new T.Mesh(box(.072, .034, .009), [pm, pm, pm, pm, M('#ffffff', { map: plateTex(['steel', 'bronze', 'silver'][rank]) }), pm]); plate.position.set(0, .046, .114); plate.add(new T.Mesh(plate.geometry, OUT)); face.add(plate);
      if (rank === 2) put(face, box(.08, .042, .006), M('#d9a63f'), [0, .046, .11], null, null, false);
      [[.02, .2], [-.02, -.15]].forEach(([x, rz]) => put(face, box(.022, .12, .006), cloth, [x, -.01, -.118], [.35, 0, rz], null, false)); }
    else { put(face, tor(.116, .008, 6, 30), M('#d9a63f', { emissive: '#3a2405' }), [0, .05, 0], [Math.PI / 2, 0, 0], null, false); const pk = put(face, cone(.022, .05, 4), M('#d9a63f', { emissive: '#3a2405' }), [0, .085, .11]); pk.rotation.y = Math.PI / 4; }
    { const band = put(bones.shL, cyl(.056, .056, .055, 14, true), M(rank === 3 ? '#d9a63f' : '#17181c', { side: T.DoubleSide }), [0, -.09, 0], null, null, false);
      for (let i = 0; i < (rank === 3 ? 0 : rank); i++) put(bones.shL, tor(.057, .005, 4, 18), M('#d9a63f'), [0, -.075 - i * .02, 0], [Math.PI / 2, 0, 0], null, false); }

    /* ----- weapon ----- */
    const W = o.weapon, metal = M('#8d939c'), dark = M('#1c1c20'), wood = M('#6b4a2e');
    if (W === 'Kunai & shuriken' || (!W && rank === 0)) { const g = new T.Group(); g.position.set(.075, -.2, .03); bones.thR.add(g); put(g, cone(.02, .09, 4), metal, [0, -.06, 0], [Math.PI, 0, 0]); put(g, cyl(.008, .008, .07, 6), dark, [0, .02, 0]); put(g, tor(.014, .004, 4, 10), metal, [0, .065, 0]);
      const st = new T.Group(); st.position.set(-.155, .02, -.02); hips.add(st); for (let i = 0; i < 4; i++) put(st, box(.006, .07, .016), metal, [0, 0, 0], [0, 0, i * Math.PI / 4], null, false); }
    if (W === 'Bo staff') put(spine, cyl(.014, .014, 1.5, 8), wood, [0, .15, -.15], [0, 0, .65]);
    if (W === 'Odachi' || (!W && rank === 2)) { const g = new T.Group(); g.position.set(0, .16, -.16); g.rotation.z = .62; spine.add(g); put(g, box(.022, W === 'Odachi' ? 1.0 : .7, .04), dark, [0, -.1, 0]); put(g, cyl(.017, .017, .18, 8), M('#2a1a14'), [0, W === 'Odachi' ? .48 : .33, 0]); put(g, box(.07, .012, .05), M('#d9a63f'), [0, W === 'Odachi' ? .38 : .23, 0], null, null, false); }
    if (W === 'Kusarigama') { const g = new T.Group(); g.position.set(-.16, -.02, 0); hips.add(g); put(g, cyl(.012, .012, .2, 6), wood, [0, 0, 0]); put(g, box(.12, .02, .008), metal, [.05, .09, 0], [0, 0, -.3]); put(g, tor(.05, .008, 5, 14), metal, [0, -.11, 0], [Math.PI / 2, 0, 0]); }
    if (W === 'War fan') { const g = new T.Group(); g.position.set(0, .2, -.15); spine.add(g); put(g, new T.CylinderGeometry(.32, .32, .02, 16, 1, false, -.9, 1.8), M('#9b2a22'), [0, 0, 0], [Math.PI / 2, 0, 0]); }
    if (W === 'Twin sai') [-1, 1].forEach(s => { const g = new T.Group(); g.position.set(s * .07, .02, -.12); g.rotation.z = s * .5; hips.add(g); put(g, cyl(.008, .008, .3, 6), metal, [0, 0, 0]); put(g, box(.1, .008, .008), metal, [0, .08, 0]); });
    if (W === 'Summoning scroll') { put(spine, cyl(.07, .07, .6, 16), M('#d9c9a2'), [0, .2, -.17], [0, 0, Math.PI / 2]); [-1, 1].forEach(s => put(spine, cyl(.08, .08, .03, 16), M('#9b2a22'), [s * .31, .2, -.17], [0, 0, Math.PI / 2], null, false)); }

    /* ----- extras ----- */
    if (o.scarf && !/Shadow Runner/.test(outfitName)) k.scarf(clan.c);
    if (o.mask) { const mk = new T.Group(); if (o.maskOn) mk.position.set(0, -.005, .135); else { mk.position.set(.1, .03, .02); mk.rotation.set(0, 1.15, -.15); } face.add(mk);
      const base = o.mask === 'Oni mask' ? '#b3261e' : o.mask === 'Crow mask' ? '#151515' : '#f2ede4';
      put(mk, new T.SphereGeometry(.09, 18, 12, Math.PI / 2 - .9, 1.8, Math.PI * .25, Math.PI * .5), M(base, { side: T.DoubleSide }), [0, 0, -.06], null, [1, 1.1, .7], false);
      const t = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = o.mask === 'Crow mask' ? '#e7b54a' : '#111'; g.beginPath(); g.ellipse(40, 56, 14, 7, -.3, 0, 7); g.ellipse(88, 56, 14, 7, .3, 0, 7); g.fill();
        if (o.mask === 'Fox mask') { g.strokeStyle = '#d4452f'; g.lineWidth = 5; [[30, 76, 44, 70], [98, 76, 84, 70], [64, 24, 64, 42]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }); }
        if (o.mask === 'Oni mask') { g.fillStyle = '#fff'; g.fillRect(44, 88, 40, 10); } });
      const dec = new T.Mesh(new T.PlaneGeometry(.11, .11), new T.MeshBasicMaterial({ map: t, transparent: true })); dec.position.set(0, 0, .03); mk.add(dec);
      if (o.mask === 'Fox mask') [-1, 1].forEach(s => put(mk, cone(.02, .05, 4), M('#f2ede4'), [s * .045, .06, 0], [0, 0, -s * .3]));
      if (o.mask === 'Oni mask') [-1, 1].forEach(s => put(mk, cone(.012, .05, 5), M('#e8dcc8'), [s * .035, .065, 0], [0, 0, -s * .4]));
      if (o.mask === 'Crow mask') put(mk, cone(.02, .08, 6), M('#e7b54a'), [0, -.01, .06], [Math.PI / 2, 0, 0]); }
    let aura = null;
    if (o.aura || rank === 3) { const N = 90, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), data = [];
      const c1 = rank === 3 && !o.aura ? new T.Color().setRGB(2.4, 1.7, .5) : new T.Color(clan.c2).multiplyScalar(2.2);
      for (let i = 0; i < N; i++) { data.push({ a: R() * 7, r: .22 + R() * .3, y: R() * 1.9, v: .15 + R() * .35 }); col.set([c1.r, c1.g, c1.b], i * 3); }
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
      aura = new T.Points(geo, new T.PointsMaterial({ size: .05, map: glow(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); root.add(aura);
      anim.push((dt, t) => { const p = geo.attributes.position; data.forEach((d, i) => { d.y += dt * d.v; if (d.y > 2) d.y = 0; const a = d.a + t * .3; p.setXYZ(i, Math.sin(a) * d.r, d.y + .05, Math.cos(a) * d.r * .8); }); p.needsUpdate = true; }); }

    /* ----- shadows + pose API ----- */
    root.traverse(m => { if (m.isMesh && m.material !== OUT) { m.castShadow = true; m.receiveShadow = true; } });
    Object.values(bones).forEach(b => { if (!b.userData.rest) b.userData.rest = [0, 0, 0]; b.userData.cur = [0, 0, 0]; });
    const JOINTS = ['hips', 'spine', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR', 'thL', 'knL', 'anL', 'thR', 'knR', 'anR'];
    function setPose(p, k = 1) { JOINTS.forEach(j => { const b = bones[j]; if (!b) return; const v = (p && p[j]) || [0, 0, 0], c = b.userData.cur, r = b.userData.rest;
      for (let i = 0; i < 3; i++) c[i] += (v[i] - c[i]) * k; b.rotation.set(r[0] + c[0], r[1] + c[1], r[2] + c[2]); }); }
    setPose(null, 1);
    function update(dt, t) { anim.forEach(f => f(dt, t)); F.update(dt, t); }
    return { group: root, bones, face: F, setPose, update, JOINTS, outfit: outfitName, rank, clan: o.clan == null ? 2 : o.clan };
  }
  return { build, CLANS, OUTFITS, RANK_OUTFIT, SKINS, HAIRS, HAIRSTYLES, drawGlyph, canvasTex, glow, M, OUT };
})();
