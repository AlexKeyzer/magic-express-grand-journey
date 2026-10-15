/* Magic Express — UI: screens, popups, banners, HUD */
(function () {
  'use strict';
  var D = window.MEDATA, ST = window.MEState;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function $(id) { return document.getElementById(id); }

  var UI = {
    screen: null,
    popupStack: [],
    init: function () {
      this.root = $('app');
      this.bg = $('bg');
      this.toasts = $('toasts');
      this.bannerBox = $('banner');
    },
    /* ---------- screens ---------- */
    show: function (id) {
      if (window.VKSDK) { if (id === 'game') window.VKSDK.hideBanner(); else window.VKSDK.showBanner(); }
      var olds = document.querySelectorAll('.screen.on');
      for (var i = 0; i < olds.length; i++) olds[i].classList.remove('on');
      var s = $('scr-' + id);
      if (s) { s.classList.add('on'); this.screen = id; }
      window.scrollTo(0, 0);
    },
    setBg: function (reg) {
      if (ME.ensureRegion) ME.ensureRegion(reg);
      this.bg.style.backgroundImage = 'url(img/bg_reg' + reg + '.jpg)';
      ME.audio.setRegion(reg);
    },
    /* ---------- glass panel helpers ---------- */
    glass: function (cls, html) { var e = el('div', 'glass ' + (cls || '')); if (html != null) e.innerHTML = html; return e; },
    pill: function (label, cb, cls, disabled) {
      var b = el('button', 'pill ' + (cls || ''), label);
      if (disabled) b.disabled = true;
      b.addEventListener('click', function (ev) { ev.stopPropagation(); ME.audio.sfx.tap(); cb && cb(); });
      return b;
    },
    backBtn: function (cb) {
      var b = el('button', 'back-btn', '<svg viewBox="0 0 24 24"><path fill="#fff" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z"/></svg>');
      b.addEventListener('click', function (ev) { ev.stopPropagation(); ME.audio.sfx.tap(); cb && cb(); });
      return b;
    },
    /* chest opening ceremony: shake -> burst -> rewards pop-in */
    chestOpenAnim: function (rewards, cb) {
      var p = this.popup(function (box, pp) {
        box.className += ' chest-pop';
        box.appendChild(el('div', 'p-title', ME.txt('chest')));
        var stage = el('div', 'co-stage');
        var ch = el('img', 'co-chest'); ch.src = 'img/chest_closed.png';
        stage.appendChild(ch);
        var rays = el('div', 'co-rays'); stage.appendChild(rays);
        var tray = el('div', 'co-tray'); stage.appendChild(tray);
        box.appendChild(stage);
        var row = el('div', 'row');
        var okBtn = UI.pill('OK', function () { pp.close(); cb && cb(); });
        okBtn.style.visibility = 'hidden';
        row.appendChild(okBtn);
        box.appendChild(row);
        setTimeout(function () { ch.classList.add('shake'); ME.audio.sfx.tap(); }, 250);
        setTimeout(function () {
          ch.classList.remove('shake'); ch.src = 'img/chest_open.png';
          rays.classList.add('on'); ME.audio.sfx.chest();
        }, 950);
        rewards.forEach(function (rw, i) {
          setTimeout(function () {
            var chip = el('div', 'co-chip r-' + (rw.rar || 'c'));
            chip.innerHTML = '<img src="' + rw.img + '"><span>' + rw.label + '</span>';
            tray.appendChild(chip);
            ME.audio.sfx.coin();
          }, 1250 + i * 320);
        });
        setTimeout(function () { okBtn.style.visibility = 'visible'; }, 1400 + rewards.length * 320);
      });
      return p;
    },
    /* ---------- popups (centered, springy, NO dim) ---------- */
    popup: function (build, opts) {
      opts = opts || {};
      var wrap = el('div', 'popup-wrap');
      var box = el('div', 'popup glass-panel');
      wrap.appendChild(box);
      $('popups').appendChild(wrap);
      var api = {
        box: box,
        close: function () {
          wrap.classList.add('closing');
          setTimeout(function () { wrap.remove(); }, 260);
          UI.popupStack.pop();
        }
      };
      build(box, api);
      requestAnimationFrame(function () { wrap.classList.add('in'); });
      UI.popupStack.push(api);
      return api;
    },
    closeTop: function () { if (UI.popupStack.length) UI.popupStack[UI.popupStack.length - 1].close(); },
    /* ---------- banner ---------- */
    banner: function (text, sub, col) {
      var b = el('div', 'banner', '<div class="b-main" style="color:' + (col || '#ffe9a8') + '">' + text + '</div>' + (sub ? '<div class="b-sub">' + sub + '</div>' : ''));
      this.bannerBox.appendChild(b);
      setTimeout(function () { b.classList.add('out'); }, 1500);
      setTimeout(function () { b.remove(); }, 2100);
    },
    toast: function (text, icon) {
      var t = el('div', 'toast glass', (icon ? '<img src="' + icon + '" class="t-ic">' : '') + '<span>' + text + '</span>');
      this.toasts.appendChild(t);
      setTimeout(function () { t.classList.add('out'); }, 2600);
      setTimeout(function () { t.remove(); }, 3100);
    },
    toastQuest: function () { this.toast(ME.txt('quests') + ': +', 'img/ui_coin.png'); },
    /* ---------- dialog (passenger lines, skippable) ---------- */
    dialog: function (paxIdx, lines, onDone) {
      var i = 0;
      var api = this.popup(function (box, p) {
        var typeTimer = null, typing = false, fullText = '';
        function renderLine() {
          if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
          box.innerHTML = '';
          var head = el('div', 'dlg-head');
          var im = el('img', 'dlg-av'); im.src = 'img/passenger_' + String(paxIdx + 1).padStart(2, '0') + '.png';
          head.appendChild(im);
          head.appendChild(el('div', 'dlg-name', ME.txt('paxNames')[paxIdx]));
          box.appendChild(head);
          var txt = el('div', 'dlg-text', '');
          box.appendChild(txt);
          fullText = lines[i].replace(/\{p\}/g, ME.txt('playerName'));
          typing = true;
          var ci = 0;
          typeTimer = setInterval(function () {
            ci += 1;
            txt.textContent = fullText.slice(0, ci);
            if (ci % 3 === 0) ME.audio.sfx.tap && (function(){})();
            if (ci >= fullText.length) { clearInterval(typeTimer); typeTimer = null; typing = false; }
          }, 16);
          var row = el('div', 'row');
          function advance(ev) {
            if (ev) ev.stopPropagation();
            if (typing) { clearInterval(typeTimer); typeTimer = null; typing = false; txt.textContent = fullText; return; }
            if (i < lines.length - 1) { i++; renderLine(); } else { if (typeTimer) clearInterval(typeTimer); p.close(); onDone && onDone(); }
          }
          box.onclick = advance;   /* tap anywhere: finish typing, then next line */
          row.appendChild(UI.pill(i < lines.length - 1 ? '▶' : 'OK', advance));
          row.appendChild(UI.pill(ME.L === 'ru' ? 'пропуск' : 'skip', function () { if (typeTimer) clearInterval(typeTimer); typing = false; p.close(); onDone && onDone(); }, 'ghost'));
          box.appendChild(row);
        }
        renderLine();
      });
      return api;
    },
    /* ---------- story splash & boss intro ---------- */
    regionSplash: function (reg, cb) {
      var w = el('div', 'splash');
      w.innerHTML = '<div class="sp-bg" style="background-image:url(' + (window.MEassetUrl ? window.MEassetUrl('splash_reg' + reg + '.jpg') : 'img/splash_reg' + reg + '.jpg') + ')"></div>' +
        '<div class="sp-plate glass"><div class="sp-k">' + ME.txt('station') + '</div><div class="sp-t">' + ME.txt('regions')[reg - 1] + '</div></div>' +
        '<div class="sp-tap">' + (ME.L === 'ru' ? 'тапни, чтобы продолжить' : 'tap to continue') + '</div>';
      $('app').appendChild(w);
      var done = false;
      function close() { if (done) return; done = true; w.classList.add('out'); setTimeout(function () { w.remove(); }, 450); cb && cb(); }
      w.onclick = close; setTimeout(close, 4200);
    },
    bossIntro: function (boss, cb) {
      var w = el('div', 'splash boss-splash');
      w.innerHTML = '<div class="bs-vig"></div><img class="bs-art" src="img/boss_0' + boss + '.png" alt="">' +
        '<div class="sp-plate glass red"><div class="sp-k">' + ME.txt('bossIncoming') + '</div><div class="sp-t">' + ME.txt('bosses')[boss - 1] + '</div></div>' +
        '<div class="sp-sub">' + ME.txt('bossHints')[boss - 1] + '</div>';
      $('app').appendChild(w);
      var done = false;
      function close() { if (done) return; done = true; w.classList.add('out'); setTimeout(function () { w.remove(); }, 400); cb && cb(); }
      w.onclick = close; setTimeout(close, 3600);
      ME.audio.sfx.boss();
    },
    /* ---------- confirm ---------- */
    confirm: function (text, onYes, yesLabel) {
      return this.popup(function (box, p) {
        box.appendChild(el('div', 'p-title', text));
        var row = el('div', 'row');
        row.appendChild(UI.pill(yesLabel || 'OK', function () { p.close(); onYes && onYes(); }));
        row.appendChild(UI.pill('✕', function () { p.close(); }, 'ghost'));
        box.appendChild(row);
      });
    },
    /* ---------- generic info popup ---------- */
    info: function (title, html, onClose) {
      return this.popup(function (box, p) {
        box.appendChild(el('div', 'p-title', title));
        var c = el('div', 'p-body'); c.innerHTML = html; box.appendChild(c);
        var row = el('div', 'row');
        row.appendChild(UI.pill('OK', function () { p.close(); onClose && onClose(); }));
        box.appendChild(row);
      });
    },
    coinLabel: function () { return ST.S.coins.toLocaleString('ru-RU'); }
  };
  window.MEui = UI;
  window.MEel = el;
})();
