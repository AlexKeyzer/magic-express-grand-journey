/* Magic Express — screen builders (menu, map, train, album, pax, chests, quests, settings, exp, hardcore) */
(function () {
  'use strict';
  var D = window.MEDATA, ST = window.MEState, UI = window.MEui, el = window.MEel;
  function $(id) { return document.getElementById(id); }
  function T(k) { return ME.txt(k); }

  var SC = {};
  function ic(src) { return '<img class="pill-ic" src="' + src + '" alt="">'; }
  var SVG_GEAR = '<svg class="pill-ic" viewBox="0 0 24 24"><path fill="#fff" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9.4 5.4-2.1-.8a5.6 5.6 0 0 0 0-1.2l2.1-.8a.7.7 0 0 0 .4-.9l-1-2.4a.7.7 0 0 0-.9-.4l-2.1.9a7.6 7.6 0 0 0-1-.6l-.3-2.2a.7.7 0 0 0-.7-.6h-2.6a.7.7 0 0 0-.7.6l-.3 2.2a7.6 7.6 0 0 0-1 .6l-2.1-.9a.7.7 0 0 0-.9.4l-1 2.4a.7.7 0 0 0 .4.9l2.1.8a5.6 5.6 0 0 0 0 1.2l-2.1.8a.7.7 0 0 0-.4.9l1 2.4c.15.36.56.54.9.4l2.1-.9c.32.23.66.43 1 .6l.3 2.2c.05.35.35.6.7.6h2.6c.35 0 .65-.25.7-.6l.3-2.2c.34-.17.68-.37 1-.6l2.1.9c.34.14.75-.04.9-.4l1-2.4a.7.7 0 0 0-.4-.9z"/></svg>';
  var SVG_FLAG = '<svg class="pill-ic" viewBox="0 0 24 24"><path fill="#fff" d="M6 2a1 1 0 0 1 1 1v1h11l-2.5 4L18 12H7v9a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1z"/></svg>';

  /* ================= MENU ================= */
  SC.menu = function () {
    var s = $('scr-menu'); s.innerHTML = '';
    UI.setBg(1);
    var steam = el('div', 'menu-steam', '<i></i><i></i><i></i>'); s.appendChild(steam);
    var logo = el('img', 'logo'); logo.src = 'img/logo.png'; s.appendChild(logo);
    var train = el('div', 'menu-train');
    ['01', '03', '06', '09'].forEach(function (n) {
      var ti = el('img'); ti.src = 'img/train_car_' + n + '_fixed.png'; train.appendChild(ti);
    });
    s.appendChild(train);
    s.appendChild(el('div', 'menu-title', T('title')));
    s.appendChild(el('div', 'menu-sub', T('subtitle')));
    var col = el('div', 'menu-col');
    col.appendChild(UI.pill('▶ ' + T('play'), function () { ME.openMap(); }, 'big'));
    var row1 = el('div', 'row');
    row1.appendChild(UI.pill(ic('img/train_car_01_fixed.png') + T('train'), function () { SC.train(); UI.show('train'); }));
    row1.appendChild(UI.pill(ic('img/souv_c_08.png') + T('album'), function () { SC.album(); UI.show('album'); }));
    col.appendChild(row1);
    var row2 = el('div', 'row');
    row2.appendChild(UI.pill(ic('img/passenger_01.png') + T('pax'), function () { SC.pax(); UI.show('pax'); }));
    row2.appendChild(UI.pill(ic('img/chest_closed.png') + T('chests'), function () { SC.chests(); UI.show('chests'); }));
    col.appendChild(row2);
    var row3 = el('div', 'row');
    row3.appendChild(UI.pill(ic('img/ui_star.png') + T('quests'), function () { SC.quests(); UI.show('quests'); }));
    row3.appendChild(UI.pill(SVG_GEAR + T('settings'), function () { SC.settings(); UI.show('settings'); }));
    col.appendChild(row3);
    var row4 = el('div', 'row');
    row4.appendChild(UI.pill(ic('img/souv_r_06.png') + T('expedition'), function () { SC.exp(); UI.show('exp'); }, 'ghost'));
    row4.appendChild(UI.pill(SVG_FLAG + T('hardcore'), function () { SC.hc(); UI.show('hc'); }, 'ghost'));
    col.appendChild(row4);
    var row5 = el('div', 'row');
    row5.appendChild(UI.pill(ic('img/trophy_01.png') + T('trophy'), function () { SC.trophy(); UI.show('trophy'); }, 'ghost'));
    row5.appendChild(UI.pill(ic('img/chest_open.png') + T('shop'), function () { SC.shop(); UI.show('shop'); }, 'ghost'));
    col.appendChild(row5);
    s.appendChild(col);
    var bar = el('div', 'menu-bar glass');
    bar.innerHTML = '<img src="img/ui_coin.png" class="bar-ic"><span id="menu-coins">' + UI.coinLabel() + '</span>' +
      '<img src="img/ui_star.png" class="bar-ic"><span id="menu-stars">' + totalStars() + '</span>' +
      '<img src="img/ui_glass.png" class="bar-ic hide"><span id="menu-lvl">' + T('level') + ' ' + ST.S.lvl + '/' + D.TOTAL + '</span>';
    s.appendChild(bar);
    s.appendChild(el('div', 'menu-ver', 'build ' + (ME.build || 'dev')));
    if (ST.S.daily.chestTaken !== D.dayKey()) {
      var bell = el('div', 'bell', '<img src="img/chest_closed.png" alt="">');
      bell.onclick = function () { SC.chests(); UI.show('chests'); };
      s.appendChild(bell);
    }
  };
  function totalStars() {
    var n = 0; for (var k in ST.S.stars) n += ST.S.stars[k]; return n;
  }

  /* ================= MAP ================= */
  SC.map = function () {
    var s = $('scr-map'); s.innerHTML = '';
    var curChap = D.regionOf(ST.S.lvl);
    UI.setBg(curChap);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('map') + ' · ' + ST.S.lvl + '/' + D.TOTAL + '</div><div class="h-coins"><img src="img/ui_coin.png" class="bar-ic">' + UI.coinLabel() + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var tabs = el('div', 'map-tabs');
    for (var rg = 1; rg <= 8; rg++) {
      (function (rg) {
        var locked = ST.S.lvl <= (rg - 1) * D.CHAPTER;
        var b = UI.pill(String(rg), function () { SC._chap = rg; SC.map(); }, (SC._chap || curChap) === rg ? '' : 'ghost small');
        if (locked) b.classList.add('disabled');
        tabs.appendChild(b);
      })(rg);
    }
    s.appendChild(tabs);
    var chap = SC._chap || curChap;
    SC._chap = chap;
    var world = el('div', 'map-world');
    var SEG = 64, TOP = 120, trainSeg = null, trainY = 0;
    var seg = el('div', 'map-seg' + (ST.S.lvl > (chap - 1) * D.CHAPTER ? '' : ' locked'));
    seg.style.backgroundImage = 'url(' + (window.MEassetUrl ? window.MEassetUrl('bg_reg' + chap + '.jpg') : 'img/bg_reg' + chap + '.jpg') + ')';
    seg.style.height = (TOP + D.CHAPTER * SEG + 90) + 'px';
    var got = 0;
    for (var l0 = (chap - 1) * D.CHAPTER + 1; l0 <= chap * D.CHAPTER; l0++) got += ST.S.stars[l0] || 0;
    var plate = el('div', 'map-plate glass');
    plate.innerHTML = '<b>' + T('regions')[chap - 1] + '</b><span><img src="img/ui_star.png" class="bar-ic">' + got + '/' + (D.CHAPTER * 3) + '</span>';
    seg.appendChild(plate);
    var pts = [];
    for (var i = 0; i < D.CHAPTER; i++) pts.push([50 + 36 * Math.sin(i * 0.42 + chap * 1.3), TOP + i * SEG]);
    var dpath = 'M ' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1]; }).join(' L ');
    seg.insertAdjacentHTML('beforeend',
      '<svg class="map-rails" viewBox="0 0 100 ' + (TOP + D.CHAPTER * SEG + 60) + '" preserveAspectRatio="none">' +
      '<path d="' + dpath + '" fill="none" stroke="#4a3423" stroke-width="7" vector-effect="non-scaling-stroke" opacity=".85"/>' +
      '<path d="' + dpath + '" fill="none" stroke="#e8c85a" stroke-width="2" stroke-dasharray="6 8" vector-effect="non-scaling-stroke" opacity=".8"/></svg>');
    for (var i2 = 0; i2 < D.CHAPTER; i2++) {
      (function (lvl, x, y, i3) {
        if (i3 % 25 === 0) {
          var sp = el('div', 'map-stplate glass', T('station') + ' ' + (i3 / 25 + 1));
          sp.style.left = Math.min(84, x + 26) + '%'; sp.style.top = y + 'px';
          seg.appendChild(sp);
        }
        var unlocked = lvl <= ST.S.lvl;
        var boss = D.isBoss(lvl);
        var n = el('button', 'map-node' + (unlocked ? '' : ' lk') + (boss ? ' boss' : '') + (lvl === ST.S.lvl ? ' cur' : ''));
        n.style.left = x + '%'; n.style.top = y + 'px';
        n.style.width = (boss ? 56 : 42) + 'px'; n.style.height = (boss ? 56 : 46) + 'px';
        n.dataset.lvl = lvl;
        var st = ST.S.stars[lvl] || 0;
        if (boss) n.innerHTML = '<img src="img/boss_0' + D.bossOf(lvl) + '.png" alt="">';
        else n.innerHTML = '<span class="mn-n">' + lvl + '</span><span class="mn-pips">' + (st >= 1 ? '★' : '·') + (st >= 2 ? '★' : '·') + (st >= 3 ? '★' : '·') + '</span>';
        if (unlocked) n.onclick = function () { ME.startLevel(lvl); };
        seg.appendChild(n);
        if (lvl === ST.S.lvl) {
          var tr = el('div', 'map-train');
          tr.innerHTML = '<i class="mt-steam"></i><img src="img/train_car_01_fixed.png" alt="">';
          tr.style.left = Math.min(84, x + 20) + '%'; tr.style.top = (y - 36) + 'px';
          seg.appendChild(tr);
          trainSeg = seg; trainY = y;
        }
      })((chap - 1) * D.CHAPTER + i2 + 1, pts[i2][0], pts[i2][1], i2);
    }
    world.appendChild(seg);
    s.appendChild(world);
    if (trainSeg) setTimeout(function () { world.scrollTop = Math.max(0, trainSeg.offsetTop + trainY - 340); }, 90);
    var rideFrom = ST.S._rideFrom;
    if (rideFrom && rideFrom < ST.S.lvl && trainSeg && D.regionOf(rideFrom) === chap) {
      ST.S._rideFrom = 0; ST.save();
      var trEl = trainSeg.querySelector('.map-train');
      var stepI = rideFrom;
      var tm = setInterval(function () {
        stepI++;
        var node = world.querySelector('.map-node[data-lvl="' + stepI + '"]');
        if (!node) { clearInterval(tm); return; }
        trEl.style.left = Math.min(84, parseFloat(node.style.left) + 20) + '%'; trEl.style.top = (parseInt(node.style.top, 10) - 36) + 'px';
        world.scrollTop = Math.max(0, seg.offsetTop + parseInt(node.style.top, 10) - 340);
        ME.audio.sfx.tap();
        if (stepI >= ST.S.lvl) clearInterval(tm);
      }, 110);
    }
  };

  /* ================= TRAIN ================= */
  SC.train = function () {
    var s = $('scr-train'); s.innerHTML = '';
    UI.setBg(2);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('train_title') + '</div><div class="h-coins"><img src="img/ui_coin.png" class="bar-ic">' + UI.coinLabel() + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var grid = el('div', 'train-grid');
    var doneBefore = 0;
    for (var i = 0; i < D.CARS.length; i++) {
      (function (ci) {
        var steps = ST.S.cars[ci];
        var card = el('div', 'glass car-card');
        var im = el('img', 'car-img'); im.src = 'img/train_car_' + String(ci + 1).padStart(2, '0') + '_' + (steps >= 3 ? 'fixed' : 'broken') + '.png';
        card.appendChild(im);
        card.appendChild(el('div', 'car-name', T('cars')[ci]));
        card.appendChild(el('div', 'car-steps', '●'.repeat(steps) + '○'.repeat(3 - steps)));
        card.appendChild(el('div', 'car-perk', T('perks')[ci]));
        if (steps < 3) {
          var cost = ST.carStepCost(ci);
          card.appendChild(UI.pill(T('repair') + ' · ' + cost, function () {
            if (ST.repairStep(ci)) {
              ME.audio.sfx.chest();
              if (ST.S.cars[ci] >= 3) {
                UI.banner(T('carFixedBanner') || 'ВАГОН ПОЧИНЕН!', T('cars')[ci], '#8aff8a');
                maybeCarDialog(ci);
              }
              SC.train();
            } else UI.toast('× ' + T('coins'));
          }, ST.S.coins >= cost ? '' : 'disabled'));
        } else {
          card.appendChild(el('div', 'car-done', '✓ ' + T('done')));
        }
        grid.appendChild(card);
      })(i);
    }
    s.appendChild(grid);
  };
  function maybeCarDialog(ci) {
    var lines = ME.L === 'ru'
      ? ['Вагон «' + T('cars')[ci] + '» снова в строю!', 'Перк активирован: ' + T('perks')[ci] + '.']
      : ['Car “' + T('cars')[ci] + '” is back in service!', 'Perk active: ' + T('perks')[ci] + '.'];
    UI.dialog(ci % 20, lines);
  }

  /* ================= ALBUM ================= */
  SC.album = function () {
    var s = $('scr-album'); s.innerHTML = '';
    UI.setBg(5);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('album_title') + '</div><div class="h-coins">' + Object.keys(ST.S.souv).length + '/' + D.SOUV.length + ' · +' + (Object.keys(ST.S.souv).length * 2) + '% ' + T('coins') + '</div>';
    head.title = ME.plural(Object.keys(ST.S.souv).length, ME.L === 'ru' ? ['сувенир', 'сувенира', 'сувениров'] : ['souvenir', 'souvenirs', 'souvenirs']);
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var tabs = el('div', 'alb-tabs');
    var curTab = SC._albTab || 0;
    tabs.appendChild(UI.pill(ME.L === 'ru' ? 'Все' : 'All', function () { SC._albTab = 0; SC.album(); }, curTab === 0 ? '' : 'ghost small'));
    for (var rg = 1; rg <= 8; rg++) {
      (function (rg) {
        var doneR = D.SOUV.filter(function (x) { return x.reg === rg; }).every(function (x) { return ST.S.souv[x.id]; });
        tabs.appendChild(UI.pill(rg + (doneR ? '★' : ''), function () { SC._albTab = rg; SC.album(); }, curTab === rg ? '' : 'ghost small'));
      })(rg);
    }
    s.appendChild(tabs);
    if (curTab && !ST.S.regCeleb[curTab] && D.SOUV.filter(function (x) { return x.reg === curTab; }).every(function (x) { return ST.S.souv[x.id]; })) {
      ST.S.regCeleb[curTab] = 1; ST.save();
      setTimeout(function () { UI.banner(T('region_done'), T('regions')[curTab - 1], '#8aff8a'); ME.audio.sfx.win(); }, 250);
    }
    var grid = el('div', 'souv-grid');
    D.SOUV.forEach(function (sv) {
      if (curTab && sv.reg !== curTab) return;
      var owned = !!ST.S.souv[sv.id];
      var cellEl = el('div', 'souv-cell glass' + (owned ? ' owned r-' + sv.rar : ''));
      var im = el('img'); im.src = 'img/' + D.souvFile(sv);
      if (!owned) im.style.filter = 'brightness(0.25)';
      cellEl.appendChild(im);
      cellEl.onclick = function () {
        UI.info(T('souvNames')[sv.id],
          '<div class="center">' + T('rar')[{ c: 0, r: 1, e: 2, l: 3 }[sv.rar]] + (sv.reg ? ' · ' + T('regions')[sv.reg - 1] : '') + '</div>' +
          (owned ? '' : '<div class="dim center">??? </div>'));
      };
      grid.appendChild(cellEl);
    });
    s.appendChild(grid);
    var regRow = el('div', 'reg-bonus glass');
    var txt = '';
    for (var reg = 1; reg <= 8; reg++) {
      var all = D.SOUV.filter(function (x) { return x.reg === reg; }).every(function (x) { return ST.S.souv[x.id]; });
      txt += '<span class="reg-chip' + (all ? ' ok' : '') + '">' + reg + '</span>';
    }
    regRow.innerHTML = txt + ' <span class="dim">' + (ME.L === 'ru' ? 'полный регион = рамка + 500 монет' : 'full region = frame + 500 coins') + '</span>';
    s.appendChild(regRow);
  };

  /* ================= PASSENGERS ================= */
  SC.pax = function () {
    var s = $('scr-pax'); s.innerHTML = '';
    UI.setBg(3);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('pax_title') + '</div><div class="h-coins">' + T('orders') + ': ' + ST.S.stats.orders + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var grid = el('div', 'pax-grid');
    for (var i = 0; i < D.PAX.length; i++) {
      (function (pi) {
        var met = ST.S.lvl > pi * 11;
        var c = el('div', 'glass pax-cell' + (met ? '' : ' locked'));
        var im = el('img'); im.src = 'img/passenger_' + String(pi + 1).padStart(2, '0') + '.png';
        if (!met) im.style.filter = 'brightness(0.3)';
        c.appendChild(im);
        c.appendChild(el('div', 'pax-name', met ? T('paxNames')[pi] : '???'));
        c.onclick = function () {
          if (!met) return;
          var rndLines = T('dialog').random[pi % T('dialog').random.length];
          UI.dialog(pi, rndLines);
        };
        grid.appendChild(c);
      })(i);
    }
    s.appendChild(grid);
  };

  /* ================= CHESTS ================= */
  SC.chests = function () {
    var s = $('scr-chests'); s.innerHTML = '';
    UI.setBg(8);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('chests_title') + '</div><div class="h-coins"><img src="img/ui_coin.png" class="bar-ic">' + UI.coinLabel() + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var list = el('div', 'chest-list');
    /* daily */
    var dReady = ST.dailyChestReady();
    var daily = el('div', 'glass chest-row');
    var dImg = el('img', 'chest-img'); dImg.src = 'img/chest_' + (dReady ? 'closed' : 'open') + '.png';
    daily.appendChild(dImg);
    var mid = el('div', 'cc-mid');
    mid.appendChild(el('div', 'car-name', T('daily_chest')));
    var cal = el('div', 'streak-cal');
    var cur = ((ST.S.daily.streak - 1) % 7 + 7) % 7;
    for (var ddd = 0; ddd < 7; ddd++) {
      cal.appendChild(el('span', 'sc-d' + (ddd < cur ? ' done' : ddd === cur ? ' now' : ''), String(ddd + 1)));
    }
    cal.appendChild(el('span', 'sc-d big' + (ST.S.daily.streak >= 30 ? ' done' : ''), '30★'));
    mid.appendChild(cal);
    mid.appendChild(el('div', 'dim', T('streak') + ': ' + ST.S.daily.streak + ' ' + ME.plural(ST.S.daily.streak, ME.L === 'ru' ? ['день', 'дня', 'дней'] : ['day', 'days', 'days'])));
    mid.appendChild(el('div', 'dim drops', '◆ ' + T('chestDrops')));
    daily.appendChild(mid);
    var btns = el('div', 'cc-btn');
    btns.appendChild(UI.pill(dReady ? T('open') + ' +' + Math.round(D.ECO.dailyChest * (ST.perk('dailyUp') ? 1.5 : 1)) : T('done'), function () {
      if (!dReady) return;
      var coins = ST.takeDailyChest();
      var rws = [{ img: 'img/ui_coin.png', label: '+' + coins, rar: 'c' }];
      var st = ST.S.daily.streak + (ST.perk('streakUp') ? 1 : 0);
      if (st === 7 || st === 30) {
        var g = ST.giveSouvenir('r', null);
        if (g.id != null) rws.push({ img: 'img/' + D.souvFile(D.SOUV[g.id]), label: T('souvNames')[g.id], rar: 'r' });
      }
      UI.chestOpenAnim(rws, function () { SC.chests(); });
    }, dReady ? '' : 'disabled'));
    daily.appendChild(btns);
    list.appendChild(daily);
    /* buy chest */
    var price = Math.round(D.ECO.chest * (ST.perk('chestDisc') ? 0.8 : 1));
    var buy = el('div', 'glass chest-row');
    var bImg = el('img', 'chest-img'); bImg.src = 'img/chest_closed.png';
    buy.appendChild(bImg);
    var mid2 = el('div', 'cc-mid');
    mid2.appendChild(el('div', 'car-name', T('chest')));
    mid2.appendChild(el('div', 'dim', T('chestPrice') + ': ' + price));
    mid2.appendChild(el('div', 'dim drops', '◆ ' + T('chestDrops')));
    buy.appendChild(mid2);
    var btns2 = el('div', 'cc-btn');
    btns2.appendChild(UI.pill(T('buy'), function () { openChestFlow('c', price); }));
    if (window.MESDK.supports('rewarded')) {
      btns2.appendChild(UI.pill('<span class=ad-tag>AD</span> ' + T('open'), function () {
        ME.rewarded(function (ok) { if (ok) openChestFlow('c', 0); });
      }, 'ghost'));
    }
    buy.appendChild(btns2);
    list.appendChild(buy);
    /* epic */
    var epic = el('div', 'glass chest-row');
    var eImg = el('img', 'chest-img epic'); eImg.src = 'img/chest_closed.png';
    epic.appendChild(eImg);
    var mid3 = el('div', 'cc-mid');
    mid3.appendChild(el('div', 'car-name', T('epic_chest')));
    mid3.appendChild(el('div', 'dim', T('exp_title')));
    mid3.appendChild(el('div', 'dim drops', '◆ ' + T('chestDrops')));
    epic.appendChild(mid3);
    var btns3 = el('div', 'cc-btn');
    btns3.appendChild(UI.pill(T('expedition'), function () { SC.exp(); UI.show('exp'); }, 'ghost'));
    epic.appendChild(btns3);
    list.appendChild(epic);
    s.appendChild(list);
  };
  function openChestFlow(minRar, price) {
    if (price && !ST.spend(price)) return UI.toast('× ' + T('coins'));
    var rws = [];
    var g = chestReward(minRar, true);
    if (g && g.id != null) rws.push({ img: 'img/' + D.souvFile(D.SOUV[g.id]), label: T('souvNames')[g.id], rar: g.rar });
    if (g && g.dup) rws.push({ img: 'img/ui_coin.png', label: '+' + g.coins, rar: 'c' });
    if (g && g.regionDone) rws.push({ img: 'img/ui_coin.png', label: T('region_done') + ' +500', rar: 'l' });
    var bonus = Math.round(40 + Math.random() * 60);
    ST.addCoins(bonus);
    rws.push({ img: 'img/ui_coin.png', label: '+' + bonus, rar: 'c' });
    UI.chestOpenAnim(rws, function () { SC.chests(); });
  }
  function chestReward(minRar, silent) {
    var roll = Math.random();
    var rar = minRar === 'e' ? (roll < .7 ? 'e' : 'l') : (roll < .62 ? 'c' : roll < .9 ? 'r' : roll < .98 ? 'e' : 'l');
    if (ST.perk('rareUp') && Math.random() < 0.1) rar = 'r';
    window.MESDK.event('chest_open', { rar: rar });
    var g = ST.giveSouvenir(rar, null);
    if (!silent) {
      if (g.dup) UI.toast(T('duplicate') + ' +' + g.coins, 'img/ui_coin.png');
      else {
        UI.toast(T('new_souv') + ' ' + T('souvNames')[g.id], 'img/' + D.souvFile(D.SOUV[g.id]));
        if (g.rar === 'l') ME.audio.sfx.win();
      }
      if (g.regionDone) UI.banner(T('region_done'), T('regions')[g.regionDone - 1] + ' +500', '#8aff8a');
    }
    ST.checkAch().forEach(function (a) { UI.toast(T('achievement') + ' ' + T('achNames')[a - 1], 'img/ui_star.png'); });
  }

  /* ================= QUESTS ================= */
  SC.quests = function () {
    var s = $('scr-quests'); s.innerHTML = '';
    UI.setBg(7);
    ST.rollDaily();
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('quests_title') + '</div><div class="h-coins">' + T('streak') + ' ' + ST.S.daily.streak + ' ' + T('days') + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var wrap = el('div', 'quest-wrap');
    ST.S.daily.quests.forEach(function (q) {
      var card = el('div', 'glass quest-card' + (q.done ? ' done' : ''));
      var label = T('questTpl')[{ win: 0, spec: 1, col: 2, coins: 3, whistle: 4, casc: 5 }[q.k]]
        .replace('{n}', q.n).replace('{c}', q.c != null ? T('colors')[q.c] : '');
      card.innerHTML = '<div class="q-label">' + label + '</div><div class="q-prog">' + Math.min(q.prog, q.n) + '/' + q.n + '</div>';
      var bar = el('div', 'q-bar'); bar.innerHTML = '<div class="q-fill" style="width:' + Math.min(100, q.prog / q.n * 100) + '%"></div>';
      card.appendChild(bar);
      card.appendChild(UI.pill(q.done ? (q.claimed ? T('done') : T('claim') + ' +' + Math.round(D.ECO.dailyQuest * (ST.perk('dailyUp') ? 1.5 : 1))) : '…', function () {
        if (!q.done || q.claimed) return;
        q.claimed = 1;
        ST.addCoins(D.ECO.dailyQuest * (ST.perk('dailyUp') ? 1.5 : 1));
        ME.audio.sfx.coin(); SC.quests();
      }, q.done && !q.claimed ? '' : 'disabled'));
      wrap.appendChild(card);
    });
    s.appendChild(wrap);
  };

  /* ================= SETTINGS ================= */
  SC.settings = function () {
    var s = $('scr-settings'); s.innerHTML = '';
    UI.setBg(4);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('settings_title') + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var wrap = el('div', 'set-wrap');
    function toggle(label, val, cb) {
      var row = el('div', 'glass set-row');
      row.appendChild(el('div', 'q-label', label));
      row.appendChild(UI.pill(val ? 'ON' : 'OFF', function () { cb(!val); SC.settings(); }, val ? '' : 'ghost'));
      wrap.appendChild(row);
    }
    toggle(T('sound'), !ST.S.settings.mute, function (v) { ST.S.settings.mute = !v; ME.audio.setMuted(!v); ST.save(true); });
    toggle(T('music'), ST.S.settings.music, function (v) { ST.S.settings.music = v; ME.audio.setMusic(v); ST.save(true); });
    toggle(ME.L === 'ru' ? 'Эффекты (полные)' : 'Full effects', ST.S.settings.fx !== false, function (v) { ST.S.settings.fx = v; ST.save(true); });
    var langRow = el('div', 'glass set-row');
    langRow.appendChild(el('div', 'q-label', T('language')));
    langRow.appendChild(UI.pill('RU / EN', function () { ME.setLang(ME.L === 'ru' ? 'en' : 'ru'); SC.settings(); }));
    wrap.appendChild(langRow);
    if (!window.MESDK.supports('rewarded')) {
      wrap.appendChild(el('div', 'glass set-row dim', '<div class="q-label">Ads: n/a (fallback mode)</div>'));
    }
    wrap.appendChild(UI.pill(T('reset'), function () {
      UI.confirm(T('reset_q'), function () { ST.reset(); location.reload(); }, 'YES');
    }, 'danger'));
    s.appendChild(wrap);
    s.appendChild(el('div', 'ver', 'Magic Express: Grand Journey v1.0'));
  };

  /* ================= EXPEDITION ================= */
  SC.exp = function () {
    var s = $('scr-exp'); s.innerHTML = '';
    UI.setBg(6);
    ST.rollDaily();
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('exp_title') + '</div><div class="h-coins">' + T('tokens') + ': ' + ST.S.week.tokens + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    head.appendChild(UI.pill('(i)', function () { UI.info(T('exp_title'), '<div class="center">' + T('expHelp') + '</div>'); }, 'ghost small'));
    var track = el('div', 'exp-track glass');
    var pct = Math.min(100, ST.S.week.tokens / D.EXP_STEPS[D.EXP_STEPS.length - 1] * 100);
    track.innerHTML = '<div class="et-fill" style="width:' + pct + '%"></div>' + D.EXP_STEPS.map(function (st, i) {
      var claimed = ST.S.week.claimed.indexOf(i) >= 0;
      return '<span class="et-node' + (claimed ? ' done' : ST.S.week.tokens >= st ? ' ready' : '') + '" style="left:' + (st / D.EXP_STEPS[D.EXP_STEPS.length - 1] * 100) + '%"></span>';
    }).join('');
    s.appendChild(track);
    var wrap = el('div', 'exp-wrap');
    D.EXP_STEPS.forEach(function (st, i) {
      var claimed = ST.S.week.claimed.indexOf(i) >= 0;
      var card = el('div', 'glass exp-card' + (claimed ? ' done' : ''));
      card.innerHTML = '<div class="q-prog">' + st + ' ' + T('tokens') + '</div>';
      var rw = D.EXP_REWARDS[i];
      card.appendChild(el('div', 'q-label', rw.coins ? '+' + rw.coins + ' ' + T('coins') : rw.booster ? T('boost_hammer') : T('epic_chest')));
      card.appendChild(UI.pill(claimed ? T('expClaimed') : T('claim'), function () {
        var r = ST.expClaim(i);
        if (!r) return;
        if (r.chest === 'epic') { openChestAnim(function () { chestReward('e'); SC.exp(); }); }
        else { ME.audio.sfx.coin(); SC.exp(); }
      }, claimed ? 'disabled' : (ST.S.week.tokens >= st ? '' : 'disabled')));
      wrap.appendChild(card);
    });
    s.appendChild(wrap);
    s.appendChild(el('div', 'exp-hint', T('expHow')));
    s.appendChild(el('div', 'ver', T('week_left') + ': ' + daysToWeekEnd() + ' ' + T('days')));
    if (!ST.S.expSeen) {
      ST.S.expSeen = 1; ST.save();
      setTimeout(function () { UI.info(T('exp_title'), '<div class="center">' + T('expHelp') + '</div>'); }, 400);
    }
  };
  function daysToWeekEnd() {
    var d = new Date(); var day = (d.getUTCDay() + 6) % 7;
    return 7 - day;
  }

  /* ================= SHOP (VK votes) ================= */
  var SHOP = [
    { id: 'me_starter', votes: 10, grant: function () { ST.addCoins(500, true); ST.S.boosters.hammer += 2; ST.S.boosters.shuffle += 1; return [{ img: 'img/ui_coin.png', label: '+500', rar: 'c' }, { img: 'img/ic_hammer.png', label: '×2', rar: 'r' }, { img: 'img/ic_shuffle.png', label: '×1', rar: 'r' }]; } },
    { id: 'me_coins_300', votes: 5, grant: function () { ST.addCoins(300, true); return [{ img: 'img/ui_coin.png', label: '+300', rar: 'c' }]; } },
    { id: 'me_coins_1000', votes: 12, grant: function () { ST.addCoins(1000, true); return [{ img: 'img/ui_coin.png', label: '+1000', rar: 'r' }]; } },
    { id: 'me_mega', votes: 30, grant: function () { ST.addCoins(3000, true); var g = ST.giveSouvenir('e', null); var rw = [{ img: 'img/ui_coin.png', label: '+3000', rar: 'l' }]; if (g && g.id != null) rw.push({ img: 'img/' + D.souvFile(D.SOUV[g.id]), label: T('souvNames')[g.id], rar: 'e' }); return rw; } }
  ];
  SC.shop = function () {
    var s = $('scr-shop');
    if (!s) { s = el('div', 'screen'); s.id = 'scr-shop'; $('app').appendChild(s); }
    s.innerHTML = '';
    UI.setBg(5);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('shop') + '</div><div class="h-coins"><img src="img/ui_coin.png" class="bar-ic">' + UI.coinLabel() + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var list = el('div', 'chest-list');
    SHOP.forEach(function (it) {
      var row = el('div', 'glass chest-row');
      var im = el('img', 'chest-img'); im.src = 'img/chest_closed.png';
      row.appendChild(im);
      var mid = el('div', 'cc-mid');
      mid.appendChild(el('div', 'car-name', T('shopNames')[SHOP.indexOf(it)]));
      mid.appendChild(el('div', 'dim', T('shopDescs')[SHOP.indexOf(it)]));
      row.appendChild(mid);
      var btns = el('div', 'cc-btn');
      btns.appendChild(UI.pill(it.votes + ' ★', function () {
        if (!window.VKSDK || !window.VKSDK.inVK()) { UI.info(T('shop'), '<div class="center">' + T('vkOnly') + '</div>'); return; }
        window.VKSDK.purchase(it.id, function (ok) {
          if (!ok) return;
          window.MESDK.event('purchase', { item: it.id, votes: it.votes });
          var rws = it.grant();
          ST.save(true);
          UI.chestOpenAnim(rws, function () { SC.shop(); });
        });
      }));
      row.appendChild(btns);
      list.appendChild(row);
    });
    s.appendChild(list);
    s.appendChild(el('div', 'exp-hint', T('shopNote')));
  };

  /* ================= TROPHY TRAIN ================= */
  SC.trophy = function () {
    var s = $('scr-trophy');
    if (!s) { s = el('div', 'screen'); s.id = 'scr-trophy'; $('app').appendChild(s); }
    s.innerHTML = '';
    UI.setBg(1);
    var head = el('div', 'glass head');
    var gotN = D.TROPHIES.filter(function (tr) { try { return tr.check(ST.S); } catch (e) { return false; } }).length;
    head.innerHTML = '<div class="h-title">' + T('trophyTitle') + ' · ' + gotN + '/' + D.TROPHIES.length + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    var wrap = el('div', 'tr-wrap');
    var loco = el('img', 'tr-loco'); loco.src = 'img/train_car_01_fixed.png';
    wrap.appendChild(loco);
    var catNames = [ME.L === 'ru' ? 'Кубки боссов' : 'Boss cups', ME.L === 'ru' ? 'Кубки регионов' : 'Region cups', ME.L === 'ru' ? 'Кубки подвигов' : 'Feat cups'];
    var carImgs = ['train_car_12_fixed.png', 'train_car_08_fixed.png', 'train_car_07_fixed.png'];
    for (var cat = 0; cat < 3; cat++) {
      var car = el('div', 'tr-car');
      var bg = el('img', 'tr-car-img'); bg.src = 'img/' + carImgs[cat];
      car.appendChild(bg);
      car.appendChild(el('div', 'tr-cat', catNames[cat]));
      var slots = el('div', 'tr-slots');
      D.TROPHIES.filter(function (t2) { return t2.cat === cat; }).forEach(function (t2) {
        var un = false; try { un = t2.check(ST.S); } catch (e) {}
        var sl = el('button', 'tr-slot' + (un ? ' got cat' + cat : ' cat' + cat));
        sl.innerHTML = '<img src="img/trophy_0' + (t2.idx + 1) + '.png" alt="">';
        sl.onclick = function () {
          UI.info(T('trophyNames')[D.TROPHIES.indexOf(t2)], '<div class="center">' + T('trophyDesc')[D.TROPHIES.indexOf(t2)] + '</div>' + (un ? '' : '<div class="dim center">' + T('trophyLocked') + '</div>'));
        };
        slots.appendChild(sl);
      });
      car.appendChild(slots);
      wrap.appendChild(car);
    }
    s.appendChild(wrap);
    s.appendChild(el('div', 'ver', T('trophy') + ': ' + gotN + '/' + D.TROPHIES.length));
  };

  /* ================= HARDCORE ================= */
  SC.hc = function () {
    var s = $('scr-hc'); s.innerHTML = '';
    UI.setBg(6);
    var head = el('div', 'glass head');
    head.innerHTML = '<div class="h-title">' + T('hc_title') + '</div><div class="h-coins">' + T('hc_best') + ': ' + ST.S.stats.hcBest + '</div>';
    head.appendChild(UI.backBtn(function () { SC.menu(); UI.show('menu'); }));
    s.appendChild(head);
    s.appendChild(el('div', 'glass hc-desc', T('hc_desc')));
    var board = el('div', 'glass hc-board');
    var rows = ST.S.hcBoard.length ? ST.S.hcBoard : [ST.S.stats.hcBest];
    board.innerHTML = '<div class="h-title small">' + T('leader') + '</div>' + rows.slice(0, 8).map(function (v, i) {
      return '<div class="hc-row' + (i === 0 ? ' top' : '') + '">' + (i + 1) + '. ' + v + (v === ST.S.stats.hcBest ? ' ← ' + T('you') : '') + '</div>';
    }).join('');
    s.appendChild(board);
    window.MESDK.top('conductor', function (list) {
      if (!list || !list.length) return;
      var gb = el('div', 'glass hc-board');
      gb.innerHTML = '<div class="h-title small">' + T('leader') + ' · GamePush</div>' + list.slice(0, 8).map(function (e, i) {
        var nm = (e && (e.player && e.player.name)) || (e && e.name) || ('#' + (i + 1));
        var sc = (e && e.score) || 0;
        return '<div class="hc-row' + (i === 0 ? ' top' : '') + '">' + (i + 1) + '. ' + nm + ' — ' + sc + '</div>';
      }).join('');
      s.insertBefore(gb, s.querySelector('.pill.big') || null);
    });
    s.appendChild(UI.pill('▶ ' + T('hc_start'), function () { ME.startHardcore(); }, 'big'));
  };

  window.MEScreens = SC;
  window.MEchestReward = chestReward;
})();
