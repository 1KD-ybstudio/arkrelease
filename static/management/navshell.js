(function () {
  if (window.NS_NOTIF) return;
  var store = [];
  try { store = JSON.parse(localStorage.getItem('ns_notif_center') || '[]'); } catch (e) {}
  var MAX = 50, panelOpen = false;
  var ICONS = { mention: '@', dm: '💬', error: '⚠️', warning: '⚠️', update: '🛈' };
  function save() { try { localStorage.setItem('ns_notif_center', JSON.stringify(store.slice(0, MAX))); } catch (e) {} }
  function badge() {
    var n = store.filter(function (x) { return !x.read; }).length;
    document.querySelectorAll('.ns-notif-badge').forEach(function (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.style.display = n > 0 ? 'flex' : 'none';
    });
  }
  function renderPanel(p) {
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));"><strong style="color:var(--text,#fff);font-size:.85rem;">Notifications</strong><button class="secondary-btn" style="font-size:.7rem;padding:4px 10px;" onclick="NS_NOTIF.clearAll()">Clear</button></div>' +
      '<div style="overflow-y:auto;max-height:60vh;padding:6px;">' +
      (store.length ? store.map(function (x, i) {
        return '<div style="display:flex;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:' + (x.read ? 'transparent' : 'rgba(0,212,170,.08)') + ';border:1px solid rgba(255,255,255,.06);cursor:pointer;" onclick="NS_NOTIF.read(' + i + ')">' +
          '<span style="font-size:14px;">' + (ICONS[x.type] || '🛈') + '</span>' +
          '<div style="min-width:0;flex:1;"><div style="font-size:.8rem;font-weight:600;color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(x.title) + '</div>' +
          (x.body ? '<div style="font-size:.72rem;color:var(--text-muted,#8b90a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(x.body) + '</div>' : '') +
          '<div style="font-size:.62rem;color:var(--text-muted,#8b90a8);margin-top:2px;">' + new Date(x.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div></div></div>';
      }).join('') : '<div style="color:var(--text-muted,#8b90a8);font-size:.8rem;padding:20px;text-align:center;">No notifications yet</div>') +
      '</div>';
  }
  function makeBell(id) {
    var b = document.createElement('button');
    b.id = id;
    b.className = 'header-btn';
    b.title = 'Notifications';
    b.style.position = 'relative';
    b.innerHTML = '🔔<span class="ns-notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--danger,#f23f43);color:#fff;font:700 9px monospace;min-width:16px;height:16px;border-radius:999px;align-items:center;justify-content:center;padding:0 4px;"></span>';
    b.onclick = function (e) { e.stopPropagation(); NS_NOTIF.toggle(b); };
    return b;
  }
  window.softRefresh = function () {
    if (typeof refreshCurrentView === 'function') { refreshCurrentView(); return; }
    if (window.AppState && AppState.currentPage && typeof navigate === 'function') { navigate(AppState.currentPage); return; }
    location.reload();
  };
  window.NS_NOTIF = {
    push: function (type, title, body) {
      store.unshift({ type: type, title: title, body: body || '', ts: Date.now(), read: false });
      store = store.slice(0, MAX);
      save(); badge();
      var p = document.getElementById('ns-notif-panel');
      if (p && panelOpen) renderPanel(p);
    },
    read: function (i) { if (store[i]) { store[i].read = true; save(); badge(); var p = document.getElementById('ns-notif-panel'); if (p) renderPanel(p); } },
    clearAll: function () { store = []; save(); badge(); var p = document.getElementById('ns-notif-panel'); if (p) renderPanel(p); },
    toggle: function (anchor) {
      var old = document.getElementById('ns-notif-panel');
      if (old) { old.remove(); panelOpen = false; return; }
      var p = document.createElement('div');
      p.id = 'ns-notif-panel';
      p.style.cssText = 'position:fixed;z-index:10070;width:320px;max-width:92vw;background:var(--glass-bg,#12141f);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);overflow:hidden;';
      var r = anchor.getBoundingClientRect();
      p.style.top = Math.min(r.bottom + 8, window.innerHeight - 80) + 'px';
      p.style.left = Math.max(8, Math.min(r.left - 140, window.innerWidth - 330)) + 'px';
      document.body.appendChild(p);
      panelOpen = true;
      renderPanel(p);
      setTimeout(function () {
        document.addEventListener('click', function h(e) {
          if (!e.target.closest('#ns-notif-panel') && !e.target.closest('.ns-notif-anchor')) { p.remove(); panelOpen = false; document.removeEventListener('click', h); }
        });
      }, 50);
    }
  };
  (function wrapPush() {
    var orig = window.pushNotification;
    if (!orig || orig.__nsWrapped) return;
    var w = function (title, sub, type, duration) {
      var low = String(title || '').toLowerCase();
      var transient = /copied|sent|posted|idle|saved|loading|refresh|microphone/i.test(low);
      var conn = /bot not connected|not connected|reconnect/i.test(low);
      if (conn) {
        var now = Date.now();
        if (!w._lc || now - w._lc > 60000) { w._lc = now; NS_NOTIF.push('error', title, sub || ''); }
      } else if (!transient && (type === 'error' || type === 'warning')) {
        NS_NOTIF.push(type, title, sub || '');
      }
      return orig.apply(this, arguments);
    };
    w.__nsWrapped = true;
    window.pushNotification = w;
  })();
  (function wrapShowNotif() {
    var orig = window.showNotif;
    if (!orig || orig.__nsWrapped) return;
    var w = function (kind, msg) {
      if (msg) {
        var who = msg.display_name || msg.author || 'Someone';
        var text = msg.content_raw || '';
        NS_NOTIF.push(kind === 'dm' ? 'dm' : 'mention', (kind === 'dm' ? 'DM from ' : 'Mention from ') + who, text.slice(0, 80));
      }
      return orig.apply(this, arguments);
    };
    w.__nsWrapped = true;
    window.showNotif = w;
  })();
  function ensureUI() {
    var rail = document.querySelector('#server-rail') || document.querySelector('.server-rail') || document.querySelector('#ns-server-rail');
    if (rail && !rail.querySelector('#ns-notif-btn-rail')) {
      var top = rail.firstElementChild;
      if (top) top.style.display = 'none';
      var bell = makeBell('ns-notif-btn-rail');
      bell.classList.add('ns-notif-anchor');
      rail.insertBefore(bell, rail.firstChild);
    }
    var bar = document.querySelector('.page-top-bar') || (document.querySelector('.page-title') && document.querySelector('.page-title').parentElement);
    if (bar && !bar.querySelector('#ns-notif-btn')) {
      bar.style.display = 'flex'; bar.style.alignItems = 'center'; bar.style.gap = '8px';
      var b2 = makeBell('ns-notif-btn');
      b2.classList.add('ns-notif-anchor');
      bar.insertBefore(b2, bar.firstChild);
      var rf = document.createElement('button');
      rf.className = 'header-btn';
      rf.title = 'Refresh';
      rf.textContent = '↻';
      rf.onclick = function () { softRefresh(); };
      bar.appendChild(rf);
    }
    badge();
  }
  setInterval(ensureUI, 1500);
  ensureUI();
})();

(function () {
  if (window.NS_NOTIF) return;
  var store = [];
  try { store = JSON.parse(localStorage.getItem('ns_notif_center') || '[]'); } catch (e) {}
  var MAX = 50, panelOpen = false;
  var ICONS = { mention: '@', dm: '💬', error: '⚠️', warning: '⚠️', update: '🛈' };
  function save() { try { localStorage.setItem('ns_notif_center', JSON.stringify(store.slice(0, MAX))); } catch (e) {} }
  function badge() {
    var n = store.filter(function (x) { return !x.read; }).length;
    document.querySelectorAll('.ns-notif-badge').forEach(function (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.style.display = n > 0 ? 'flex' : 'none';
    });
  }
  function renderPanel(p) {
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));"><strong style="color:var(--text,#fff);font-size:.85rem;">Notifications</strong><button class="secondary-btn" style="font-size:.7rem;padding:4px 10px;" onclick="NS_NOTIF.clearAll()">Clear</button></div>' +
      '<div style="overflow-y:auto;max-height:60vh;padding:6px;">' +
      (store.length ? store.map(function (x, i) {
        return '<div style="display:flex;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:' + (x.read ? 'transparent' : 'rgba(0,212,170,.08)') + ';border:1px solid rgba(255,255,255,.06);cursor:pointer;" onclick="NS_NOTIF.read(' + i + ')">' +
          '<span style="font-size:14px;">' + (ICONS[x.type] || '🛈') + '</span>' +
          '<div style="min-width:0;flex:1;"><div style="font-size:.8rem;font-weight:600;color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(x.title) + '</div>' +
          (x.body ? '<div style="font-size:.72rem;color:var(--text-muted,#8b90a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(x.body) + '</div>' : '') +
          '<div style="font-size:.62rem;color:var(--text-muted,#8b90a8);margin-top:2px;">' + new Date(x.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div></div></div>';
      }).join('') : '<div style="color:var(--text-muted,#8b90a8);font-size:.8rem;padding:20px;text-align:center;">No notifications yet</div>') +
      '</div>';
  }
  function makeBell(id) {
    var b = document.createElement('button');
    b.id = id;
    b.className = 'header-btn';
    b.title = 'Notifications';
    b.style.position = 'relative';
    b.innerHTML = '🔔<span class="ns-notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--danger,#f23f43);color:#fff;font:700 9px monospace;min-width:16px;height:16px;border-radius:999px;align-items:center;justify-content:center;padding:0 4px;"></span>';
    b.onclick = function (e) { e.stopPropagation(); NS_NOTIF.toggle(b); };
    return b;
  }
  window.softRefresh = function () {
    if (typeof refreshCurrentView === 'function') { refreshCurrentView(); return; }
    if (window.AppState && AppState.currentPage && typeof navigate === 'function') { navigate(AppState.currentPage); return; }
    location.reload();
  };
  window.NS_NOTIF = {
    push: function (type, title, body) {
      store.unshift({ type: type, title: title, body: body || '', ts: Date.now(), read: false });
      store = store.slice(0, MAX);
      save(); badge();
      var p = document.getElementById('ns-notif-panel');
      if (p && panelOpen) renderPanel(p);
    },
    read: function (i) { if (store[i]) { store[i].read = true; save(); badge(); var p = document.getElementById('ns-notif-panel'); if (p) renderPanel(p); } },
    clearAll: function () { store = []; save(); badge(); var p = document.getElementById('ns-notif-panel'); if (p) renderPanel(p); },
    toggle: function (anchor) {
      var old = document.getElementById('ns-notif-panel');
      if (old) { old.remove(); panelOpen = false; return; }
      var p = document.createElement('div');
      p.id = 'ns-notif-panel';
      p.style.cssText = 'position:fixed;z-index:10070;width:320px;max-width:92vw;background:var(--glass-bg,#12141f);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);overflow:hidden;';
      var r = anchor.getBoundingClientRect();
      p.style.top = Math.min(r.bottom + 8, window.innerHeight - 80) + 'px';
      p.style.left = Math.max(8, Math.min(r.left - 140, window.innerWidth - 330)) + 'px';
      document.body.appendChild(p);
      panelOpen = true;
      renderPanel(p);
      setTimeout(function () {
        document.addEventListener('click', function h(e) {
          if (!e.target.closest('#ns-notif-panel') && !e.target.closest('.ns-notif-anchor')) { p.remove(); panelOpen = false; document.removeEventListener('click', h); }
        });
      }, 50);
    }
  };
  (function wrapPush() {
    var orig = window.pushNotification;
    if (!orig || orig.__nsWrapped) return;
    var w = function (title, sub, type, duration) {
      var low = String(title || '').toLowerCase();
      var transient = /copied|sent|posted|idle|saved|loading|refresh|microphone/i.test(low);
      var conn = /bot not connected|not connected|reconnect/i.test(low);
      if (conn) {
        var now = Date.now();
        if (!w._lc || now - w._lc > 60000) { w._lc = now; NS_NOTIF.push('error', title, sub || ''); }
      } else if (!transient && (type === 'error' || type === 'warning')) {
        NS_NOTIF.push(type, title, sub || '');
      }
      return orig.apply(this, arguments);
    };
    w.__nsWrapped = true;
    window.pushNotification = w;
  })();
  (function wrapShowNotif() {
    var orig = window.showNotif;
    if (!orig || orig.__nsWrapped) return;
    var w = function (kind, msg) {
      if (msg) {
        var who = msg.display_name || msg.author || 'Someone';
        var text = msg.content_raw || '';
        NS_NOTIF.push(kind === 'dm' ? 'dm' : 'mention', (kind === 'dm' ? 'DM from ' : 'Mention from ') + who, text.slice(0, 80));
      }
      return orig.apply(this, arguments);
    };
    w.__nsWrapped = true;
    window.showNotif = w;
  })();
  function ensureUI() {
    var bar = document.querySelector('.page-top-bar');
    if (!bar) return;
    if (!bar.querySelector('#ns-notif-btn')) {
      var bell = makeBell('ns-notif-btn');
      bell.classList.add('ns-notif-anchor');
      var menuBtn = bar.querySelector('button[onclick*="toggleSidebar"]');
      if (menuBtn && menuBtn.nextSibling) {
        bar.insertBefore(bell, menuBtn.nextSibling);
      } else {
        bar.insertBefore(bell, bar.firstChild);
      }
    }
    if (!bar.querySelector('#ns-refresh-btn') && !bar.querySelector('button[onclick*="refreshCurrentView"]')) {
      var rf = document.createElement('button');
      rf.id = 'ns-refresh-btn';
      rf.className = 'header-btn';
      rf.title = 'Refresh';
      rf.textContent = '↻';
      rf.onclick = function () { softRefresh(); };
      bar.appendChild(rf);
    }
    badge();
  }
  setInterval(ensureUI, 1500);
  ensureUI();
})();