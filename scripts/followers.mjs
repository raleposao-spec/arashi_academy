#!/usr/bin/env node
// Arashi Academy follower roster (data/followers.json). Seats never move once given.
//
//   node scripts/followers.mjs add <followers_1.json | followers_1.html | list.txt> [--dry-run] [--newest-first]
//   node scripts/followers.mjs rank <handle> <0-3> [--dry-run]     0 Genin · 1 Chunin · 2 Jonin · 3 Sennin
//   node scripts/followers.mjs stats
//
// Best source: Instagram → Accounts Center → Your information and permissions → Download your information →
// Followers and following, format JSON. The file is connections/followers_and_following/followers_1.json.
// A plain text file with one @handle per line also works (oldest first unless --newest-first).
// The first real import replaces the demo roster.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'followers.json');

// Stand layout — must match index.html (R0, D, ROWS, GAP, sectors) and the 24 lodge seats.
const DEG = Math.PI / 180, R0 = 34, D = 0.95, ROWS = 36, GAP = 4 * DEG, SPAN = 72 * DEG - 2 * GAP;
const rowCap = row => Math.floor((R0 + (row - 1) * D + 0.22) * SPAN / 0.5);   // seats in row 1..36 of one clan stand
const ZONES = { 0: [18, 36], 1: [8, 17], 2: [1, 7] };                          // rank → rows (front = 1)
const LODGE_SEATS = 24;
const VALID = /^[a-z0-9._]{1,30}$/;

// ---------- reading follower files ----------
function readHandles(file, newestFirst) {
  const text = readFileSync(file, 'utf8');
  let list = [];
  if (/\.json$/i.test(file)) {
    const j = JSON.parse(text);
    const arr = Array.isArray(j) ? j : (j.relationships_followers || Object.values(j).find(Array.isArray) || []);
    for (const e of arr) {
      const s = (e.string_list_data || [])[0] || {};
      const h = s.value || e.title || (s.href || '').split('/').filter(Boolean).pop();
      if (h) list.push({ h, t: s.timestamp || 0 });
    }
    if (list.some(x => x.t)) list.sort((a, b) => a.t - b.t);   // oldest follower first
    else list.reverse();                                        // exports list newest first
    return list.map(x => x.h);
  }
  if (/\.html?$/i.test(file)) {
    const re = /instagram\.com\/(?:_u\/)?([A-Za-z0-9._]{1,30})/g; let m;
    while ((m = re.exec(text))) list.push(m[1]);
    return list.reverse();                                      // the HTML export is newest first too
  }
  // plain text / copied from the Instagram app: one handle per line; skip buttons and display names
  const SKIP = new Set(['follow', 'following', 'remove', 'message', 'requested', 'followers']);
  for (let line of text.split(/\r?\n/)) {
    line = line.trim().replace(/^@/, '');
    if (!line || /\s/.test(line) || SKIP.has(line.toLowerCase()) || /profile picture$/i.test(line)) continue;
    list.push(line);
  }
  return newestFirst ? list.reverse() : list;
}

// ---------- seats ----------
function freeSeatFinder(people) {
  const taken = new Set(people.map(p => `${p[2] === 3 ? 'L' : p[1]}:${p[3]}:${p[4]}`));
  return function next(rank, clan) {
    if (rank === 3) { for (let s = 1; s <= LODGE_SEATS; s++) if (!taken.has(`L:0:${s}`)) { taken.add(`L:0:${s}`); return [0, s]; } return null; }
    const [a, b] = ZONES[rank];
    for (let row = a; row <= b; row++) for (let s = 1; s <= rowCap(row); s++) {
      const k = `${clan}:${row}:${s}`; if (!taken.has(k)) { taken.add(k); return [row, s]; }
    }
    return null;
  };
}
// new followers go to the clan stand with the most room in their rank's zone (keeps the stands even)
function pickClan(people, rank) {
  const n = [0, 0, 0, 0, 0]; people.forEach(p => { if (p[2] === rank) n[p[1]]++; });
  return n.indexOf(Math.min(...n));
}

// ---------- main ----------
const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter(a => a.startsWith('--'))), args = rest.filter(a => !a.startsWith('--'));
let db = JSON.parse(readFileSync(DATA, 'utf8'));
const save = () => { if (flags.has('--dry-run')) return console.log('(dry run, nothing saved)'); db.updated = new Date().toISOString().slice(0, 10); writeFileSync(DATA, JSON.stringify(db)); console.log('Saved', DATA); };

if (cmd === 'add') {
  if (!args[0]) { console.error('Usage: node scripts/followers.mjs add <file> [--dry-run] [--newest-first]'); process.exit(1); }
  if (db.demo) { console.log(`Replacing the demo roster (${db.people.length} made-up followers) with real ones.`); db = { fields: 7, demo: false, people: [] }; }
  const have = new Set(db.people.map(p => p[0]));
  const handles = readHandles(args[0], flags.has('--newest-first')).map(h => h.toLowerCase()).filter(h => VALID.test(h));
  const next = freeSeatFinder(db.people);
  let added = 0, full = 0;
  for (const h of handles) {
    if (have.has(h)) continue;
    const clan = pickClan(db.people, 0), seat = next(0, clan);
    if (!seat) { full++; continue; }
    db.people.push([h, clan, 0, seat[0], seat[1], 0, 0]); have.add(h); added++;
  }
  console.log(`Read ${handles.length} handles · ${added} new seats · ${handles.length - added - full} already seated${full ? ` · ${full} without a seat (Genin stands full)` : ''} · total ${db.people.length}`);
  save();
} else if (cmd === 'rank') {
  const h = (args[0] || '').toLowerCase().replace(/^@/, ''), rank = +args[1];
  if (!VALID.test(h) || !(rank >= 0 && rank <= 3)) { console.error('Usage: node scripts/followers.mjs rank <handle> <0-3>'); process.exit(1); }
  let i = db.people.findIndex(p => p[0] === h);
  const rec = i >= 0 ? db.people.splice(i, 1)[0] : [h, pickClan(db.people, rank), 0, 0, 0, 0, 0];
  const seat = freeSeatFinder(db.people)(rank, rec[1]);
  if (!seat) { console.error('No free seat left for that rank.'); process.exit(1); }
  rec[2] = rank; rec[3] = seat[0]; rec[4] = seat[1];
  db.people.push(rec);
  console.log(`@${h} → ${['Genin', 'Chunin', 'Jonin', 'Sennin'][rank]}, ${rank === 3 ? "Master's lodge" : `stand ${rec[1]}, row ${seat[0]}`}, seat ${seat[1]}`);
  save();
} else if (cmd === 'stats') {
  const r = [0, 0, 0, 0]; db.people.forEach(p => r[p[2]]++);
  const cap = z => 5 * Array.from({ length: z[1] - z[0] + 1 }, (_, k) => rowCap(z[0] + k)).reduce((a, b) => a + b, 0);
  console.log(`${db.demo ? 'DEMO roster' : 'Real roster'} · ${db.people.length} followers · updated ${db.updated || '—'}`);
  ['Genin', 'Chunin', 'Jonin'].forEach((n, k) => console.log(`  ${n}: ${r[k]} / ${cap(ZONES[k])} seats`));
  console.log(`  Sennin: ${r[3]} / ${LODGE_SEATS} lodge seats`);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 11).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}
