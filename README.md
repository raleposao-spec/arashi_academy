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
