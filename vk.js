/* Magic Express — main: boot, preloader, game flow, input, SDK hooks */
(function () {
  'use strict';
  var D = window.MEDATA, ST = window.MEState, UI = window.MEui, el = window.MEel;
  function $(id) { return document.getElementById(id); }

  var ME = window.ME = {
    build: '2026.10.13-f',
    L: 'en',
    txt: function (k) {
      var d = window.MEI18N[ME.L] || window.MEI18N.en;
      return d[k] != null ? d[k] : (window.MEI18N.en[k] != null ? window.MEI18N.en[k] : k);
    },
    setLang: function (l) {
      ME.L = l; ST.S.lang = l; ST.save(true);
      document.documentElement.lang = l;
      if (UI.screen) refreshCurrent();
    },
    audio: window.MEaudio,
    ui: UI,
    rewarded: function (cb) {
      if (window.VKSDK && window.VKSDK.inVK && window.VKSDK.inVK()) {
        window.VKSDK.rewarded(function (ok) {
          if (!ok) { UI.toast(ME.txt('adClosed')); cb && cb(false); return; }
          cb && cb(true);
        });
        return;
      }
      window.MESDK.rewarded(function (real) {
        if (!real) UI.toast(ME.txt('adFallback'));
        cb && cb(true, !real);
      }, function () { UI.toast(ME.txt('adFallback')); cb && cb(true, true); });
    },
    openMap: function () { window.MEScreens.map(); UI.show('map'); },
    fxOn: function () { return !!(window.MEState && window.MEState.S.settings.fx); },
    plural: function (n, forms) {
      var n2 = n % 100;
      if (n2 >= 11 && n2 <= 14) return forms[2];
      var m2 = n % 10;
      if (m2 === 1) return forms[0];
      if (m2 >= 2 && m2 <= 4) return forms[1];
      return forms[2];
    },
    curPax: 0
  };

  function refreshCurrent() {
    var sc = window.MEScreens;
    switch (UI.screen) {
      case 'menu': sc.menu(); break;
      case 'map': sc.map(); break;
      case 'train': sc.train(); break;
      case 'album': sc.album(); break;
      case 'pax': sc.pax(); break;
      case 'chests': sc.chests(); break;
      case 'quests': sc.quests(); break;
      case 'settings': sc.settings(); break;
      case 'exp': sc.exp(); break;
      case 'hc': sc.hc(); break;
      case 'trophy': sc.trophy(); break;
      case 'shop': sc.shop(); break;
    }
  }

  /* ================= diagnostics: visible boot stages & error panel ================= */
  window.__stage = 'scripts';
  (function () {
    if (!window.CanvasRenderingContext2D.prototype.roundRect) {
      window.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        r = Math.min(r || 0, w / 2, h / 2);
        this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
        return this;
      };
    }
    window.__errs = [];
    window.__debug = /debug=1/.test(location.search);
    function push(msg) {
      window.__errs.push(String(msg).slice(0, 300));
      var d = document.getElementById('diag');
      if (!d) {
        d = document.createElement('div'); d.id = 'diag';
        d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:999;max-width:96vw;max-height:40vh;overflow:auto;background:#2a0a0aee;color:#ffd0d0;font:12px/1.4 monospace;padding:8px;border-radius:8px;white-space:pre-wrap';
        document.body && document.body.appendChild(d);
      }
      d.textContent = 'BOOT STAGE: ' + (window.__stage || '?') + '\n' + window.__errs.slice(0, 4).join('\n') + '\n(пришлите скриншот разработчику)';
    }
    window.addEventListener('error', function (e) { push(e.message + ' @' + (e.filename || '').slice(-30) + ':' + e.lineno); });
    window.addEventListener('unhandledrejection', function (e) { push('promise: ' + (e.reason && e.reason.message || e.reason)); });
  })();

  /* ================= PRELOADER (strictly once) ================= */
  var preloaded = false;
  function preload(cb) {
    if (preloaded) { cb(); return; }
    var names = ['logo.png', 'train_marquee.png', 'ui_star.png', 'ui_coin.png', 'ui_pill.png', 'ui_glass.png',
      'ui_frame.png', 'ui_btn.png', 'ui_chip.png', 'ui_round.png', 'splash_reg1.jpg',
      'piece_ticket.png', 'piece_case.png', 'piece_lantern.png', 'piece_star.png', 'piece_teapot.png', 'piece_compass.png',
      'spec_line.png', 'spec_bomb.png', 'spec_orb.png', 'spec_whistle.png',
      'block_crate.png', 'block_ice.png', 'block_chain.png', 'block_honey.png', 'block_stone.png', 'block_vine.png', 'block_amber.png', 'block_luggage.png',
      'chest_closed.png', 'chest_open.png', 'fx_spark.png', 'fx_steam.png', 'fx_confetti.png', 'trophy_01.png', 'ic_pause.png'];
    names.push('bg_reg1.jpg', 'boss_01.png');   /* rest streams per region on demand */
    for (var c = 1; c <= 12; c++) names.push('train_car_' + String(c).padStart(2, '0') + '_broken.png', 'train_car_' + String(c).padStart(2, '0') + '_fixed.png');
    for (var p = 1; p <= 20; p++) names.push('passenger_' + String(p).padStart(2, '0') + '.png');
    ['c:24', 'r:8', 'e:4', 'l:4'].forEach(function (q) {
      var kk = q.split(':')[0], n = +q.split(':')[1];
      for (var i = 1; i <= n; i++) names.push('souv_' + kk + '_' + String(i).padStart(2, '0') + '.png');
    });
    var done = 0, bar = $('load-bar'), pct = $('load-pct'), finished = false;
    setTimeout(function () {   /* watchdog: never hang on a single broken asset */
      if (!finished && done < names.length) { finished = true; preloaded = true; cb(); }
    }, 6000);
    names.forEach(function (n) {
      var im = new Image();
      im.onload = im.onerror = function () {
        done++;
        var pr = done / names.length;
        if (bar) bar.style.width = (pr * 100) + '%';
        if (pct) pct.textContent = Math.round(pr * 100) + '%';
        if (window.__debug) {
          var dg2 = document.getElementById('diag');
          if (!dg2) { dg2 = document.createElement('div'); dg2.id = 'diag'; dg2.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:999;max-width:96vw;background:#0a2a0aee;color:#d0ffd0;font:12px/1.4 monospace;padding:8px;border-radius:8px;white-space:pre-wrap'; document.body.appendChild(dg2); }
          dg2.textContent = 'STAGE: ' + window.__stage + ' | assets ' + done + '/' + names.length + (window.__errs.length ? '\nERR: ' + window.__errs[0] : '');
        }
        if (done >= names.length && !finished) { finished = true; preloaded = true; setTimeout(cb, 150); }
      };
      im.src = 'img/' + n;
    });
  }

  /* ================= GAME SESSION ================= */
  var G = null;   /* current session */
  function newSession(lvl, opts) {
    opts = opts || {};
    var cfg = D.levelCfg(lvl);
    var perks = {
      extraMoves: (lvl % 5 === 0 && ST.perk('moves5th')) ? 2 : 0,
      startCharges: ST.perk('whistleStart') ? 1 : 0,
      startCharge: 0
    };
    var board = new window.MEBoard(cfg, perks);
    var order = null;
    if (!opts.hardcore) {
      var pax = (lvl * 7) % 20;
      ME.curPax = pax;
      order = { pax: pax, t: Math.floor(Math.random() * cfg.colors), n: 10 + (lvl % 7), got: 0, reward: Math.round(D.ECO.orderReward * (ST.perk('orderX2') ? 2 : 1) * (ST.perk('radio') ? 1.25 : 1)) };
    }
    return {
      lvl: lvl, cfg: cfg, board: board, order: order, hardcore: !!opts.hardcore,
      boostUsed: false, paused: false, over: false, run: opts.run || 0,
      coinsAtStart: ST.S.coins
    };
  }

  ME.startLevel = function (lvl, opts) {
    G = newSession(lvl, opts);
    enterGameScreen();
    /* intro dialog at region start / boss */
    var reg = D.regionOf(lvl);
    var inReg = lvl - (reg - 1) * 30;
    if (!G.hardcore) {
      if (lvl === 1 && !ST.S.seenIntro) {
        ST.S.seenIntro = 1; ST.save();
        UI.dialog(0, ME.txt('dialog').intro, function () { showGoals(beginPlay); });
        return;
      }
      if (inReg === 1 && lvl !== 1) {
        UI.regionSplash(reg, function () {
          UI.dialog((reg * 3) % 28, ME.txt('dialog').station.map(function (s) { return s.replace('{r}', ME.txt('regions')[reg - 1]); }), function () { showGoals(beginPlay); });
        });
        return;
      }
      if (D.isBoss(lvl)) {
        UI.bossIntro(reg, function () {
          UI.dialog((reg * 5) % 28, ME.txt('dialog').boss.map(function (s) { return s.replace('{b}', ME.txt('bosses')[reg - 1]); }), function () { showGoals(beginPlay); });
        });
        return;
      }
    }
    showGoals(beginPlay);
  };
  function beginPlay() {
    window.MESDK.gameplayStart();
    window.MESDK.event('level_start', { lvl: G.lvl, hardcore: !!G.hardcore });
    if (G.lvl === 1 && !ST.S.tut && !G.hardcore) {
      var hm = findHintMove();
      if (hm) {
        G.ren.hint = hm;
        setTimeout(function () { UI.toast(ME.txt('tip_swap')); }, 600);
        setTimeout(function () { if (G && G.ren) G.ren.hint = null; }, 14000);   /* skippable by time */
      }
    }
    if (ST.S.settings.music) ME.audio.startMusic && ME.audio.startMusic(D.regionOf(G.lvl));
    ME.audio.setRegion(D.regionOf(G.lvl));
  }

  function bossName(bIdx, lvl) {
    var tier = D.bossTier(lvl);
    var rom = ['', 'II', 'III', 'IV', 'V'][tier] || '';
    return ME.txt('bosses')[bIdx - 1] + (rom ? ' ' + rom : '');
  }
  ME.bossName = bossName;

  function showGoals(cb) {
    var b = G.board;
    UI.popup(function (box, p) {
      box.appendChild(el('div', 'p-title', ME.txt('level') + ' ' + G.lvl + (G.cfg.boss ? ' · ' + ME.txt('boss') : '')));
      box.appendChild(el('div', 'res-sub', ME.txt('regions')[D.regionOf(G.lvl) - 1] + (G.cfg.boss ? ' — ' + bossName(G.cfg.boss, G.lvl) : '') + ' · ' + ME.txt('chapter') + ' ' + D.regionOf(G.lvl)));
      var row = el('div', 'goals-row');
      b.goals.forEach(function (g) {
        var chip = el('div', 'goal-big glass');
        var ic = g.k === 't' ? tintIcon(g.t) : 'img/' + ({ crate: 'block_crate.png', ice: 'block_ice.png', stone: 'block_stone.png', honey: 'block_honey.png', vine: 'block_vine.png', lug: 'block_luggage.png', coal: 'block_stone.png', crow: 'block_chain.png', amber: 'block_amber.png' }[g.k]);
        chip.innerHTML = '<img src="' + ic + '"><b>' + g.n + '</b>';
        row.appendChild(chip);
      });
      var mv = el('div', 'goal-big glass');
      mv.innerHTML = '<img src="img/ui_pill.png"><b>' + b.moves + '</b><span>' + ME.txt('moves') + '</span>';
      row.appendChild(mv);
      box.appendChild(row);
      if (G.order) box.appendChild(el('div', 'res-sub', ME.txt('order') + ': ' + G.order.n + ' ' + ME.txt('paxNames')[G.order.pax] + ' (+' + G.order.reward + ')'));
      var r2 = el('div', 'row');
      r2.appendChild(UI.pill('▶ ' + (ME.L === 'ru' ? 'ПОЕХАЛИ' : "LET'S GO"), function () { p.close(); cb && cb(); }, 'big'));
      box.appendChild(r2);
    });
  }

  function enterGameScreen() {
    UI.setBg(D.regionOf(G.lvl));
    UI.show('game');
    buildHUD();
    var wrap = $('board-wrap');
    wrap.innerHTML = '';
    var cv = document.createElement('canvas');
    cv.id = 'board';
    wrap.appendChild(cv);
    var ren = G.ren = new window.MERenderer(cv);
    sizeBoard();
    ren.setBoard(G.board, G.cfg.palette);
    bindInput(cv, ren);
    updateHUD();
    /* boss banner */
    if (G.cfg.boss) {
      var b = el('div', 'boss-tag glass');
      b.innerHTML = '<img src="img/boss_0' + G.cfg.boss + '.png" class="boss-ic"><div><b>' + bossName(G.cfg.boss, G.lvl) + '</b><div class="dim">' + ME.txt('bossHints')[G.cfg.boss - 1].replace('N', G.board.moves) + '</div></div>';
      wrap.appendChild(b);
      if (G.cfg.boss === 8) startBossTimer();
    }
  }
  function sizeBoard() {
    var wrap = $('board-wrap');
    var rect = wrap.getBoundingClientRect();
    G.ren.resize(rect.width, rect.height, G.cfg.cols, G.cfg.rows);
  }
  window.addEventListener('resize', function () { if (G && G.ren && UI.screen === 'game') sizeBoard(); });

  var PIECE_FILES = ['ticket', 'case', 'lantern', 'star', 'teapot', 'compass'];
  function tintIcon(t) { return 'img/piece_' + PIECE_FILES[t] + '.png'; }

  /* ---------- HUD ---------- */
  function buildHUD() {
    var top = $('hud-top'), bot = $('hud-bot');
    top.innerHTML = ''; bot.innerHTML = '';
    var t = el('div', 'glass hud-glass');
    t.innerHTML = '<div class="hud-moves"><div class="hud-lbl">' + ME.txt('moves') + '</div><div id="hud-mv" class="hud-big">' + G.board.moves + '</div></div>' +
      '<div class="hud-goals" id="hud-goals"></div>' +
      '<div class="hud-gauge"><div id="hud-gf" class="g-fill"></div><img src="img/spec_whistle.png" id="hud-wic" class="g-ic"></div>' +
      '<div class="hud-coins"><img src="img/ui_coin.png" class="bar-ic"><span id="hud-cn">' + ST.S.coins + '</span></div>';
    top.appendChild(t);
    if (G.order) {
      var o = el('div', 'glass order-tag');
      o.id = 'order-tag';
      o.innerHTML = '<img src="img/passenger_' + String(G.order.pax + 1).padStart(2, '0') + '.png" class="o-av"><span id="order-txt"></span>';
      o.onclick = function () { UI.toast(ME.txt('tip_order')); };
      top.appendChild(o);
    }
    /* bottom: whistle + boosters */
    var wbtn = el('button', 'whistle-btn'); wbtn.id = 'wbtn';
    wbtn.innerHTML = '<img src="img/spec_whistle.png"><span id="wch"></span><i class="w-steam" style="display:none"></i>';
    wbtn.onclick = function () {
      if (G.board.charges > 0) { G.ren.whistleArm = !G.ren.whistleArm; ME.audio.sfx.tap(); UI.toast(ME.txt('tip_whistle')); }
      else UI.toast(ME.txt('whistle') + ': ' + Math.round(G.board.charge) + '%');
    };
    bot.appendChild(wbtn);
    [['hammer', 'ic_hammer.png', D.ECO.hammer], ['glove', 'ic_glove.png', D.ECO.glove], ['color', 'ic_color.png', D.ECO.colorbomb], ['moves', 'ic_moves.png', D.ECO.moves5], ['shuffle', 'ic_shuffle.png', D.ECO.shuffle]].forEach(function (bs) {
      var b = el('button', 'boost-btn glass');
      b.id = 'bb-' + bs[0];
      b.innerHTML = '<img src="img/' + bs[1] + '"><span class="bb-n"></span>';
      b.onclick = function () { useBooster(bs[0], bs[2]); };
      bot.appendChild(b);
    });
    var pause = el('button', 'pause-btn', '<img src="img/ic_pause.png" alt="">');
    pause.onclick = function () { pauseGame(); };
    top.appendChild(pause);
  }
  function updateHUD() {
    var b = G.board;
    var mv = $('hud-mv'); if (mv) mv.textContent = b.moves;
    var g = $('hud-goals');
    if (g) {
      g.innerHTML = b.goals.map(function (go) {
        if (go.k === 't') return '<span class="goal"><img src="' + tintIcon(go.t) + '" class="g-piece"><i>' + Math.max(0, go.n - go.got) + '</i></span>';
        var ic = { crate: 'block_crate.png', ice: 'block_ice.png', stone: 'block_stone.png', honey: 'block_honey.png', vine: 'block_vine.png', lug: 'block_luggage.png', coal: 'block_stone.png', crow: 'block_chain.png', amber: 'block_amber.png' }[go.k];
        return '<span class="goal"><img src="img/' + ic + '" class="g-piece"><i>' + Math.max(0, go.n - go.got) + '</i></span>';
      }).join('');
    }
    var gf = $('hud-gf'); if (gf) gf.style.width = (b.charges > 0 ? 100 : b.charge) + '%';
    var wc = $('wch'); if (wc) wc.textContent = b.charges > 0 ? '×' + b.charges : '';
    var wbtn = $('wbtn'); if (wbtn) { wbtn.classList.toggle('ready', b.charges > 0); var ws = wbtn.querySelector('.w-steam'); if (ws) ws.style.display = b.charges > 0 ? '' : 'none'; }
    ['hammer', 'glove', 'color', 'moves', 'shuffle'].forEach(function (k) {
      var b2 = $('bb-' + k); if (b2) b2.querySelector('.bb-n').textContent = ST.S.boosters[k] || 0;
    });
    var cn = $('hud-cn'); if (cn) cn.textContent = ST.S.coins;
    if (G.order) {
      var ot = $('order-txt');
      if (ot) ot.innerHTML = ME.txt('order') + ': ' + Math.max(0, G.order.n - G.order.got) + ' <img src="' + tintIcon(G.order.t) + '" class="g-piece"> (+' + G.order.reward + ')';
    }
  }

  function findHintMove() {
    var b = G.board;
    for (var r = 0; r < b.rows; r++) for (var c = 0; c < b.cols; c++) {
      if (b.swappable(r, c) && b.swappable(r, c + 1) && b.swapMakes(r, c, r, c + 1)) return { a: { r: r, c: c }, b: { r: r, c: c + 1 } };
      if (b.swappable(r, c) && b.swappable(r + 1, c) && b.swapMakes(r, c, r + 1, c)) return { a: { r: r, c: c }, b: { r: r + 1, c: c } };
    }
    return null;
  }

  /* ---------- input ---------- */
  function bindInput(cv, ren) {
    var sel = null, down = null;
    function cellAt(x, y) {
      var c = Math.floor((x - ren.ox) / ren.cell), r = Math.floor((y - ren.oy) / ren.cell);
      if (r < 0 || c < 0 || r >= G.board.rows || c >= G.board.cols) return null;
      return { r: r, c: c };
    }
    function pos(ev) {
      var rect = cv.getBoundingClientRect();
      var t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    cv.addEventListener('touchstart', function (ev) { if (ev.cancelable) ev.preventDefault(); down = pos(ev); ren.trail = [down]; }, { passive: false });
    cv.addEventListener('touchmove', function (ev) { if (ev.cancelable) ev.preventDefault(); if (down) ren.trail.push(pos(ev)); }, { passive: false });
    cv.addEventListener('touchend', function (ev) {
      if (ev.cancelable) ev.preventDefault();
      var up = ev.changedTouches ? { x: ev.changedTouches[0].clientX - cv.getBoundingClientRect().left, y: ev.changedTouches[0].clientY - cv.getBoundingClientRect().top } : pos(ev);
      handleUp(down, up);
      down = null; setTimeout(function () { ren.trail = []; }, 120);
    }, { passive: false });
    var lastTouch = 0;
    cv.addEventListener('touchstart', function () { lastTouch = Date.now(); }, { passive: true });
    cv.addEventListener('mousedown', function (ev) { if (Date.now() - lastTouch < 700) return; down = pos(ev); ren.trail = [down]; });
    cv.addEventListener('mouseup', function (ev) { if (Date.now() - lastTouch < 700) return; var up = pos(ev); handleUp(down, up); down = null; setTimeout(function () { ren.trail = []; }, 120); });

    function handleUp(a, b) {
      if (!a || G.paused || G.over || (G.ren && G.ren.playing)) return;
      var ca = cellAt(a.x, a.y);
      if (!ca) return;
      /* whistle targeting */
      if (ren.whistleArm && G.board.charges > 0) {
        ren.whistleArm = false;
        var st = G.board.useWhistle(ca.r, ca.c);
        if (st) { if (!ST.S.tut2) { ST.S.tut2 = 1; ST.save(); } window.MESDK.event('whistle_use', { lvl: G.lvl }); updateHUD(); playSteps(st); }
        return;
      }
      /* glove targeting: any two cells swap */
      if (ren.gloveArm) {
        if (!ren.gloveA) { ren.gloveA = ca; ren.selA = ca; ME.audio.sfx.tap(); return; }
        var ga = ren.gloveA; ren.gloveA = null; ren.gloveArm = false; ren.selA = null;
        var stg = G.board.swapAny(ga.r, ga.c, ca.r, ca.c);
        if (stg && stg.steps) { updateHUD(); playSteps(stg.steps); }
        return;
      }
      /* color charge targeting */
      if (ren.colorArm) {
        ren.colorArm = false;
        var clc = G.board.grid[ca.r][ca.c];
        if (clc && clc.t >= 0) {
          var stc = G.board.clearColor(clc.t);
          if (stc) { updateHUD(); playSteps(stc); }
        }
        return;
      }
      /* hammer targeting */
      if (ren.hammerArm) {
        ren.hammerArm = false;
        var st2 = G.board.useHammer(ca.r, ca.c);
        if (st2) { updateHUD(); playSteps(st2); }
        return;
      }
      var cb = cellAt(b.x, b.y);
      var dx = b.x - a.x, dy = b.y - a.y;
      if (Math.hypot(dx, dy) > 24 && cb) {
        /* swipe */
        var dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: dx > 0 ? 1 : -1 } : { r: dy > 0 ? 1 : -1, c: 0 };
        doSwap(ca, { r: ca.r + dir.r, c: ca.c + dir.c });
        sel = null; ren.selA = null;
      } else {
        /* tap-tap */
        if (sel && Math.abs(sel.r - ca.r) + Math.abs(sel.c - ca.c) === 1) {
          doSwap(sel, ca); sel = null; ren.selA = null;
        } else {
          sel = ca; ren.selA = ca; ME.audio.sfx.tap();
        }
      }
    }
  }
  function doSwap(a, b) {
    if (!b || b.r < 0 || b.c < 0 || b.r >= G.board.rows || b.c >= G.board.cols) return;
    var res = G.board.trySwap(a.r, a.c, b.r, b.c);
    if (res.ok && G.ren.hint) { G.ren.hint = null; if (!ST.S.tut) { ST.S.tut = 1; ST.save(); } }
    if (res.steps) playSteps(res.steps);
    updateHUD();
  }
  function playSteps(steps) {
    G.ren.play(steps, function () {
      updateHUD();
      afterResolve();
    });
  }

  /* ---------- boosters ---------- */
  function useBooster(kind, price) {
    if (G.over || G.paused) return;
    if (G.hardcore) { UI.toast('× ' + ME.txt('hc_title')); return; }
    if ((ST.S.boosters[kind] || 0) <= 0) {
      if (!ST.spend(price)) { UI.toast('× ' + ME.txt('coins')); return; }
      ST.S.boosters[kind] = (ST.S.boosters[kind] || 0) + 1;
    }
    if (kind === 'moves') {
      ST.S.boosters.moves--; G.boostUsed = true;
      G.board.addMoves(5); ME.audio.sfx.coin(); updateHUD();
      if (G.board.over && !G.board.win) { G.board.over = false; }
      return;
    }
    if (kind === 'shuffle') {
      ST.S.boosters.shuffle--; G.boostUsed = true;
      playSteps(G.board.doShuffle()); updateHUD(); return;
    }
    if (kind === 'hammer') {
      ST.S.boosters.hammer--; G.boostUsed = true;
      G.ren.hammerArm = true; UI.toast(ME.txt('boost_hammer') + ': tap!');
    }
    if (kind === 'glove') {
      ST.S.boosters.glove--; G.boostUsed = true;
      G.ren.gloveArm = true; G.ren.gloveA = null; UI.toast(ME.txt('tip_glove'));
    }
    if (kind === 'color') {
      ST.S.boosters.color--; G.boostUsed = true;
      G.ren.colorArm = true; UI.toast(ME.txt('tip_color'));
    }
  }

  /* ---------- resolve / win / lose ---------- */
  function afterResolve() {
    var b = G.board;
    if (b.cascadeMax >= 3) ME.audio.kick(2200);
    /* order progress */
    if (G.order) {
      b.goals.forEach(function () {});
      G.order.got = Math.min(G.order.n, G.order.got + orderDelta());
      if (G.order.got >= G.order.n && !G.order.done) {
        G.order.done = true;
        ST.addCoins(G.order.reward);
        ST.S.stats.orders++;
        ST.questProg('win', 0);
        UI.toast(ME.txt('order_done') + ' +' + G.order.reward, 'img/ui_coin.png');
        ME.audio.sfx.coin();
        ST.checkAch().forEach(function (a) { UI.toast(ME.txt('achievement') + ' ' + ME.txt('achNames')[a - 1], 'img/ui_star.png'); });
      }
    }
    if (b.win && !G.over) { G.over = true; winFlow(); return; }
    if (b.over && !b.win && !G.over) { G.over = true; loseFlow(); return; }
    /* boss timer handled separately */
  }
  function orderDelta() {
    var got = G.board.clearedCounts[G.order.t] || 0;
    var d = got - (G._orderSent || 0);
    G._orderSent = got;
    return d;
  }

  function winFlow() {
    window.MESDK.gameplayStop();
    window.MESDK.event('level_win', { lvl: G.lvl, boss: G.cfg.boss || 0, moves: G.board.moves });
    var b = G.board;
    var comboBonus = Math.min(0.5, Math.max(0, (b.cascadeMax - 1) * 0.05)) * ST.comboMult();
    var base = D.ECO.winBase * (1 + comboBonus);
    if (G.cfg.boss) base += D.ECO.bossReward;
    var coins = Math.round(base * ST.coinMult());
    var stars = 1;
    if (b.moves >= Math.ceil(b.movesTotal * 0.5)) stars = 2;
    if (!G.boostUsed) stars = 3;
    if (G.hardcore) stars = 1;
    /* stats */
    var S = ST.S;
    S.stats.wins++; S.stats.levelsPlayed++;
    S.stats.maxLevel = Math.max(S.stats.maxLevel, G.lvl);
    if (G.cfg.boss) S.stats.bossWins = Math.max(S.stats.bossWins, G.cfg.boss);
    S.stats.cascade8 = Math.max(S.stats.cascade8, b.cascadeMax >= 8 ? 1 : 0);
    S.stats.cascade10 = Math.max(S.stats.cascade10, b.cascadeMax >= 10 ? 1 : 0);
    if (G.cfg.boss) S.stats.bossEnc = (S.stats.bossEnc || 0) + 1;
    S.stats.belts = (S.stats.belts || 0) + (b.statsBelts || 0);
    S.stats.portals = (S.stats.portals || 0) + (b.statsPortals || 0);
    S.stats.specials += b.specialsMade;
    S.stats.whistles += b.whistleUses;
    S.stats.streak++; S.stats.bestStreak = Math.max(S.stats.bestStreak, S.stats.streak);
    S.stats.bestLevelCoins = Math.max(S.stats.bestLevelCoins, coins + (G.order && G.order.done ? G.order.reward : 0));
    if (!G.hardcore) { S._rideFrom = S._rideFrom || G.lvl; S.lvl = Math.max(S.lvl, Math.min(240, G.lvl + 1)); }
    S.stars[G.lvl] = Math.max(S.stars[G.lvl] || 0, stars);
    /* quest progress */
    ST.questProg('win', 1);
    ST.questProg('spec', b.specialsMade);
    ST.questProg('coins', coins);
    ST.questProg('whistle', b.whistleUses);
    ST.questProg('casc', b.cascadeMax >= 4 ? 1 : 0);
    /* expedition tokens */
    if (!G.hardcore) {
      var tok = (G.cfg.boss ? 3 : 1) + (ST.perk('observatory') ? 1 : 0);
      ST.expTokens(tok);
      UI.toast('+' + tok + ' ' + (ME.L === 'ru' ? 'токен Экспедиции' : 'Expedition token'), 'img/souv_r_06.png');
    }
    /* souvenir chances */
    var souvMsg = null;
    if (G.cfg.boss && G.lvl % D.CHAPTER === 0) {
      souvMsg = ST.giveRelic(D.regionOf(G.lvl));
    } else if (G.cfg.boss) {
      var g1 = ST.giveSouvenir(G.cfg.boss === 8 ? 'l' : 'r', D.regionOf(G.lvl));
      souvMsg = g1;
    } else if (b.cascadeMax >= 6 && Math.random() < 0.5) {
      souvMsg = ST.giveSouvenir('e', null);
    }
    ST.addCoins(coins);
    ME.audio.sfx.win();
    if (stars === 3) G.ren.confettiBurst();
    ST.save(true);
    ST.checkAch().forEach(function (a) { UI.toast(ME.txt('achievement') + ' ' + ME.txt('achNames')[a - 1], 'img/ui_star.png'); });
    showResult(true, stars, coins, souvMsg);
  }
  function loseFlow() {
    window.MESDK.gameplayStop();
    window.MESDK.event('level_fail', { lvl: G.lvl });
    ST.S.stats.fails++; ST.S.stats.streak = 0;
    if (G.hardcore) { hardcoreOver(); return; }
    ME.audio.sfx.fail();
    ST.save(true);
    showResult(false, 0, 0, null);
  }

  function showResult(win, stars, coins, souvMsg) {
    UI.popup(function (box, p) {
      box.appendChild(el('div', 'p-title ' + (win ? 'win-t' : 'lose-t'), win ? ME.txt('win') : ME.txt('lose')));
      if (win) {
        var st = el('div', 'stars-row');
        for (var i = 1; i <= 3; i++) {
          var im = el('img', 'star-ic' + (i <= stars ? '' : ' off'));
          im.src = 'img/ui_star.png';
          im.style.animationDelay = (i * 0.15) + 's';
          st.appendChild(im);
        }
        box.appendChild(st);
        var coinRow = el('div', 'res-coins', '<img src="img/ui_coin.png" class="bar-ic"><span class="cn">0</span>');
        box.appendChild(coinRow);
        (function () {
          var span = coinRow.querySelector('.cn'), t0 = performance.now(), dur = 850, last = 0;
          function tick(now) {
            var t = Math.min(1, (now - t0) / dur);
            var v = Math.round(coins * (1 - Math.pow(1 - t, 3)));
            span.textContent = '+' + v;
            if (v - last >= 4) { last = v; ME.audio.sfx.coin(); }
            if (t < 1) requestAnimationFrame(tick); else span.textContent = '+' + coins;
          }
          requestAnimationFrame(tick);
        })();
        if (G.order && G.order.done) box.appendChild(el('div', 'res-sub', ME.txt('orderReward').replace('{n}', G.order.reward)));
        if (G.cfg.boss) box.appendChild(el('div', 'res-sub', ME.txt('boss') + ' +' + D.ECO.bossReward));
        if (souvMsg && souvMsg.id != null) box.appendChild(el('div', 'res-sub', ME.txt('new_souv') + ': ' + ME.txt('souvNames')[souvMsg.id]));
        if (souvMsg && souvMsg.dup) box.appendChild(el('div', 'res-sub', ME.txt('duplicate') + ' +' + souvMsg.coins));
        var row = el('div', 'row');
        if (window.MESDK.supports('rewarded') || (window.VKSDK && window.VKSDK.inVK())) row.appendChild(UI.pill('<span class=ad-tag>AD</span> ' + ME.txt('double_coins'), function () {
          row.children[0].disabled = true;
          ME.rewarded(function (ok) { if (!ok) { row.children[0].disabled = false; return; } ST.addCoins(coins); ME.audio.sfx.coin(); var cn2 = box.querySelector('.res-coins .cn'); if (cn2) cn2.textContent = '+' + (coins * 2); });
        }, 'ghost')); else row.appendChild(el('span'));
        if (G.hardcore) {
          row.appendChild(UI.pill(ME.txt('next'), function () { p.close(); G.run++; ME.startLevel(Math.min(240, 100 + G.run * 4), { hardcore: true, run: G.run }); }));
        } else {
          row.appendChild(UI.pill(ME.txt('next'), function () {
            p.close();
            if (window.VKSDK && window.VKSDK.inVK && window.VKSDK.inVK()) window.VKSDK.interstitial();
            else if (window.MESDK.interstitialOk()) window.MESDK.interstitial();
            ME.startLevel(Math.min(D.TOTAL, G.lvl + 1));
          }));
        }
        row.appendChild(UI.pill(ME.txt('menu'), function () { p.close(); exitToMenu(); }));
        box.appendChild(row);
      } else {
        box.appendChild(el('div', 'res-sub', ME.txt('continue_q')));
        var row2 = el('div', 'row');
        var canFree = ST.perk('freeContinue') && ST.S.daily.freeContinue !== D.dayKey();
        var contCost = Math.round(D.ECO.continueCost * (ST.perk('medic') ? 0.5 : 1));
        row2.appendChild(UI.pill(ME.txt('continue_q').split(' ')[0] + ' · ' + contCost, function () {
          if (canFree) { ST.S.daily.freeContinue = D.dayKey(); continueRun(p); }
          else if (ST.spend(contCost)) continueRun(p);
          else ME.rewarded(function (ok) { if (ok) continueRun(p); });
        }));
        row2.appendChild(UI.pill(ME.txt('retry'), function () { p.close(); ME.startLevel(G.lvl, { hardcore: G.hardcore, run: G.run }); }));
        row2.appendChild(UI.pill(ME.txt('menu'), function () { p.close(); exitToMenu(); }));
        box.appendChild(row2);
      }
    });
  }
  function continueRun(p) {
    p.close();
    G.over = false; G.board.over = false; G.board.win = false;
    G.board.addMoves(5);
    updateHUD();
    window.MESDK.gameplayStart();
  }
  function exitToMenu() {
    G = null;
    window.MEScreens.menu(); UI.show('menu');
  }

  /* ---------- boss 8 timer ---------- */
  var bossTimerInt = null;
  function startBossTimer() {
    if (bossTimerInt) clearInterval(bossTimerInt);
    bossTimerInt = setInterval(function () {
      if (!G || G.paused || G.over || UI.screen !== 'game') return;
      G.board.bossTimer--;
      var tag = document.querySelector('.boss-tag .dim');
      if (tag) tag.textContent = '⏱ ' + G.board.bossTimer + 's';
      if (G.board.bossTimer <= 0) {
        clearInterval(bossTimerInt); bossTimerInt = null;
        if (!G.board.win) { G.board.over = true; G.board.win = false; G.over = true; loseFlow(); }
      }
    }, 1000);
  }

  /* ---------- pause ---------- */
  function pauseGame() {
    if (!G || G.over) return;
    G.paused = true;
    window.MESDK.gameplayStop();
    UI.popup(function (box, p) {
      box.appendChild(el('div', 'p-title', ME.txt('pause')));
      var row = el('div', 'row');
      row.appendChild(UI.pill(ME.txt('resume'), function () {
        p.close(); G.paused = false; window.MESDK.gameplayStart();
      }));
      row.appendChild(UI.pill(ME.txt('restart'), function () { p.close(); ME.startLevel(G.lvl, { hardcore: G.hardcore, run: G.run }); }));
      row.appendChild(UI.pill(ME.txt('menu'), function () { p.close(); exitToMenu(); }));
      box.appendChild(row);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && G && !G.over && UI.screen === 'game' && !G.paused) pauseGame();
  });
  window.MESDK.pauseEvents(function (paused) {
    if (paused && G && !G.over && !G.paused) pauseGame();
  });

  /* ---------- hardcore ---------- */
  ME.startHardcore = function () { ME.startLevel(101, { hardcore: true, run: 0 }); };
  function hardcoreOver() {
    ST.S.stats.hcRuns++; ST.save();
    var score = G.run * 100 + (G.lvl - 100) * 10;
    ST.hcSubmit(score);
    ME.audio.sfx.fail();
    UI.popup(function (box, p) {
      box.appendChild(el('div', 'p-title lose-t', ME.txt('hc_over')));
      box.appendChild(el('div', 'res-coins', ME.txt('hc_score') + ': ' + score));
      box.appendChild(el('div', 'res-sub', ME.txt('hc_best') + ': ' + ST.S.stats.hcBest));
      var row = el('div', 'row');
      row.appendChild(UI.pill(ME.txt('hc_start'), function () { p.close(); ME.startHardcore(); }));
      row.appendChild(UI.pill(ME.txt('menu'), function () { p.close(); exitToMenu(); }));
      box.appendChild(row);
    });
  }

  /* ---------- main loop ---------- */
  var lastT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (G && G.ren && UI.screen === 'game') G.ren.draw(dt);
  }

  /* ---------- boot ---------- */
  ME.vkLoadSave = function () {
    if (!window.VKSDK || !window.VKSDK.inVK()) return;
    window.VKSDK.storageGet('save', function (v) {
      if (!v) return;
      try {
        var d = JSON.parse(v);
        var cur = ST.S;
        /* take the richer save (by progress) */
        if (d && d.stats && cur.stats && (d.stats.maxLevel || 0) > (cur.stats.maxLevel || 0)) {
          var f = ST.fresh();
          for (var kk in f) if (d[kk] === undefined) d[kk] = f[kk];
          ST.replace && ST.replace(d);
        }
      } catch (e) {}
    });
  };

  function boot() {
    window.__stage = 'boot';
    UI.init();
    if (window.VKSDK) { window.VKSDK.init(); ME.vkLoadSave(); }
    ST.load();
    ME.L = ST.S.lang || window.MESDK.language();
    ME.audio.setMuted(ST.S.settings.mute || window.MESDK.platformMuted());
    ST.rollDaily();
    /* free daily booster from Dining car */
    if (ST.perk('freeBooster') && ST.S.daily.freeBooster !== D.dayKey()) {
      ST.S.daily.freeBooster = D.dayKey();
      ST.S.boosters.hammer++;
      ST.save();
    }
    window.__stage = 'preload';
    preload(function () {
      window.__stage = 'menu';
      var dg = document.getElementById('diag'); if (dg && window.__errs.length === 0) dg.remove();
      $('loader').classList.add('gone');
      window.MESDK.gameStart();           /* GameReady — once, after assets */
      window.MEScreens.menu();
      UI.show('menu');
      if (!ST.S.seenIntro) { /* dialog on first play */ }
      requestAnimationFrame(loop);
    });
    /* touch bridge: instant tap response on UI buttons */
    document.addEventListener('touchend', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.pill, .map-lv, .boost-btn, .whistle-btn, .pause-btn, .souv-cell, .pax-cell, .bell') : null;
      if (t && ev.cancelable) { ev.preventDefault(); t.click(); }
    }, { passive: false });
    window.addEventListener('beforeunload', function () { window.MESDK.gameStop(); ST.flush(); });
    document.addEventListener('touchstart', function once() { ME.audio.unlock(); document.removeEventListener('touchstart', once); }, { passive: true });
    document.addEventListener('mousedown', function once() { ME.audio.unlock(); document.removeEventListener('mousedown', once); });
  }
  /* region asset streaming (lazy, cached) */
  var regionLoaded = {};
  ME.ensureRegion = function (reg, cb) {
    if (regionLoaded[reg]) { cb && cb(); return; }
    regionLoaded[reg] = 1;
    var list = ['bg_reg' + reg + '.jpg', 'splash_reg' + reg + '.jpg', 'boss_0' + reg + '.png'];
    var left = list.length;
    list.forEach(function (n) {
      var im = new Image();
      im.onload = im.onerror = function () { if (--left <= 0) cb && cb(); };
      im.src = 'img/' + n;
    });
  };

  document.addEventListener('DOMContentLoaded', function () { window.__stage = 'dom'; boot(); });
  /* QA / test hooks (harmless in production) */
  window.MEQA = {
    G: function () { return G; },
    swap: function (a, b, c, d) { doSwap({ r: a, c: b }, { r: c, c: d }); },
    forceWin: function () { if (!G) return; G.board.goals.forEach(function (g) { g.got = g.n; }); G.board.checkWin(); G.board.over = true; G.board.win = true; G.over = true; winFlow(); },
    forceLose: function () { if (!G) return; G.board.moves = 0; G.board.over = true; G.board.win = false; G.over = true; loseFlow(); },
    findMove: function () {
      if (!G) return null;
      var b = G.board;
      for (var r = 0; r < b.rows; r++) for (var c = 0; c < b.cols; c++) {
        if (b.swappable(r, c) && b.swappable(r, c + 1) && b.swapMakes(r, c, r, c + 1)) return [r, c, r, c + 1];
        if (b.swappable(r, c) && b.swappable(r + 1, c) && b.swapMakes(r, c, r + 1, c)) return [r, c, r + 1, c];
      }
      return null;
    }
  };
})();
