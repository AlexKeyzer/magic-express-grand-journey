/* ============================================================
   Magic Express: Grand Journey — GamePush SDK wrapper
   Every SDK point has a safe fallback: the game never crashes
   without SDK / with adblock / offline.
   ============================================================ */
(function () {
  'use strict';
  var GP = window.gp || null;

  var SDK = {
    ready: false,
    has: function (path) {
      if (!GP) return false;
      var parts = path.split('.');
      var cur = GP;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || cur[parts[i]] == null) return false;
        cur = cur[parts[i]];
      }
      return true;
    },
    call: function (path, args) {
      if (!SDK.has(path)) return null;
      try {
        var parts = path.split('.');
        var fn = GP;
        for (var i = 0; i < parts.length - 1; i++) fn = fn[parts[i]];
        return fn.apply(fn, args || []);
      } catch (e) { return null; }
    },
    /* ---- lifecycle ---- */
    gameStart: function () { SDK.call('game.gameStart', []); },          // GameReady
    gameStop: function () { SDK.call('game.gameStop', []); },
    gameplayStart: function () { SDK.call('game.gameplayStart', []); },
    gameplayStop: function () { SDK.call('game.gameplayStop', []); },
    pauseEvents: function (cb) {
      try {
        if (GP && GP.on) {
          GP.on('game_pause', function () { cb(true); });
          GP.on('game_resume', function () { cb(false); });
        }
      } catch (e) {}
    },
    /* ---- language ---- */
    language: function () {
      var l = null;
      try { l = GP && GP.language; } catch (e) {}
      if (!l && typeof navigator !== 'undefined') l = navigator.language;
      l = (l || 'en').toLowerCase().slice(0, 2);
      return l === 'ru' ? 'ru' : (l === 'en' ? 'en' : 'en');
    },
    /* ---- cloud save: ONE player field ---- */
    saveSet: function (obj) {
      var str = JSON.stringify(obj);
      if (SDK.has('player.set')) {
        try { GP.player.set('save', str); SDK.call('player.sync', []); return true; } catch (e) {}
      }
      if (window.VKSDK) { window.VKSDK.storageSet('save', str); }
      try { localStorage.setItem('me_save', str); } catch (e) {}
      return false;
    },
    saveGet: function () {
      if (SDK.has('player.get')) {
        try {
          var v = GP.player.get('save');
          if (v) return JSON.parse(v);
        } catch (e) {}
      }
      try {
        var l = localStorage.getItem('me_save');
        if (l) return JSON.parse(l);
      } catch (e) {}
      return null;   /* VK storage is async: merged at boot via ME.vkLoadSave() */
    },
    /* ---- ads ---- */
    rewarded: function (onDone, onFail) {
      if (SDK.has('adv.rewardedVideo')) {
        try {
          GP.adv.rewardedVideo({
            onOpen: function () { ME.audio.suspend(); },
            onRewarded: function () { ME.audio.resume(); onDone && onDone(true); },
            onClose: function () { ME.audio.resume(); },
            onError: function () { ME.audio.resume(); onFail && onFail(); }
          });
          return;
        } catch (e) {}
      }
      // fallback: pretend a short ad played (keeps economy playable offline)
      setTimeout(function () { onDone && onDone(false); }, 700);
    },
    interstitialOk: (function () {
      var last = 0; var sessionStart = Date.now();
      return function () {
        var now = Date.now();
        if (now - sessionStart < 60000) return false;      // no interstitial first 60 s
        if (now - last < 180000) return false;              // cooldown 180 s
        if (!SDK.has('adv.showInterstitialVideo')) return false;
        last = now;
        return true;
      };
    })(),
    interstitial: function () {
      if (!SDK.interstitialOk()) return;
      try {
        GP.adv.showInterstitialVideo({ onOpen: function () { ME.audio.suspend(); }, onClose: function () { ME.audio.resume(); }, onError: function () {} });
      } catch (e) {}
    },
    /* ---- analytics (silent no-op without platform) ---- */
    event: function (name, params) {
      try {
        if (GP && GP.analytics && GP.analytics.event) { GP.analytics.event(name, params || {}); return; }
        if (GP && GP.logEvent) GP.logEvent(name, params || {});
      } catch (e) {}
    },
    /* ---- leaderboard ---- */
    top: function (id, cb) {
      if (SDK.has('leaderboard.get')) {
        try {
          var pr = GP.leaderboard.get(id, { count: 10 });
          if (pr && pr.then) { pr.then(function (list) { cb && cb(list || []); }).catch(function () { cb && cb(null); }); return; }
          cb && cb(pr || []);
          return;
        } catch (e) {}
      }
      cb && cb(null);
    },
    leaderboardSubmit: function (id, score) {
      if (SDK.has('leaderboard.submit')) { try { GP.leaderboard.submit(id, score); return true; } catch (e) {} }
      return false;
    },
    /* ---- platform features ---- */
    supports: function (what) {
      if (what === 'rewarded') return SDK.has('adv.rewardedVideo');
      if (what === 'leaderboard') return SDK.has('leaderboard.submit');
      if (what === 'player') return SDK.has('player.set');
      return false;
    },
    /* ---- audio prefs from platform ---- */
    platformMuted: function () {
      try { if (GP && GP.variables && GP.variables.muted) return true; } catch (e) {}
      return false;
    }
  };
  window.MESDK = SDK;
})();
