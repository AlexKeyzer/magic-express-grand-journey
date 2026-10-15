/* ============================================================
   Magic Express — VK adapter v2 (pattern proven by live VK games)
   - official @vkontakte/vk-bridge loaded dynamically from 2 mirrors
   - native ads API: VKWebAppCheckNativeAds / VKWebAppShowNativeAds
   - banner: VKWebAppShowBannerAd / HideBannerAd
   - payments: VKWebAppShowOrderBox / GetBalance
   - storage: VKWebAppStorageGet/Set
   - micro-bridge postMessage only as last-resort fallback
   Every call is safe outside VK (GitHub Pages standalone).
   ============================================================ */
(function () {
  'use strict';

  var BRIDGE_URLS = [
    'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js',
    'https://cdn.jsdelivr.net/npm/@vkontakte/vk-bridge/dist/browser.min.js'
  ];

  var VK = {
    vkBridge: null,
    _started: false, _bannerOn: false, _initAck: false,
    sessionStart: Date.now(), lastInter: 0,
    onHide: null
  };

  function inIframe() { try { return window.top !== window.self; } catch (e) { return true; } }
  function offBridge() { return !!(VK.vkBridge && typeof VK.vkBridge.send === 'function'); }

  VK.inVK = function () {
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.has('vk_app_id') || p.has('vk_user_id')) return true;
      var r = document.referrer || '';
      if (r.indexOf('vk.com') >= 0 || r.indexOf('vk.ru') >= 0) return true;
      var ua = navigator.userAgent || '';
      if (ua.indexOf('VK') >= 0 || ua.indexOf('VKontakte') >= 0) return true;
      return inIframe();
    } catch (e) { return false; }
  };

  /* ---------- micro-bridge fallback (last resort) ---------- */
  var _cb = 0, _pending = {};
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    if (!d) return;
    if (d.type === 'vk-connect-result' && d.data) {
      var p = _pending[d.data.callbackId];
      if (p) { delete _pending[d.data.callbackId]; if (d.data.error) p.rej(d.data.error); else p.res(d.data.result); }
      VK._initAck = true;
      return;
    }
    if (/VKWebApp/.test(d.type || '')) VK._initAck = true;
  });
  function microSend(method, params) {
    return new Promise(function (res, rej) {
      if (!inIframe()) { rej(new Error('not in iframe')); return; }
      var id = ++_cb;
      _pending[id] = { res: res, rej: rej };
      try {
        window.parent.postMessage(JSON.stringify({
          type: 'vk-connect',
          data: { handlerType: 'iframe', method: method, params: params || {}, callbackId: id }
        }), '*');
      } catch (e) { delete _pending[id]; rej(e); }
      setTimeout(function () { if (_pending[id]) { delete _pending[id]; rej(new Error('timeout')); } }, 8000);
    });
  }

  function send(method, params) {
    if (offBridge()) {
      try { return Promise.resolve(VK.vkBridge.send(method, params || {})); }
      catch (e) { return Promise.reject(e); }
    }
    return microSend(method, params);
  }

  /* ---------- non-blocking bridge loader: 2 mirrors + timeout ---------- */
  function loadBridge(cb) {
    var idx = 0, done = false;
    function next() {
      if (done) return;
      if (idx >= BRIDGE_URLS.length) { done = true; cb(null); return; }
      var s = document.createElement('script');
      s.src = BRIDGE_URLS[idx]; s.async = true;
      var to = setTimeout(function () { s.onload = s.onerror = null; idx++; next(); }, 4000);
      s.onload = function () {
        clearTimeout(to);
        if (done) return;
        done = true;
        cb(window.vkBridge || null);
      };
      s.onerror = function () { clearTimeout(to); idx++; next(); };
      (document.head || document.documentElement).appendChild(s);
    }
    next();
  }

  function fireInit() { send('VKWebAppInit').catch(function () {}); }

  VK.init = function () {
    if (VK._started) return;
    VK._started = true;
    if (inIframe()) fireInit();                       /* asap attempt */
    loadBridge(function (br) {
      if (br) {
        VK.vkBridge = br;
        fireInit(); fireInit();                        /* through official protocol */
        try {
          if (br.subscribe) br.subscribe(function (ev) {
            var t = ev && ev.detail && ev.detail.type;
            if (t === 'VKWebAppViewHide' && VK.onHide) VK.onHide();
          });
        } catch (e) {}
        VK.signalReady();
      }
    });
    var t0 = Date.now();                               /* retry until ack / 20 s */
    var iv = setInterval(function () {
      if (VK._initAck || Date.now() - t0 > 20000) { clearInterval(iv); return; }
      fireInit();
    }, 800);
  };

  VK.signalReady = function () {
    send('VKWebAppSetViewSettings', { status_bar_style: 'dark', action_bar_color: '#000000' }).catch(function () {});
  };

  /* ---------- banner ads ---------- */
  VK.showBanner = function () {
    if (VK._bannerOn) return;
    VK._bannerOn = true;
    send('VKWebAppShowBannerAd', { placement: 'bottom' }).catch(function () { VK._bannerOn = false; });
  };
  VK.hideBanner = function () {
    if (!VK._bannerOn) return;
    VK._bannerOn = false;
    send('VKWebAppHideBannerAd').catch(function () {});
  };

  /* ---------- native ads: rewarded & interstitial (proven API) ---------- */
  VK.checkAds = function (fmt, cb) {
    send('VKWebAppCheckNativeAds', { ad_format: fmt })
      .then(function (d) { cb && cb(!!(d && d.result)); })
      .catch(function () { cb && cb(false); });
  };
  VK.rewarded = function (cb) {
    if (!VK.inVK()) { cb && cb(false); return; }
    var settled = false;
    function done(ok) { if (settled) return; settled = true; cb && cb(ok); }
    VK.checkAds('reward', function (has) {
      if (!has) { done(false); return; }
      send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then(function (r) { done(!!(r && r.result)); })
        .catch(function () { done(false); });
    });
    setTimeout(function () { done(false); }, 60000);
  };
  VK.interstitial = function () {
    if (!VK.inVK()) return;
    var now = Date.now();
    if (now - VK.sessionStart < 120000) return;      /* no ads first 2 min */
    if (now - VK.lastInter < 180000) return;         /* 3 min cooldown */
    VK.lastInter = now;
    send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }).catch(function () {});
  };

  /* ---------- payments (votes) ---------- */
  VK.purchase = function (item, cb) {
    send('VKWebAppShowOrderBox', { item: item, type: 'item' })
      .then(function (r) { cb && cb(!!(r && (r.result === true || r.status === 'paid' || r.transactionId))); })
      .catch(function () { cb && cb(false); });
  };
  VK.getBalance = function (cb) {
    send('VKWebAppGetBalance').then(function (r) { cb && cb(r && r.balance != null ? +r.balance : null); }).catch(function () { cb && cb(null); });
  };

  /* ---------- cloud storage ---------- */
  VK.storageGet = function (key, cb) {
    send('VKWebAppStorageGet', { keys: [key] })
      .then(function (r) { cb && cb(r && r.keys && r.keys.length ? r.keys[0].value : null); })
      .catch(function () { cb && cb(null); });
  };
  VK.storageSet = function (key, value, cb) {
    send('VKWebAppStorageSet', { key: key, value: value }).then(function () { cb && cb(true); }).catch(function () { cb && cb(false); });
  };

  VK.event = function () {};   /* analytics no-op, platform-side */

  window.VKSDK = VK;
  if (inIframe()) VK.init();
  document.addEventListener('DOMContentLoaded', function () { VK.init(); });
})();
