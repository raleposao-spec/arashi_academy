# Arashi Academy

The ninja arena where every Instagram follower gets a seat. Original fan-made world, not affiliated with any anime.

## Pages
- `index.html` — the 3D arena. Search a handle to fly to its seat (`index.html?seat=handle` works as a link).
- `ranks.html` — the four ranks in 3D, what each unlocks, and the Join buttons.
- `shop.html` — outfits, jutsu, weapons and extras, locked by rank.
- `ninja.html` — a follower's own ninja: rank, clan, seat, record and gear (`ninja.html?h=handle`).

## Data
- `data/followers.json` — everyone seated. Each row: `[handle, clan, rank, row, seat, wins, losses]`.
  Clan: 0 Ember, 1 Tide, 2 Volt, 3 Gale, 4 Stone. Rank: 0 Genin, 1 Chunin, 2 Jonin, 3 Sennin (row 0, seat = lodge seat).
  The current file is demo data (`"demo": true`).
- `assets/items.js` — the shop catalog.

## Ko-fi
Set `KOFI_USER` in `assets/site.js` to the Ko-fi username. Until then the Join and Buy buttons show "Opens soon".

## Characters, moves and shop art
- `assets/ninja.js` builds every ninja (rank look, outfit, weapon, mask, scarf, aura, hair, face expressions).
- `assets/fight.js` holds the keyframed moves (jabs, kicks, block, hits, backflip, seal, cast…) and the hit effects.
- Shop thumbnails live in `assets/items/<slug>.webp`. Re-render them after changing a look:
  `node tools/thumbs.js <path-to-three@0.147.0-package>` (needs Playwright).
- My Ninja saves each loadout in the visitor's browser (`localStorage`, key `arashi.loadout.<handle>`). Syncing loadouts into the daily fights needs accounts/a database later.

## Seating followers (like a daily roll call)
Instagram has no API for new followers, so the roster is updated from Instagram's own data export:
1. Instagram → Accounts Center → Your information and permissions → Download your information →
   pick the Arashi account → Some of your information → **Followers and following** → Download to device →
   Format **JSON**, date range **All time**. Instagram emails a link when the file is ready.
2. In the ZIP, take `connections/followers_and_following/followers_1.json`.
3. `node scripts/followers.mjs add followers_1.json` (add `--dry-run` first to preview), then push.
New followers get the next free Genin seat in the most empty clan stand; nobody who already has a seat moves.
The first real import replaces the demo roster. Paid ranks: `node scripts/followers.mjs rank <handle> <1-3>`.
`node scripts/followers.mjs stats` shows how full each zone is.
