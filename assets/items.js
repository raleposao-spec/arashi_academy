/* Arashi Academy — everything in the shop. rank: 0 Genin, 1 Chunin, 2 Jonin, 3 Sennin */
window.ITEMS = {
  outfits: [
    ['Academy Gi', 0, 'Dark tunic, cloth headband and white hand wraps.'],
    ['Shadow Runner', 1, 'Tight black suit, short scarf and leather guards.'],
    ['Storm Monk', 1, 'Gray robe with wide sleeves and prayer beads.'],
    ['Clan Vest', 1, 'Vest in your clan color with your element on the chest.'],
    ['Crimson Ronin', 2, 'Red haori, straw hat and torn hems.'],
    ['Mist Hunter', 2, 'Long blue hooded coat and a half mask.'],
    ['Iron Fang', 2, 'Light plate armor and a short cape.'],
    ['Celestial Sage', 3, 'White robe with gold embroidery and a floating scroll.'],
    ['Oni Warlord', 3, 'Dark armor, black fur cloak and red eyes.'],
  ],
  jutsu: {
    Ember: [['Ember Step', 0, 'Short dash that leaves burning embers.'], ['Flame Fang', 1, 'A biting strike wrapped in fire.'], ['Smoke Veil', 1, 'Thick smoke to vanish mid-fight.'], ['Phoenix Dive', 2, 'Diving attack inside a firebird.'], ['Inferno Ring', 2, 'A ring of fire traps the enemy.'], ['Sun Breaker', 3, 'A meteor of flame falls on the arena.']],
    Tide: [['Mist Step', 0, 'Slip through a puff of mist.'], ['Water Whip', 1, 'A lashing whip of pressured water.'], ['Bubble Shield', 1, 'A dome of water that eats a hit.'], ['Tidal Prison', 2, 'A sphere of water locks the enemy in.'], ['Riptide Spiral', 2, 'A spinning current drags them down.'], ['Leviathan Wave', 3, 'A sea serpent of water crashes through.']],
    Volt: [['Spark Step', 0, 'Short teleport in a burst of sparks.'], ['Thunder Palm', 1, 'Palm strike that sends an electric wave.'], ['Chain Lightning', 1, 'Lightning jumping between enemy and ground.'], ['Storm Cage', 2, 'A cage of lightning around the enemy.'], ["Raijin's Drum", 2, 'A drumroll of strikes, each with a flash.'], ["Heaven's Spear", 3, 'Lightning from the sky into the center of the arena.']],
    Gale: [['Wind Step', 0, 'A gust carries you a few meters.'], ['Wind Blade Dance', 1, 'Spinning cuts of sharp wind.'], ['Gust Palm', 1, 'A palm blast that throws the enemy back.'], ['Cyclone Ascent', 2, 'A tornado lifts you and your enemy.'], ['Vacuum Slice', 2, 'An invisible blade of empty air.'], ['Sky Sovereign', 3, 'Command the wind of the whole valley.']],
    Stone: [['Rock Step', 0, 'Stone pillars push you forward.'], ['Earth Wall', 1, 'A wall of rock rises to block.'], ['Stone Fist', 1, 'Your fist turns to granite.'], ['Mountain Fist', 2, 'A giant stone fist bursts from the ground.'], ['Quake Stomp', 2, 'The arena floor splits under them.'], ['Titan Rise', 3, 'A stone giant rises behind you.']],
    Sennin: [['Shadow Bind', 3, 'Rare Shadow element: your shadow holds theirs.'], ['Solar Flare', 3, 'Rare Light element: a blinding burst of light.']],
  },
  weapons: [
    ['Kunai & shuriken', 0, 'The classic pair every student carries.'],
    ['Bo staff', 1, 'Long wooden staff for sweeping strikes.'],
    ['Kusarigama', 1, 'Sickle on a chain, deadly at range.'],
    ['War fan', 2, 'Steel fan that blocks and slashes.'],
    ['Twin sai', 2, 'Pair of daggers for close combat.'],
    ['Summoning scroll', 3, 'Giant scroll that calls your summon.'],
    ['Odachi', 3, 'A long sword taller than you.'],
  ],
  extras: [
    ['Clan scarf', 1, 'Scarf in your clan colors.'],
    ['Fox mask', 2, 'White fox mask with red markings.'],
    ['Oni mask', 2, 'Horned demon mask.'],
    ['Crow mask', 2, 'Black beaked mask.'],
    ['Element aura', 2, 'Sparks, flame, water, wind or dust around you.'],
    ['Smoke entrance', 2, 'Enter the arena in a puff of smoke.'],
    ['Leap from the stands', 2, 'Jump into the arena from your seat.'],
    ['Glowing eyes', 3, 'Your eyes light up when you use a jutsu.'],
    ['Teleport entrance', 3, 'Appear in the arena in a flash.'],
  ],
};
window.ITEMS.unlocked = function (rank, clan) {
  const I = window.ITEMS, J = I.jutsu[['Ember', 'Tide', 'Volt', 'Gale', 'Stone'][clan]] || [];
  const all = [...I.outfits.map(x => ['Outfit', ...x]), ...J.map(x => ['Jutsu', ...x]), ...(rank >= 3 ? I.jutsu.Sennin.map(x => ['Jutsu', ...x]) : []), ...I.weapons.map(x => ['Weapon', ...x]), ...I.extras.map(x => ['Extra', ...x])];
  return { have: all.filter(x => x[2] <= rank), next: all.filter(x => x[2] === rank + 1), total: all.length };
};
