// node tools/thumbs.js <three-package-dir> [slug ...]  -> writes assets/items/<slug>.webp
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [pkg, ...only] = process.argv.slice(2), root = path.join(__dirname, '..'), out = path.join(root, 'assets/items'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 512, height: 512 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('**/*', r => { const u = r.request().url(); const m = u.match(/three@0\.147\.0\/(.*)$/); if (m) return r.fulfill({ path: path.join(pkg, m[1]), contentType: 'text/javascript' }); if (u.startsWith('http://x/')) return r.fulfill({ path: path.join(root, decodeURIComponent(u.slice(9).split('?')[0])) }); return r.abort(); });
  await p.goto('http://x/tools/thumbs.html'); await p.waitForFunction(() => window.__done, null, { timeout: 120000, polling: 500 });
  const slugs = only.length ? only : await p.evaluate(() => window.__slugs);
  for (const s of slugs) { const url = await p.evaluate(s => window.shot(s), s); if (!url) { console.log('skip', s); continue; } fs.writeFileSync(path.join(out, s + '.webp'), Buffer.from(url.split(',')[1], 'base64')); console.log('ok', s); }
  await b.close();
})();
