/* Magic Express — content data & deterministic level generator (1000 levels edition) */
(function () {
  'use strict';

  var TOTAL = 1000;             /* total levels */
  var CHAPTER = 125;            /* levels per chapter/region */
  var BOSS_EVERY = 25;          /* boss encounter cadence */

  /* Region palettes (UI accents, order tints). */
  var PALETTES = {
    1: ['#f0c44a', '#d66e2c', '#ba403a', '#7a5c96', '#40949e', '#f6ecda'],
    2: ['#60be56', '#2e7c40', '#d6e060', '#96663c', '#e2544a', '#fae078'],
    3: ['#48c4ce', '#2878aa', '#96e6f0', '#f08c6e', '#5a6ebe', '#f0ecc8'],
    4: ['#96b4dc', '#5a6e96', '#f0f6fc', '#c85a50', '#f0be5a', '#6e9678'],
    5: ['#f0aa3c', '#e2783c', '#fae282', '#4696be', '#c8505a', '#96643c'],
    6: ['#5ae8a0', '#9664f0', '#50c8e8', '#f06eb4', '#f0e278', '#465ab4'],
    7: ['#e64646', '#f49628', '#e65aa0', '#8c5ac8', '#6ebe5a', '#fadc50'],
    8: ['#ec5aec', '#5a96f0', '#50e8c8', '#b078f0', '#fa6e96', '#fae278']
  };

  /* ---------- board shape masks ('1' = playable) ---------- */
  var MASKS = {
    full: null,
    corners: ['0111110', '1111111', '1111111', '1111111', '1111111', '1111111', '1111111', '0111110'],
    hex: ['0111110', '1111111', '1111111', '1111111', '1111111', '1111111', '1111111', '0111110'],
    diamond: ['0011100', '0111110', '1111111', '1111111', '1111111', '1111111', '0111110', '0011100'],
    heart: ['0110110', '1111111', '1111111', '1111111', '0111110', '0111110', '0011100', '0011100'],
    hourglass: ['1111111', '0111110', '0011100', '0011100', '0011100', '0011100', '0111110', '1111111'],
    cross: ['0011100', '0011100', '1111111', '1111111', '1111111', '1111111', '0011100', '0011100']
  };
  var MASK_POOLS = {
    1: ['full', 'corners'], 2: ['full', 'corners', 'hex'], 3: ['diamond', 'hex', 'full'],
    4: ['hex', 'hourglass', 'corners'], 5: ['heart', 'diamond', 'hex'],
    6: ['hourglass', 'diamond', 'cross'], 7: ['cross', 'heart', 'hex'],
    8: ['cross', 'hourglass', 'heart', 'diamond']
  };

  /* seeded rng */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

  function regionOf(lvl) { return Math.max(1, Math.min(8, Math.ceil(lvl / CHAPTER))); }
  function isBoss(lvl) { return lvl % BOSS_EVERY === 0; }
  function bossOf(lvl) { return ((Math.ceil(lvl / BOSS_EVERY) - 1) % 8) + 1; }
  function bossTier(lvl) { return Math.floor((Math.ceil(lvl / BOSS_EVERY) - 1) / 8); }  /* 0..3 escalation */

  function pushBlocker(cfg, kind, n, r, hp) {
    cfg.blockers.push({ kind: kind, n: n, hp: hp || 1 });
  }

  function bossGoals(b, tier) {
    var k = 1 + tier * 0.3;
    switch (b) {
      case 1: return [{ k: 'coal', n: Math.round(18 * k), got: 0 }];
      case 2: return [{ k: 'crow', n: Math.round(10 * k), got: 0 }];
      case 3: return [{ k: 'ice', n: Math.round(27 * k), got: 0 }];
      case 4: return [{ k: 'stone', n: Math.round(14 * k), got: 0 }];
      case 5: return [{ k: 'amber', n: Math.round(12 * k), got: 0 }];
      case 6: return [{ k: 't', t: 5, n: Math.round(40 * k), got: 0 }];
      case 7: return [{ k: 'vine', n: Math.round(22 * k), got: 0 }];
      case 8: return [{ k: 't', t: 0, n: Math.round(30 * k), got: 0 }, { k: 'crate', n: Math.round(8 * k), got: 0 }, { k: 'ice', n: Math.round(12 * k), got: 0 }];
    }
    return [];
  }
  function bossBlockers(b, tier) {
    switch (b) {
      case 1: return [{ kind: 'coal', n: 20 + tier * 4, hp: 1 }];
      case 2: return [{ kind: 'crow', n: 12 + tier * 3, hp: 1 }];
      case 3: return [{ kind: 'ice', n: 27 + tier * 4, hp: 3 }];
      case 4: return [{ kind: 'stone', n: 14 + tier * 3, hp: 2 }];
      case 5: return [{ kind: 'amber', n: 12 + tier * 2, hp: 2 }];
      case 6: return [{ kind: 'dark', n: 1, hp: 1 }];
      case 7: return [{ kind: 'vine', n: 22 + tier * 4, hp: 1 }];
      case 8: return [{ kind: 'crate', n: 8 + tier * 2, hp: 2 }, { kind: 'ice', n: 12 + tier * 2, hp: 2 }, { kind: 'timer', n: 90, hp: 1 }];
    }
    return [];
  }

  /* ---------- level config ---------- */
  function levelCfg(lvl) {
    lvl = Math.max(1, Math.min(TOTAL, lvl));
    var reg = regionOf(lvl);
    var inCh = lvl - (reg - 1) * CHAPTER;             /* 1..125 */
    var r = rng(lvl * 7919 + 13);
    var t = (inCh - 1) / (CHAPTER - 1);               /* 0..1 inside chapter */
    var tier = Math.floor((lvl - 1) / 250);           /* 0..3 global escalation */
    var wave = Math.sin(t * Math.PI * 4) * 0.07;
    var diff = 0.3 + t * 0.7 + (reg - 1) * 0.04 + tier * 0.06 + wave;

    var maskName = 'full';
    var boss = isBoss(lvl) ? bossOf(lvl) : 0;
    if (!boss && lvl > 6) {
      var pool = MASK_POOLS[reg];
      maskName = pool[lvl % pool.length];
    }
    var cfg = {
      id: lvl, reg: reg, cols: 7, rows: 8,
      mask: boss ? null : (MASKS[maskName] || null), maskName: boss ? 'full' : maskName,
      colors: Math.min(6, 4 + (t > 0.3 ? 1 : 0) + (reg >= 7 ? 1 : 0)),
      moves: 0, goals: [], blockers: [], boss: 0, palette: PALETTES[reg], seed: lvl * 31 + 7,
      belts: [], portals: null, spread: 0, tier: tier
    };

    if (boss) {
      cfg.boss = boss;
      cfg.moves = [22, 24, 26, 24, 26, 24, 26, 30][boss - 1] + bossTier(lvl) * 2;
      cfg.goals = bossGoals(boss, bossTier(lvl));
      cfg.blockers = bossBlockers(boss, bossTier(lvl));
      return cfg;
    }

    cfg.moves = Math.round(22 + 4 * Math.sin(t * 3.1) + (reg >= 4 ? 2 : 0) + ri(r, 0, 2));
    if (maskName !== 'full') cfg.moves += 3;
    cfg.moves += (reg === 5) ? 2 : (reg >= 6 ? 4 : (reg === 7 ? 2 : 0));
    cfg.moves = Math.max(18, Math.min(34, cfg.moves));

    /* goals */
    var kinds = ['t'];
    if (reg >= 2) kinds.push('ice');
    if (reg >= 3) kinds.push('lug', 'honey');
    if (reg >= 4) kinds.push('stone');
    if (reg >= 5) kinds.push('amber', 'crate');
    if (reg >= 7) kinds.push('vine');
    var nGoals = 1 + (inCh > 25 ? 1 : 0) + (inCh > 80 ? 1 : 0);
    nGoals = Math.min(3, nGoals);
    var used = {};
    for (var g = 0; g < nGoals; g++) {
      var k = kinds[ri(r, 0, kinds.length - 1)];
      if (used[k] && k !== 't') k = kinds[0];
      used[k] = 1;
      if (k === 't') {
        var col = ri(r, 0, cfg.colors - 1);
        var n = Math.round(9 + diff * 9 + ri(r, 0, 4)) + (reg >= 6 ? 4 : 0);
        if (maskName !== 'full') n = Math.round(n * 0.85);
        cfg.goals.push({ k: 't', t: col, n: n, got: 0 });
      } else if (k === 'lug') {
        cfg.goals.push({ k: 'lug', n: Math.min(2, 1 + Math.floor(diff)), got: 0 });
      } else {
        var bn = Math.round(3 + diff * 5 + ri(r, 0, 2));
        if (maskName !== 'full') bn = Math.round(bn * 0.85);
        cfg.goals.push({ k: k, n: Math.min(k === 'ice' ? 20 : 12, bn), got: 0 });
      }
    }

    /* blockers */
    if (reg === 1 || inCh > 5) pushBlocker(cfg, 'crate', Math.round(2 + diff * 6), r);
    if (reg >= 2 && inCh > 8) pushBlocker(cfg, 'ice', Math.round(3 + diff * 8), r, reg >= 6 ? 2 : 1);
    if (reg >= 2 && inCh > 16) pushBlocker(cfg, 'chain', Math.round(2 + diff * 3), r);
    if (reg >= 3 && inCh > 10) pushBlocker(cfg, 'honey', Math.round(2 + diff * 6), r);
    if (reg >= 4 && inCh > 12) pushBlocker(cfg, 'stone', Math.round(2 + diff * 4), r);
    if (reg >= 5 && inCh > 15) pushBlocker(cfg, 'amber', Math.round(1 + diff * 1.5), r);
    if (reg >= 7 && inCh > 12) pushBlocker(cfg, 'vine', Math.round(2 + diff * 4), r);
    if (reg === 8) { pushBlocker(cfg, 'chain', 3, r); pushBlocker(cfg, 'honey', 3, r); }

    /* new mechanics: conveyor belts, portals, honey spread */
    if (reg >= 3 && t > 0.15 && r() < 0.35) {
      var rows = 1 + (t > 0.6 ? 1 : 0);
      for (var bi = 0; bi < rows; bi++) {
        var br = ri(r, 2, 5), dir = r() < 0.5 ? 0 : 1;
        for (var bc = 1; bc <= 5; bc++) cfg.belts.push({ r: br, c: bc, dir: dir });
      }
    }
    if (reg >= 4 && t > 0.3 && r() < 0.45) {
      cfg.portals = {
        a: { r: ri(r, 1, 3), c: ri(r, 0, 2) },
        b: { r: ri(r, 4, 6), c: ri(r, 4, 6) }
      };
    }
    if (reg >= 6 && t > 0.4) cfg.spread = 5;

    if (cfg.maskName !== 'full') cfg.blockers.forEach(function (b2) { b2.n = Math.max(2, Math.round(b2.n * 0.75)); });
    if (cfg.goals.some(function (g2) { return g2.k === 'lug'; })) {
      cfg.lugCount = cfg.goals.filter(function (g2) { return g2.k === 'lug'; })[0].n;
    }
    return cfg;
  }

  /* ---------- economy ---------- */
  var ECO = {
    winBase: 40, orderReward: 15, dailyQuest: 60, dailyChest: 100, bossReward: 250,
    dupSouvenir: 50, regionDone: 500,
    hammer: 100, moves5: 150, shuffle: 80, chest: 300, continueCost: 200,
    glove: 120, colorbomb: 180,
    carStep: function (stepIndex) {
      var v = 150 * Math.pow(2500 / 150, stepIndex / 53);
      return Math.round(v / 10) * 10;
    }
  };

  var CARS = [];
  for (var ci = 0; ci < 18; ci++) CARS.push({ id: ci, steps: 3 });

  /* ---------- souvenirs: 40 base + 8 boss relics ---------- */
  var SOUV = [];
  (function () {
    var id = 0;
    for (var reg = 1; reg <= 8; reg++) {
      for (var i = 0; i < 3; i++) SOUV.push({ id: id++, reg: reg, rar: 'c' });
      SOUV.push({ id: id++, reg: reg, rar: 'r' });
    }
    for (var e = 0; e < 4; e++) SOUV.push({ id: id++, reg: 0, rar: 'e' });
    for (var l = 0; l < 4; l++) SOUV.push({ id: id++, reg: 0, rar: 'l' });
    for (var rel = 0; rel < 8; rel++) SOUV.push({ id: id++, reg: 0, rar: 'l', relic: rel + 1 });
  })();
  function souvFile(s) {
    if (s.relic) return 'boss_0' + s.relic + '.png';
    var idx = 0;
    for (var i = 0; i < SOUV.length; i++) if (SOUV[i].rar === s.rar) { if (SOUV[i].id === s.id) break; idx++; }
    return 'souv_' + s.rar + '_' + String(idx + 1).padStart(2, '0') + '.png';
  }

  /* ---------- achievements (20) ---------- */
  var ACH = [
    { id: 'a1', check: function (s) { return s.stats.wins >= 1; } },
    { id: 'a2', check: function (s) { return s.stats.maxLevel >= 50; } },
    { id: 'a3', check: function (s) { return s.stats.maxLevel >= 250; } },
    { id: 'a4', check: function (s) { return s.stats.maxLevel >= 500; } },
    { id: 'a5', check: function (s) { return s.stats.bossWins >= 8; } },
    { id: 'a6', check: function (s) { return s.cars.every(function (c) { return c >= 3; }); } },
    { id: 'a7', check: function (s) { return Object.keys(s.souv).length >= SOUV.length; } },
    { id: 'a8', check: function (s) { return s.stats.cascade8 >= 1; } },
    { id: 'a9', check: function (s) { return s.stats.bestStreak >= 30; } },
    { id: 'a10', check: function (s) { return s.stats.hcRuns >= 10; } },
    { id: 'a11', check: function (s) { return s.stats.orders >= 100; } },
    { id: 'a12', check: function (s) { return s.stats.bestLevelCoins >= 1000; } },
    { id: 'a13', check: function (s) { return regionComplete(s, true); } },
    { id: 'a14', check: function (s) { return SOUV.some(function (x) { return x.rar === 'l' && s.souv[x.id]; }); } },
    { id: 'a15', check: function (s) { return s.stats.cascade10 >= 1; } },
    { id: 'a16', check: function (s) { return s.stats.bossEnc >= 20; } },
    { id: 'a17', check: function (s) { return s.stats.belts >= 100; } },
    { id: 'a18', check: function (s) { return s.stats.portals >= 50; } },
    { id: 'a19', check: function (s) { return s.stats.maxLevel >= 750; } },
    { id: 'a20', check: function (s) { return s.stats.maxLevel >= 1000; } }
  ];
  function regionComplete(s, any) {
    for (var reg = 1; reg <= 8; reg++) {
      var all = true;
      for (var i = 0; i < SOUV.length; i++) if (SOUV[i].reg === reg && !s.souv[SOUV[i].id]) all = false;
      if (all) return reg;
    }
    return 0;
  }

  /* ---------- dailies / week ---------- */
  function dayKey(d) { d = d || new Date(); return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); }
  function weekKey(d) {
    d = d || new Date();
    var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    var day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var wk = 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
    return t.getUTCFullYear() + '-w' + wk;
  }
  function makeDailyQuests(key) {
    var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    var r = rng(h + 77);
    var pool = [
      { k: 'win', n: 2 + ri(r, 0, 2) },
      { k: 'spec', n: 3 + ri(r, 0, 4) },
      { k: 'col', c: ri(r, 0, 5), n: 20 + ri(r, 0, 20) },
      { k: 'coins', n: 150 + ri(r, 0, 4) * 50 },
      { k: 'whistle', n: 1 + ri(r, 0, 2) },
      { k: 'casc', n: 3 + ri(r, 0, 3) }
    ];
    var picks = [];
    while (picks.length < 3) {
      var idx = ri(r, 0, pool.length - 1);
      if (!picks.some(function (p) { return p.k === pool[idx].k; })) picks.push(pool[idx]);
    }
    return picks.map(function (p) { return { k: p.k, c: p.c, n: p.n, prog: 0, done: false }; });
  }

  var EXP_STEPS = [10, 25, 45, 70, 100];
  var EXP_REWARDS = [
    { coins: 150 }, { coins: 300 }, { booster: 'hammer' }, { coins: 600 }, { chest: 'epic' }
  ];

  /* ---------- trophies (24): 8 boss relics + 8 region cups + 8 feat cups ---------- */
  var TROPHIES = [];
  (function () {
    var i;
    for (i = 0; i < 8; i++) TROPHIES.push({ id: 'b' + i, cat: 0, idx: i, check: function (s) { return !!s.souv[40 + this.idx]; } });
    for (i = 0; i < 8; i++) TROPHIES.push({ id: 'r' + i, cat: 1, idx: i, check: function (s) {
      for (var q = 0; q < SOUV.length; q++) if (SOUV[q].reg === this.idx + 1 && !s.souv[SOUV[q].id]) return false;
      return true; } });
    var feats = [
      function (s) { return s.stats.wins >= 100; }, function (s) { return s.stats.wins >= 500; },
      function (s) { return s.stats.cascade10 >= 1; }, function (s) { return s.stats.bestStreak >= 30; },
      function (s) { return s.stats.hcBest >= 1000; }, function (s) { return s.stats.orders >= 100; },
      function (s) { return s.cars.every(function (c) { return c >= 3; }); },
      function (s) { return Object.keys(s.souv).length >= SOUV.length; }
    ];
    for (i = 0; i < 8; i++) TROPHIES.push({ id: 'f' + i, cat: 2, idx: i, check: feats[i] });
  })();

  var PAX = [];
  for (var pi = 0; pi < 28; pi++) PAX.push({ id: pi });

  window.MEDATA = {
    PALETTES: PALETTES, MASKS: MASKS, rng: rng, ri: ri,
    TOTAL: TOTAL, CHAPTER: CHAPTER, BOSS_EVERY: BOSS_EVERY,
    regionOf: regionOf, isBoss: isBoss, bossOf: bossOf, bossTier: bossTier,
    levelCfg: levelCfg, ECO: ECO, CARS: CARS, SOUV: SOUV, souvFile: souvFile, ACH: ACH,
    regionComplete: regionComplete, dayKey: dayKey, weekKey: weekKey, makeDailyQuests: makeDailyQuests,
    EXP_STEPS: EXP_STEPS, EXP_REWARDS: EXP_REWARDS, PAX: PAX, TROPHIES: TROPHIES
  };
})();
