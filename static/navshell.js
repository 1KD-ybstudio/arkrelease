(function () {
  if (window._navShellReady) return;
  window._navShellReady = true;

  var style = document.createElement('style');
  style.textContent =
    '#sidebar,.sidebar,[id*="sidebar"]{display:none!important}' +
    '#menu-btn,.menu-btn,#menuBtn,.hamburger,[class*="hamburger"],[id*="menu-btn"],[id*="menu_btn"],[id*="nav-toggle"],[class*="menu-toggle"]{display:none!important}' +
    '.topbar>button:first-child,header>button:first-child,#topbar>button:first-child,.topbar button:first-of-type{display:none!important}' +
    '#chat-sidebar,.chat-sidebar,[id*="chat-sidebar"],#chat-channels,.chat-channels,#channel-list,.channel-list,[id*="channel-list"]{display:none!important}' +
    '#chat-channels-btn,#chat-members-btn,.chat-channels-btn,.chat-members-btn,.chat-header>button,.chat-topbar button{display:none!important}' +
    '.header-btn{display:none!important}' +
    '#ns-main [class*="preview"],#ns-main [id*="preview"]{display:inline-flex!important}' +
    '.saved-token-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:14px;background:rgba(0,0,0,.25);cursor:pointer;transition:.15s;margin-bottom:8px}' +
    '.saved-token-item:hover{transform:translateY(-1px);border-color:var(--primary,#454af8)}' +
    '.saved-token-item.active{border-color:#8a92ff;box-shadow:0 0 0 3px rgba(138,146,255,.13)}' +
    '.sti-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#8a92ff,#454af8);display:grid;place-items:center;font:600 13px system-ui,sans-serif;color:#fff;flex-shrink:0;overflow:hidden}' +
    '.sti-av img{width:100%;height:100%;object-fit:cover}' +
    '.sti-info{flex:1;min-width:0}' +
    '.sti-info b{font-size:13px;display:block;color:var(--text,#fff)}' +
    '.sti-info small{color:var(--text-muted,#8b90a8);font:600 10px monospace}' +
    '.sti-dot{width:8px;height:8px;border-radius:50%;background:#00d4aa;box-shadow:0 0 8px #00d4aa;flex-shrink:0}' +
    '.sti-chev{opacity:.5;color:var(--text,#fff)}' +
    '#ns-server-rail{position:fixed;left:0;top:0;bottom:0;width:64px;background:rgba(11,13,20,.97);border-right:1px solid var(--glass-border,rgba(255,255,255,.1));z-index:900;display:none;flex-direction:column;align-items:center;padding:12px 0;gap:8px;overflow-y:auto;overflow-x:hidden}' +
    '#ns-server-rail::-webkit-scrollbar{width:0}' +
    '.nsr-logo{width:38px;height:38px;border-radius:12px;overflow:hidden;margin-bottom:4px;flex-shrink:0}' +
    '.nsr-logo img{width:100%;height:100%;object-fit:contain}' +
    '.nsr-home,.nsr-srv,.nsr-add{position:relative;width:44px;height:44px;border-radius:14px;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:var(--glass-bg-light,rgba(255,255,255,.06));color:var(--text-muted,#8b90a8);cursor:pointer;display:grid;place-items:center;flex-shrink:0;font:600 15px system-ui,sans-serif;overflow:hidden;transition:.2s}' +
    '.nsr-home svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.nsr-srv img{width:100%;height:100%;object-fit:cover}' +
    '.nsr-home:hover,.nsr-srv:hover{border-radius:50%}' +
    '.nsr-home.active,.nsr-srv.active{border-radius:50%;outline:2px solid var(--primary,#454af8)}' +
    '.nsr-home.active::before,.nsr-srv.active::before{content:"";position:absolute;left:-14px;top:25%;bottom:25%;width:4px;border-radius:2px;background:#fff}' +
    '.nsr-add{color:var(--primary,#454af8);font-size:18px;border-style:dashed;position:sticky;bottom:0;background:rgba(11,13,20,.97)}' +
    '.nsr-sep{width:32px;height:1px;background:var(--glass-border,rgba(255,255,255,.1));flex-shrink:0}' +
    '#ns-rail{position:fixed;left:64px;top:0;bottom:0;width:68px;background:rgba(13,15,22,.97);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-right:1px solid var(--glass-border,rgba(255,255,255,.1));z-index:910;display:none;flex-direction:column;padding:12px 8px;gap:8px;overflow-y:auto;overflow-x:hidden;transition:width .25s cubic-bezier(.4,0,.2,1)}' +
    '#ns-rail:hover,#ns-rail.pinned{width:236px;align-items:stretch}' +
    '#ns-rail:not(:hover):not(.pinned){align-items:center}' +
    '.ns-head{display:flex;align-items:center;gap:10px;min-height:42px;height:42px;padding:0;box-sizing:border-box;justify-content:center;width:44px}' +
    '#ns-rail:hover .ns-head,#ns-rail.pinned .ns-head{justify-content:flex-start;width:auto}' +
    '.ns-head img{width:38px;height:38px;border-radius:12px;flex-shrink:0}' +
    '.ns-head b{display:none;font:600 15px system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#ns-rail:hover .ns-head b,#ns-rail.pinned .ns-head b{display:block}' +
    '.ns-pin{margin-left:auto;width:26px;height:26px;border-radius:8px;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:var(--glass-bg-light,rgba(255,255,255,.06));color:var(--text-muted,#8b90a8);cursor:pointer;display:none;place-items:center;flex-shrink:0}' +
    '#ns-rail:hover .ns-pin,#ns-rail.pinned .ns-pin{display:grid}' +
    '#ns-rail.pinned .ns-pin{color:var(--primary,#454af8);border-color:var(--primary,#454af8)}' +
    '.ns-pin svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ns-it{position:relative;display:flex;align-items:center;justify-content:center;height:44px;width:44px;border-radius:12px;color:var(--text-muted,#8b90a8);cursor:pointer;transition:.15s}' +
    '#ns-rail:hover .ns-it,#ns-rail.pinned .ns-it{justify-content:flex-start;padding:10px 12px;width:auto}' +
    '.ns-it svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ns-it:hover{color:var(--text,#fff);background:rgba(255,255,255,.05)}' +
    '.ns-it.active{color:var(--ac,var(--primary));background:rgba(255,255,255,.08)}' +
    '.ns-it.active::before{content:"";position:absolute;left:2px;top:24%;bottom:24%;width:3px;border-radius:2px;background:var(--ac,var(--primary))}' +
    '.ns-lbl{position:absolute;left:46px;top:50%;transform:translate(-6px,-50%);opacity:0;white-space:nowrap;transition:opacity .2s,transform .2s;font-weight:700;font-size:13px;pointer-events:none}' +
    '#ns-rail:hover .ns-lbl,#ns-rail.pinned .ns-lbl{opacity:1;transform:translate(0,-50%)}' +
    '.ns-grp{display:none;font:600 9px monospace;letter-spacing:1.2px;color:var(--text-muted,#8b90a8);padding:10px 12px 4px}' +
    '#ns-rail:hover .ns-grp,#ns-rail.pinned .ns-grp{display:block}' +
    '#ns-rail:not(:hover):not(.pinned) .ns-x{display:none}' +
    '#ns-rail:hover .ns-c,#ns-rail.pinned .ns-c{display:none}' +
    '.ns-chathead{display:flex;align-items:center;gap:10px;padding:8px 12px;color:#00d4aa;font:700 11px monospace;letter-spacing:1px}' +
    '.ns-chathead svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#ns-dock{position:fixed;left:0;right:0;bottom:0;z-index:950;display:none;justify-content:space-around;align-items:flex-end;background:#0d0f16;border-top:1px solid var(--glass-border,rgba(255,255,255,.1));padding:14px 6px calc(12px + env(safe-area-inset-bottom))}' +
    '#ns-dock a{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--text-muted,#8b90a8);font-size:10px;font-weight:700;text-decoration:none;transition:transform .25s cubic-bezier(.34,1.56,.64,1),color .2s;transform-origin:bottom center;-webkit-touch-callout:none;user-select:none}' +
    '#ns-dock a svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}' +
    '#ns-dock a .ns-bump{display:none;position:absolute;top:-26px;left:50%;transform:translateX(-50%);width:52px;height:52px;border-radius:50%;background:#0d0f16}' +
    '#ns-dock a .ns-bump::before,#ns-dock a .ns-bump::after{content:"";position:absolute;bottom:0;width:12px;height:12px;background:transparent}' +
    '#ns-dock a .ns-bump::before{left:-11px;border-bottom-right-radius:10px;box-shadow:4px 4px 0 #0d0f16}' +
    '#ns-dock a .ns-bump::after{right:-11px;border-bottom-left-radius:10px;box-shadow:-4px 4px 0 #0d0f16}' +
    '#ns-dock a.active{color:var(--ac,var(--primary));transform:translateY(-4px)}' +
    '#ns-dock a.active .ns-bump{display:block}' +
    '#ns-dock a.active svg{transform:translateY(-24px);color:var(--ac,var(--primary))}' +
    '#ns-dock a.active span{color:var(--ac,var(--primary))}' +
    '#ns-dock a.near{transform:translateY(-4px) scale(1.1)}' +
    '#ns-sheet{position:fixed;left:0;right:0;bottom:0;z-index:960;background:#12141f;border-top:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:20px 20px 0 0;max-height:70vh;overflow-y:auto;display:none;flex-direction:column;padding:14px 16px calc(16px + env(safe-area-inset-bottom))}' +
    '#ns-sheet.show{display:flex}' +
    '#ns-sheet .nsh-bar{width:44px;height:4px;border-radius:2px;background:rgba(255,255,255,.2);margin:0 auto 12px}' +
    '#ns-sheet .nsh-grp{font:600 9px monospace;letter-spacing:1.2px;color:var(--text-muted,#8b90a8);padding:10px 4px 4px}' +
    '#ns-sheet .nsh-it{display:flex;align-items:center;gap:12px;padding:12px 8px;border-radius:12px;color:var(--text,#fff);font-weight:700;font-size:14px;cursor:pointer}' +
    '#ns-sheet .nsh-it svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--ac,var(--primary))}' +
    '#ns-sheet .nsh-chathead{display:flex;align-items:center;gap:10px;padding:10px 8px 4px;color:#00d4aa;font:700 11px monospace;letter-spacing:1px}' +
    '#ns-sheet .nsh-chathead svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#ns-sheet .nsh-it.nsh-active{background:rgba(0,212,170,.12);color:#00d4aa}' +
    '.ns-it.has-unread,.nsh-it.has-unread{font-weight:800!important;color:#fff!important}' +
    '.ns-it.has-unread::after,.nsh-it.has-unread::after{content:"";position:absolute;right:8px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;z-index:2}' +
    '#ns-sheet-backdrop{position:fixed;inset:0;z-index:955;background:transparent;display:none}' +
    '#ns-sheet-backdrop.show{display:block}' +
    '.ns-srvwrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;padding:4px 2px}' +
    '.ns-srvcard{position:relative;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:16px;overflow:hidden;cursor:pointer;background:var(--glass-bg,#12141f);min-height:150px}' +
    '.ns-srvcard .bn{height:88px;background:linear-gradient(135deg,#454af8,#1a1c72);background-size:cover;background-position:center;position:relative}' +
    '.ns-srvcard .bn::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(11,13,20,.9))}' +
    '.ns-srvcard .ct{position:absolute;top:8px;right:8px;z-index:2;background:rgba(10,10,14,.75);border-radius:999px;padding:4px 9px;font:600 10px monospace;color:#dfe2ff}' +
    '.ns-srvcard .av{position:absolute;left:12px;top:66px;width:44px;height:44px;border-radius:50%;border:3px solid #12141f;overflow:hidden;background:linear-gradient(135deg,#8a92ff,#454af8);display:grid;place-items:center;font:600 16px system-ui,sans-serif;color:#fff;z-index:2}' +
    '.ns-srvcard .av img{width:100%;height:100%;object-fit:cover}' +
    '.ns-srvcard .bd{padding:28px 12px 12px}' +
    '.ns-srvcard h4{margin:0 0 6px;font:600 15px system-ui,sans-serif;color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ns-srvcard .bar{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}' +
    '.ns-srvcard .bar i{display:block;height:100%;background:var(--pc,#00d4aa)}' +
    '.ns-srvcard .pc{display:flex;justify-content:space-between;font:600 10px monospace;color:var(--text-muted,#8b90a8);margin-top:5px}' +
    '.ns-srvcard small{display:block;color:var(--text-muted,#8b90a8);font:600 9.5px monospace;margin-top:6px}' +
    '@media(max-width:900px){#ns-server-rail{display:none!important}#ns-rail{display:none!important}#ns-dock{display:flex}#ns-main{padding-bottom:calc(96px + env(safe-area-inset-bottom))}}' +
    '.ns-vcjoin{display:none;margin-left:auto;flex-shrink:0;border:none;border-radius:999px;background:var(--primary,#454af8);color:#fff;font:700 9px system-ui,sans-serif;padding:4px 10px;cursor:pointer}' +
    '#ns-rail:hover .ns-vcjoin,#ns-rail.pinned .ns-vcjoin{display:block}' +
    '.ns-vcjoin{display:none;margin-left:auto;flex-shrink:0;border:none;border-radius:999px;background:var(--primary,#454af8);color:#fff;font:700 9px system-ui,sans-serif;padding:4px 10px;cursor:pointer}' +
    '#ns-rail:hover .ns-vcjoin,#ns-rail.pinned .ns-vcjoin{display:block}' +
    '.hl-k{color:#569CD6}.hl-s{color:#CE9178}.hl-c{color:#6A9955;font-style:italic}.hl-n{color:#B5CEA8}.hl-f{color:#DCDCAA}.hl-t{color:#569CD6}.hl-a{color:#9CDCFE}.hl-p{color:#9CDCFE}' +
    '@media(min-width:901px){#ns-server-rail{display:flex}#ns-rail{display:flex}#ns-dock{display:none!important}#ns-sheet{display:none!important}}'; +
    '.ns-vcjoin{display:none;margin-left:auto;flex-shrink:0;border:none;border-radius:999px;background:var(--primary,#454af8);color:#fff;font:700 9px system-ui,sans-serif;padding:4px 10px;cursor:pointer}' +
    '#ns-rail:hover .ns-vcjoin,#ns-rail.pinned .ns-vcjoin{display:block}' +
    '.nsh-vcjoin{margin-left:auto;flex-shrink:0;border:none;border-radius:999px;background:var(--primary,#454af8);color:#fff;font:700 10px system-ui,sans-serif;padding:5px 12px;cursor:pointer}';
  document.head.appendChild(style);

  var ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    pulse: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    code: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    hash: '<svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>',
    list: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    plug: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    voice: '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>'
  };

  function iconFor(page, label) {
    var s = (page + ' ' + label).toLowerCase();
    if (/home/.test(s)) return ICONS.home;
    if (/chat/.test(s)) return ICONS.chat;
    if (/settings/.test(s)) return ICONS.gear;
    if (/overview/.test(s)) return ICONS.sliders;
    if (/channel/.test(s)) return ICONS.hash;
    if (/member/.test(s)) return ICONS.users;
    if (/role/.test(s)) return ICONS.shield;
    if (/ban/.test(s)) return ICONS.ban;
    if (/audit/.test(s)) return ICONS.list;
    if (/expression|emoji|sticker/.test(s)) return ICONS.smile;
    if (/invite/.test(s)) return ICONS.link;
    if (/utility|authorized|autoreact|imperson|announce|webhook|hush/.test(s)) return ICONS.bolt;
    if (/status|presence|rotation/.test(s)) return ICONS.pulse;
    if (/dev|app|token|install/.test(s)) return ICONS.code;
    if (/plugin|browse|installed/.test(s)) return ICONS.plug;
    return ICONS.grid;
  }

  function appState() { return (typeof AppState !== 'undefined') ? AppState : null; }
  function escS(x) { return (window.esc ? esc(x) : String(x)); }
  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }
  function currentCtx() {
    var login = document.getElementById('page-login');
    if (login && login.style.display !== 'none') return 'login';
    var st = appState();
    return (st && st.currentGuild) ? 'server' : 'global';
  }

  var harvested = null;
  var lastCtx = null;
  var lastOffsetPage = null;
  var nsDockKb = false;

  function harvest() {
    var sb = document.getElementById('sidebar');
    if (!sb) return null;
    var top = [], server = [], groups = [];
    var items = sb.querySelectorAll('.sidebar-item[data-page]');
    Array.prototype.forEach.call(items, function (it) {
      var page = it.getAttribute('data-page');
      var label = (it.textContent || '').trim();
      var cat = it.closest('[id$="-category"]');
      var entry = { page: page, label: label };
      if (!cat) { top.push(entry); return; }
      if (cat.id === 'management-category') { server.push(entry); return; }
      var g = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].id === cat.id) g = groups[i];
      if (!g) { g = { id: cat.id, title: cat.id.replace('-category', '').toUpperCase(), items: [] }; groups.push(g); }
      g.items.push(entry);
    });
    return { top: top, server: server, groups: groups };
  }

  function findTop(list, re) {
    for (var i = 0; i < list.length; i++) if (re.test(list[i].label)) return list[i];
    return null;
  }

  function ensureMainWrap() {
    var w = document.getElementById('ns-main');
    if (w) return w;
    w = document.createElement('div');
    w.id = 'ns-main';
    var keep = { 'ns-server-rail': 1, 'ns-rail': 1, 'ns-dock': 1, 'ns-sheet': 1, 'ns-sheet-backdrop': 1 };
    var nodes = Array.prototype.slice.call(document.body.children);
    for (var i = 0; i < nodes.length; i++) {
      if (!keep[nodes[i].id]) w.appendChild(nodes[i]);
    }
    document.body.appendChild(w);
    return w;
  }

  function applyOffset(hidden) {
    var off = (!hidden && !isMobile()) ? 132 : 0;
    var w = ensureMainWrap();
    w.style.marginLeft = off + 'px';
    w.style.width = off ? 'calc(100vw - ' + off + 'px)' : '';
    var ids = ['app-shell', 'appShell', 'page-servers', 'pageServers', 'main-content', 'mainContent'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) {
        el.style.left = off + 'px';
        el.style.width = off ? 'calc(100vw - ' + off + 'px)' : '';
      }
    }
    var st = appState();
    var pg = st ? st.currentPage : '';
    if (pg !== lastOffsetPage) {
      lastOffsetPage = pg;
      setTimeout(function () {
        if (!off) return;
        var avail = window.innerWidth - off;
        var els = (w || document.body).querySelectorAll('div,section,main,header,nav');
        for (var j = 0; j < els.length; j++) {
          var e2 = els[j];
          var cs = window.getComputedStyle(e2);
          if ((cs.position === 'fixed' || cs.position === 'absolute') && e2.offsetWidth > avail + 6) {
            e2.style.width = avail + 'px';
          }
        }
      }, 300);
    }
  }

  function showAppShell() {
    if (window.location.hash === '#servers') {
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    }
    var dom = window.DOM || {};
    var ps = dom.pageServers || document.getElementById('page-servers');
    var as = dom.appShell || document.getElementById('app-shell');
    if (ps) ps.style.display = 'none';
    if (as) as.style.display = 'flex';
  }

  function saveMem(page) {
    var c = currentCtx();
    var st = appState();
    if (c === 'server' && st) localStorage.setItem('ns_srv_' + st.currentGuild, page);
    else if (c === 'global') localStorage.setItem('ns_global', page);
  }

  function go(page) {
    showAppShell();
    saveMem(page);
    if (typeof navigate === 'function') navigate(page);
    if (typeof hideLoading === 'function') setTimeout(hideLoading, 350);
  }

  function goGlobalHome() {
    var st = appState();
    if (st) { st.currentGuild = null; if (typeof saveAppState === 'function') saveAppState(); }
    localStorage.setItem('ns_global', 'home');
    go('home');
  }

  function renderCleanServers() {
    var grid = document.getElementById('server-grid');
    if (!grid) return;
    var st = appState();
    var guilds = (st && st.cachedGuilds) || [];
    var html = '<div class="ns-srvwrap">';
    guilds.forEach(function (g) {
      var pct = Math.min(100, Math.round(((g.presence_count || 0) / Math.max(1, g.member_count || 1)) * 100));
      var barColor = pct > 60 ? '#00d4aa' : pct > 25 ? '#38bdf8' : '#f97316';
      html += '<div class="ns-srvcard" data-guild="' + g.id + '">' +
        '<div class="bn"' + (g.banner_url ? ' style="background-image:url(' + escS(g.banner_url) + ')"' : '') + '><span class="ct">' + (g.member_count || 0).toLocaleString() + ' members</span></div>' +
        '<div class="av">' + (g.icon_url ? '<img src="' + escS(g.icon_url) + '">' : escS(g.name.charAt(0))) + '</div>' +
        '<div class="bd"><h4>' + escS(g.name) + '</h4>' +
        '<div class="bar" style="--pc:' + barColor + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="pc"><span>ONLINE</span><span>' + pct + '%</span></div>' +
        '<small>' + g.id + '</small></div></div>';
    });
    html += '</div>';
    grid.innerHTML = html;
    var pop = document.getElementById('server-popup');
    if (pop) pop.style.display = 'none';
  }

  function rewireServerGrid() {
    if (window.location.hash !== '#servers') return;
    window._expandedCard = null;
    var grid = document.getElementById('server-grid');
    if (!grid) return;
    if (isMobile() && !grid.querySelector('.ns-srvwrap')) renderCleanServers();
    var cards = grid.querySelectorAll('.server-card[data-guild-id]');
    Array.prototype.forEach.call(cards, function (card) {
      if (typeof collapseServerCard === 'function') { try { collapseServerCard(card); } catch (e) {} }
      card.onmouseenter = null;
      card.onmouseleave = null;
      card.onclick = null;
      var panel = card.querySelector('.card-details-panel');
      if (panel) panel.style.display = 'none';
      if (!card.dataset.nsWired) {
        card.dataset.nsWired = '1';
        card.addEventListener('click', function (ev) {
          ev.stopPropagation();
          window.location.hash = '#server/' + card.getAttribute('data-guild-id');
        });
      }
    });
  }

  var serverRail = document.createElement('aside');
  serverRail.id = 'ns-server-rail';
  document.body.appendChild(serverRail);
  var modRail = document.createElement('aside');
  modRail.id = 'ns-rail';
  document.body.appendChild(modRail);
  var dock = document.createElement('nav');
  dock.id = 'ns-dock';
  document.body.appendChild(dock);
  var sheet = document.createElement('div');
  sheet.id = 'ns-sheet';
  document.body.appendChild(sheet);
  var backdrop = document.createElement('div');
  backdrop.id = 'ns-sheet-backdrop';
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', function () {
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
  });

  serverRail.addEventListener('click', function (e) {
    if (e.target.closest('#nsr-home')) { goGlobalHome(); return; }
    if (e.target.closest('#nsr-add')) { window.location.hash = '#servers'; return; }
    var srv = e.target.closest('.nsr-srv');
    if (srv) window.location.hash = '#server/' + srv.getAttribute('data-guild');
  });

  modRail.addEventListener('click', function (e) {
    if (e.target.closest('.ns-pin')) { modRail.classList.toggle('pinned'); return; }
    var vj = e.target.closest('[data-vc-join]');
    if (vj) { if (typeof joinVC === 'function') joinVC(vj.getAttribute('data-vc-join')); return; }
    var chn = e.target.closest('[data-chan]');
    if (vj) { if (typeof joinVC === 'function') joinVC(vj.getAttribute('data-vc-join')); return; }
    var chn = e.target.closest('[data-chan]');
    if (chn) {
      var cid = chn.getAttribute('data-chan');
      if (chn.getAttribute('data-type') === 'voice' && typeof showVoicePopup === 'function') { showVoicePopup(cid); return; }
      var st2 = appState();
      if (st2 && st2.currentPage !== 'chat' && typeof navigate === 'function') navigate('chat');
      setTimeout(function () { if (typeof selectChatChannel === 'function') selectChatChannel(cid); }, 200);
      return;
    }
    var it = e.target.closest('.ns-it');
    if (it && it.getAttribute('data-page')) go(it.getAttribute('data-page'));
  });

  dock.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  dock.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    if (a.hasAttribute('data-more')) { sheet.classList.add('show'); backdrop.classList.add('show'); return; }
    if (a.hasAttribute('data-hash')) { window.location.hash = a.getAttribute('data-hash'); return; }
    if (a.hasAttribute('data-home')) { goGlobalHome(); return; }
    if (a.hasAttribute('data-page')) go(a.getAttribute('data-page'));
  });

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.ns-srvcard');
    if (card) { window.location.hash = '#server/' + card.getAttribute('data-guild'); return; }
    var b = e.target.closest('[data-ns-prev]');
    if (b) openPreviewModal(b.getAttribute('data-ns-prev'), b.getAttribute('data-ns-name') || 'file');
  });

  sheet.addEventListener('click', function (e) {
    var vj = e.target.closest('[data-vc-join]');
    if (vj) {
      sheet.classList.remove('show');
      backdrop.classList.remove('show');
      if (typeof joinVC === 'function') joinVC(vj.getAttribute('data-vc-join'));
      return;
    }
    var chn = e.target.closest('[data-chan]');
    if (vj) { sheet.classList.remove('show'); backdrop.classList.remove('show'); if (typeof joinVC === 'function') joinVC(vj.getAttribute('data-vc-join')); return; }
    var chn = e.target.closest('[data-chan]');
    if (vj) { sheet.classList.remove('show'); backdrop.classList.remove('show'); if (typeof joinVC === 'function') joinVC(vj.getAttribute('data-vc-join')); return; }
    var chn = e.target.closest('[data-chan]');
    if (chn) {
      sheet.classList.remove('show');
      backdrop.classList.remove('show');
      var cid = chn.getAttribute('data-chan');
      if (chn.getAttribute('data-type') === 'voice' && typeof showVoicePopup === 'function') { showVoicePopup(cid); return; }
      var st2 = appState();
      if (st2 && st2.currentPage !== 'chat' && typeof navigate === 'function') navigate('chat');
      setTimeout(function () { if (typeof selectChatChannel === 'function') selectChatChannel(cid); }, 200);
      return;
    }
    var it = e.target.closest('.nsh-it');
    if (it) {
      sheet.classList.remove('show');
      backdrop.classList.remove('show');
      go(it.getAttribute('data-page'));
    }
  });

  function renderSavedTokens(tokens, activeIndex) {
    var c = document.getElementById('saved-tokens');
    if (!c) return;
    c.innerHTML = '';
    if (!tokens || !tokens.length) {
      c.innerHTML = '<div style="color:var(--text-muted,#8b90a8);font-size:12px;padding:6px">No tokens saved.</div>';
      return;
    }
    tokens.forEach(function (t) {
      var d = document.createElement('div');
      d.className = 'saved-token-item' + (t.index === activeIndex ? ' active' : '');
      var name = t.name || ('Token ' + (t.index + 1));
      var initial = name.charAt(0).toUpperCase();
      d.innerHTML = (t.avatar ? '<span class="sti-av"><img src="' + escS(t.avatar) + '" onerror="this.style.display=\'none\'"></span>' : '<span class="sti-av">' + initial + '</span>') +
        '<span class="sti-info"><b>' + escS(name) + '</b><small>token ' + (t.index + 1) + (t.index === activeIndex ? ' · active' : ' · saved') + '</small></span>' +
        (t.index === activeIndex ? '<span class="sti-dot"></span>' : '') +
        '<span class="sti-chev">›</span>';
      d.onclick = function () {
        if (typeof openTokenModal === 'function') openTokenModal(t.index, d);
        else if (typeof loginWithToken === 'function') loginWithToken(t.index);
      };
      c.appendChild(d);
    });
  }

  function railItem(entry, ac) {
    return '<div class="ns-it" data-page="' + entry.page + '" style="--ac:' + ac + '">' + iconFor(entry.page, entry.label) + '<span class="ns-lbl">' + escS(entry.label) + '</span></div>';
  }

  function renderServerRail() {
    var c = currentCtx();
    var st = appState();
    var guilds = (st && st.cachedGuilds) || [];
    var html = '<div class="nsr-logo"><img src="/arklum.png" alt=""></div>' +
      '<button class="nsr-home' + (c === 'global' ? ' active' : '') + '" id="nsr-home" title="Home">' + ICONS.home + '</button>' +
      '<div class="nsr-sep"></div>';
    guilds.forEach(function (g) {
      html += '<button class="nsr-srv' + (st && st.currentGuild === g.id ? ' active' : '') + '" data-guild="' + g.id + '" title="' + escS(g.name) + '">' + (g.icon_url ? '<img src="' + escS(g.icon_url) + '">' : escS(g.name.charAt(0))) + '</button>';
    });
    html += '<button class="nsr-add" id="nsr-add" title="Servers">+</button>';
    serverRail.innerHTML = html;
  }

  function renderModRail() {
    if (!harvested) return;
    var c = currentCtx();
    var st = appState();
    var html = '';
    var li = 0;
    var lbl = function (t) { li++; return '<span class="ns-lbl" style="transition-delay:' + (li * 18) + 'ms">' + t + '</span>'; };
    if (c === 'server') {
      var g = ((st && st.cachedGuilds) || []).find(function (x) { return x.id === st.currentGuild; });
      html += '<div class="ns-head">' + (g && g.icon_url ? '<img src="' + escS(g.icon_url) + '">' : '<img src="/arklum.png">') + '<b>' + (g ? escS(g.name) : 'Server') + '</b><button class="ns-pin">' + ICONS.dots + '</button></div>';
      var chat = findTop(harvested.top, /chat/i);
      var mgmtPages = harvested.server.map(function (x) { return x.page; }).join(',');
      html += '<div class="ns-it ns-c" data-page="' + (chat ? chat.page : 'chat') + '" style="--ac:#00d4aa">' + ICONS.chat + lbl('Chat') + '</div>';
      html += '<div class="ns-it ns-c" data-pages="' + mgmtPages + '" data-page="' + (harvested.server.length ? harvested.server[0].page : 'overview') + '" style="--ac:#8a92ff">' + ICONS.sliders + lbl('Management') + '</div>';
      html += '<div class="ns-x">';
      html += '<div class="ns-chathead">' + ICONS.chat + 'CHAT</div>';
      var sd = st ? st.serverData : null;
      if (sd && sd.channels && sd.channels.length) {
        var activeCh = st.activeChatChannel ? String(st.activeChatChannel) : '';
        var chanItem = function (ch) {
          var ic = ch.type === 'voice' ? ICONS.voice : ICONS.hash;
          var on = activeCh === String(ch.id) ? ' active' : '';
          var jb = ch.type === 'voice' ? '<button class="ns-vcjoin" data-vc-join="' + ch.id + '">JOIN</button>' : '';
          return '<div class="ns-it' + on + '" data-chan="' + ch.id + '" data-type="' + ch.type + '" style="--ac:#00d4aa">' + ic + lbl(escS(ch.name)) + jb + '</div>';
        };
        sd.channels.filter(function (ch) { return !ch.category_id; }).forEach(function (ch) { html += chanItem(ch); });
        (sd.categories || []).forEach(function (cat) {
          html += '<div class="ns-grp">' + escS(cat.name) + '</div>';
          sd.channels.filter(function (ch) { return ch.category_id === String(cat.id); }).forEach(function (ch) { html += chanItem(ch); });
        });
      }
      html += '<div class="ns-grp">MANAGEMENT</div>';
      harvested.server.forEach(function (it) { html += railItem(it, '#8a92ff'); });
      html += '</div>';
    } else {
      html += '<div class="ns-head"><img src="/arklum.png"><b>ARKLUM</b><button class="ns-pin">' + ICONS.dots + '</button></div>';
      var home = findTop(harvested.top, /home/i);
      var settings = findTop(harvested.top, /settings/i);
      html += '<div class="ns-it ns-c" data-page="' + (home ? home.page : 'home') + '" style="--ac:#454af8">' + ICONS.home + lbl('Home') + '</div>';
      html += '<div class="ns-it ns-c" data-page="' + (settings ? settings.page : 'settings') + '" style="--ac:#8b90a8">' + ICONS.gear + lbl('Settings') + '</div>';
      var rep = { devportal: ICONS.code, status: ICONS.pulse, utility: ICONS.bolt, plugins: ICONS.plug };
      var acs = { devportal: '#7c5cff', status: '#22c55e', utility: '#f97316', plugins: '#ef4444' };
      harvested.groups.forEach(function (grp) {
        var catEl = document.getElementById(grp.id);
        if (catEl && catEl.style.display === 'none') return;
        var key = grp.id.replace('-category', '');
        var pages = grp.items.map(function (x) { return x.page; }).join(',');
        html += '<div class="ns-it ns-c" data-pages="' + pages + '" data-page="' + grp.items[0].page + '" style="--ac:' + (acs[key] || '#454af8') + '">' + (rep[key] || iconFor(grp.items[0].page, grp.items[0].label)) + lbl(grp.title) + '</div>';
      });
      html += '<div class="ns-x">';
      html += '<div class="ns-grp">GENERAL</div>';
      if (home) html += railItem(home, '#454af8');
      if (settings) html += railItem(settings, '#8b90a8');
      harvested.groups.forEach(function (grp) {
        var catEl = document.getElementById(grp.id);
        if (catEl && catEl.style.display === 'none') return;
        var key = grp.id.replace('-category', '');
        html += '<div class="ns-grp">' + grp.title + '</div>';
        grp.items.forEach(function (it) { html += railItem(it, acs[key] || '#454af8'); });
      });
      html += '</div>';
    }
    modRail.innerHTML = html;
  }

  function dockItemHtml(attrs, icon, label, ac) {
    return '<a href="#" ' + attrs + ' style="--ac:' + ac + '"><i class="ns-bump"></i>' + icon + '<span>' + label + '</span></a>';
  }

  function renderDock() {
    if (!harvested) return;
    var pluginsGroup = null;
    harvested.groups.forEach(function (g) { if (g.id.indexOf('plugins') === 0) pluginsGroup = g; });
    var pluginsPage = pluginsGroup && pluginsGroup.items.length ? pluginsGroup.items[0].page : 'home';
    var settings = findTop(harvested.top, /settings/i);
    var html = '';
    html += dockItemHtml('data-more', ICONS.dots, 'More', '#8b90a8');
    html += dockItemHtml('data-hash="#servers"', ICONS.grid, 'Servers', '#38bdf8');
    html += dockItemHtml('data-home', ICONS.home, 'Home', '#454af8');
    html += dockItemHtml('data-page="' + pluginsPage + '"', ICONS.plug, 'Plugins', '#ef4444');
    html += dockItemHtml('data-page="' + (settings ? settings.page : 'home') + '"', ICONS.gear, 'Settings', '#8b90a8');
    dock.innerHTML = html;
  }

  function renderSheet() {
    if (!harvested) return;
    var c = currentCtx();
    var html = '<div class="nsh-bar"></div>';
    if (c === 'server') {
      var st = appState();
      html += '<div class="nsh-chathead">' + ICONS.chat + 'CHAT</div>';
      var sd = st ? st.serverData : null;
      if (sd && sd.channels && sd.channels.length) {
        var activeCh = st.activeChatChannel ? String(st.activeChatChannel) : '';
        var chanIt = function (ch) {
          var ic = ch.type === 'voice' ? ICONS.voice : ICONS.hash;
          var on = activeCh === String(ch.id) ? ' nsh-active' : '';
          var jb = ch.type === 'voice' ? '<button data-vc-join="' + ch.id + '" style="margin-left:auto;flex-shrink:0;border:none;border-radius:999px;background:var(--primary,#454af8);color:#fff;font:700 10px system-ui,sans-serif;padding:5px 12px;cursor:pointer;">JOIN</button>' : '';
          return '<div class="nsh-it' + on + '" data-chan="' + ch.id + '" data-type="' + ch.type + '" style="--ac:#00d4aa">' + ic + escS(ch.name) + jb + '</div>';
        };
        sd.channels.filter(function (ch) { return !ch.category_id; }).forEach(function (ch) { html += chanIt(ch); });
        (sd.categories || []).forEach(function (cat) {
          html += '<div class="nsh-grp">' + escS(cat.name) + '</div>';
          sd.channels.filter(function (ch) { return ch.category_id === String(cat.id); }).forEach(function (ch) { html += chanIt(ch); });
        });
      }
      html += '<div class="nsh-grp">MANAGEMENT</div>';
      harvested.server.forEach(function (it) {
        html += '<div class="nsh-it" data-page="' + it.page + '" style="--ac:#8a92ff">' + iconFor(it.page, it.label) + escS(it.label) + '</div>';
      });
      harvested.groups.forEach(function (grp) {
        var catEl = document.getElementById(grp.id);
        if (catEl && catEl.style.display === 'none') return;
        var ac = grp.id.indexOf('utility') === 0 ? '#f97316' : grp.id.indexOf('status') === 0 ? '#22c55e' : grp.id.indexOf('devportal') === 0 ? '#7c5cff' : '#ef4444';
        html += '<div class="nsh-grp">' + grp.title + '</div>';
        grp.items.forEach(function (it) {
          html += '<div class="nsh-it" data-page="' + it.page + '" style="--ac:' + ac + '">' + iconFor(it.page, it.label) + escS(it.label) + '</div>';
        });
      });
    } else {
      harvested.groups.forEach(function (grp) {
        var catEl = document.getElementById(grp.id);
        if (catEl && catEl.style.display === 'none') return;
        var ac = grp.id.indexOf('utility') === 0 ? '#f97316' : grp.id.indexOf('status') === 0 ? '#22c55e' : grp.id.indexOf('devportal') === 0 ? '#7c5cff' : '#ef4444';
        html += '<div class="nsh-grp">' + grp.title + '</div>';
        grp.items.forEach(function (it) {
          html += '<div class="nsh-it" data-page="' + it.page + '" style="--ac:' + ac + '">' + iconFor(it.page, it.label) + escS(it.label) + '</div>';
        });
      });
    }
    sheet.innerHTML = html;
  }

  var PREVIEW_EXT = /\.(js|py|html|css|json|txt|ts|jsx|tsx|sh|bat|md|yml|yaml|ini|log)$/i;

  function ensurePreviewModal() {
    if (document.getElementById('ns-preview')) return document.getElementById('ns-preview');
    var m = document.createElement('div');
    m.id = 'ns-preview';
    m.style.cssText = 'position:fixed;inset:0;z-index:10200;background:rgba(5,6,10,.8);display:none;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div style="width:min(680px,94vw);max-height:84vh;display:flex;flex-direction:column;background:#12141f;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)"><b id="ns-preview-name" style="flex:1;font:700 13px monospace;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></b><button id="ns-preview-x" style="width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;cursor:pointer">✕</button></div>' +
      '<pre id="ns-preview-body" style="flex:1;overflow:auto;margin:0;padding:12px 14px;font:12px/1.5 monospace;color:#dfe2ff;white-space:pre-wrap;word-break:break-word"></pre>' +
      '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('#ns-preview-x')) m.style.display = 'none';
    });
    return m;
  }

  function openPreviewModal(url, name) {
    var m = ensurePreviewModal();
    document.getElementById('ns-preview-name').textContent = name;
    document.getElementById('ns-preview-body').textContent = 'Loading…';
    m.style.display = 'flex';
    fetch(url).then(function (r) { return r.text(); }).then(function (t) {
    var body = document.getElementById('ns-preview-body');
    var nameEl = document.getElementById('ns-preview-name');
    var text = t.length > 20000 ? t.slice(0, 20000) + '\n… (truncated)' : t;
    var langMap = { js: 'js', jsx: 'js', ts: 'js', tsx: 'js', py: 'py', rb: 'rb', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'cs', php: 'php', go: 'go', rs: 'rs', kt: 'kt', swift: 'swift', sh: 'sh', bash: 'sh', bat: 'bat', ps1: 'ps1', sql: 'sql', json: 'json', yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', cfg: 'ini', r: 'r', html: 'html', htm: 'html', xml: 'html', css: 'css', md: 'md' };
    var lang = langMap[(name || '').split('.').pop().toLowerCase()] || '';
    if (nameEl && lang) nameEl.textContent = name + ' · ' + lang.toUpperCase();
    if (lang && typeof window.highlightCode === 'function') body.innerHTML = window.highlightCode(text, lang);
    else body.textContent = text;
  }).catch(function () {
  document.getElementById('ns-preview-body').textContent = 'Failed to load file content.';
  });
  }

  function injectPreviewButtons() {
    var links = document.querySelectorAll('#ns-main a[href*="cdn.discordapp.com"], #ns-main a[href*="media.discordapp.net"]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href') || '';
      var clean = href.split('?')[0];
      var name = (a.textContent || '').trim() || clean.split('/').pop() || 'file';
      if (!PREVIEW_EXT.test(name) && !PREVIEW_EXT.test(clean)) return;
      if (a.dataset.nsPrevWired) return;
      a.dataset.nsPrevWired = '1';
      var b = document.createElement('button');
      b.textContent = '</>';
      b.title = 'Preview file';
      b.setAttribute('data-ns-prev', href);
      b.setAttribute('data-ns-name', name);
      b.style.cssText = 'margin-left:6px;padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#8a92ff;font:700 10px monospace;cursor:pointer;vertical-align:middle';
      a.parentNode.insertBefore(b, a.nextSibling);
    });
  }

  function chatEls() {
    var ta = document.querySelector('#ns-main textarea');
    var box = document.querySelector('#ns-main .chat-input-container');
    if (!box && ta) box = ta.parentElement;
    return {
      msgs: document.getElementById('chat-messages'),
      box: box,
      topbar: document.querySelector('.page-top-bar'),
      ta: ta
    };
  }

  function kbHeight() {
    var vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  }

  function layoutMobileChat() {
    var on = isMobile() && appState() && appState().currentPage === 'chat';
    document.body.classList.toggle('ns-chat', !!on);
    var els = chatEls();
    if (!on) {
      nsDockKb = false;
      [els.msgs, els.box].forEach(function (el) {
        if (!el) return;
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.zIndex = '';
        el.style.background = '';
        el.style.overflowY = '';
      });
      return;
    }
    var kb = kbHeight() > 120;
    nsDockKb = kb;
    var dockH = kb ? 0 : (dock.offsetHeight || 66);
    var bottom = kb ? kbHeight() : dockH;
    if (els.box) {
      els.box.style.position = 'fixed';
      els.box.style.left = '0';
      els.box.style.right = '0';
      els.box.style.bottom = bottom + 'px';
      els.box.style.zIndex = '940';
      els.box.style.background = '#0b0d14';
    }
    if (els.msgs) {
      var top = els.topbar ? els.topbar.offsetHeight : 56;
      var boxH = els.box ? els.box.offsetHeight : 60;
      els.msgs.style.position = 'fixed';
      els.msgs.style.top = top + 'px';
      els.msgs.style.left = '0';
      els.msgs.style.right = '0';
      els.msgs.style.bottom = (bottom + boxH) + 'px';
      els.msgs.style.overflowY = 'auto';
      els.msgs.style.zIndex = '930';
    }
  }

  function fixChatBottom() { layoutMobileChat(); }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { layoutMobileChat(); });
  }
  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.tagName === 'TEXTAREA') layoutMobileChat();
  });
  document.addEventListener('focusout', function (e) {
    if (e.target && e.target.tagName === 'TEXTAREA') setTimeout(layoutMobileChat, 150);
  });

  function syncActive() {
    var hm = window.location.hash.match(/^#server\/(\d+)/);
    var st0 = appState();
    if (hm && st0 && !st0.currentGuild) st0.currentGuild = hm[1];
    var c = currentCtx();
    var hide = (c === 'login');
    serverRail.style.display = hide ? 'none' : '';
    modRail.style.display = hide ? 'none' : '';
    dock.style.display = (hide || nsDockKb) ? 'none' : '';
    applyOffset(hide);
    if (hide) return;
    rewireServerGrid();
    if (c !== lastCtx) {
      lastCtx = c;
      renderServerRail();
      renderModRail();
      renderDock();
      renderSheet();
    }
    var st = appState();
    var page = st ? st.currentPage : '';
    fixChatBottom();
    if (page === 'chat') setTimeout(injectPreviewButtons, 250);
    modRail.querySelectorAll('.ns-it').forEach(function (it) {
      var pages = it.getAttribute('data-pages');
      var on = pages ? pages.split(',').indexOf(page) >= 0 : it.getAttribute('data-page') === page;
      it.classList.toggle('active', !!on);
    });
    var onServers = window.location.hash === '#servers';
    var links = dock.querySelectorAll('a');
    var activeIdx = -1;
    links.forEach(function (a, i) {
      var on = (a.hasAttribute('data-hash') && onServers) ||
        (!onServers && ((a.hasAttribute('data-page') && a.getAttribute('data-page') === page) ||
        (a.hasAttribute('data-home') && page === 'home')));
      a.classList.toggle('active', !!on);
      if (on) activeIdx = i;
    });
    links.forEach(function (a, i) { a.classList.toggle('near', activeIdx >= 0 && Math.abs(i - activeIdx) === 1); });
  }

  function boot() {
    harvested = harvest();
    if (!harvested) { setTimeout(boot, 400); return; }
    if (isMobile() && typeof window.renderServerGrid === 'function') window.renderServerGrid = renderCleanServers;
    renderServerRail();
    renderModRail();
    renderDock();
    renderSheet();
    syncActive();
    setInterval(syncActive, 700);
    window.addEventListener('resize', function () { applyOffset(currentCtx() === 'login'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 300); });
  } else {
    setTimeout(boot, 300);
  }

  if (window.socket) {
    socket.on('token_list', function (d) { renderSavedTokens(d.tokens, d.active_index); });
    socket.on('guild_details', function () {
      setTimeout(function () {
        var st = appState();
        if (currentCtx() !== 'server' || !st || !st.currentGuild) return;
        var saved = localStorage.getItem('ns_srv_' + st.currentGuild);
        if (saved && saved !== st.currentPage && typeof navigate === 'function') navigate(saved);
        else if (!saved && typeof navigate === 'function') navigate('chat');
      }, 250);
    });
    socket.on('login_success', function () {
      setTimeout(function () { harvested = harvest(); lastCtx = null; syncActive(); }, 400);
    });
  }

  window.addEventListener('hashchange', function () {
    setTimeout(function () { lastCtx = null; syncActive(); }, 150);
  });
})();
(function () {
  if (window.NS_NOTIF_READY) return;
  window.NS_NOTIF_READY = true;
  console.log('[NS_NOTIF] Notification center initializing...');

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
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));"><strong style="color:var(--text,#fff);font-size:.85rem;">Notifications</strong><button style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:.7rem;padding:4px 10px;border-radius:6px;cursor:pointer;" onclick="NS_NOTIF.clearAll()">Clear</button></div>' +
      '<div style="overflow-y:auto;max-height:60vh;padding:6px;">' +
      (store.length ? store.map(function (x, i) {
        return '<div style="display:flex;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:' + (x.read ? 'transparent' : 'rgba(0,212,170,.08)') + ';border:1px solid rgba(255,255,255,.06);cursor:pointer;" onclick="NS_NOTIF.read(' + i + ')">' +
          '<span style="font-size:14px;">' + (ICONS[x.type] || '🛈') + '</span>' +
          '<div style="min-width:0;flex:1;"><div style="font-size:.8rem;font-weight:600;color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (window.esc ? esc(x.title) : x.title) + '</div>' +
          (x.body ? '<div style="font-size:.72rem;color:var(--text-muted,#8b90a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (window.esc ? esc(x.body) : x.body) + '</div>' : '') +
          '<div style="font-size:.62rem;color:var(--text-muted,#8b90a8);margin-top:2px;">' + new Date(x.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div></div></div>';
      }).join('') : '<div style="color:var(--text-muted,#8b90a8);font-size:.8rem;padding:20px;text-align:center;">No notifications yet</div>') +
      '</div>';
  }

  var btnStyles = 'width:40px;height:40px;border-radius:50%;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:var(--glass-bg-light,rgba(255,255,255,.06));color:var(--text-muted,#8b90a8);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:all .2s ease;flex-shrink:0;';
  var hoverIn = function() { this.style.background='rgba(0,212,170,0.1)'; this.style.borderColor='var(--primary,#454af8)'; this.style.boxShadow='0 0 12px rgba(0,212,170,.4)'; };
  var hoverOut = function() { this.style.background='var(--glass-bg-light,rgba(255,255,255,.06))'; this.style.borderColor='var(--glass-border,rgba(255,255,255,.1))'; this.style.boxShadow='none'; };

  function makeBell(id) {
    var b = document.createElement('button');
    b.id = id;
    b.className = 'ns-notif-anchor';
    b.title = 'Notifications';
    b.style.cssText = 'position:relative;' + btnStyles;
    b.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" style="display:block;"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M12 3.2c-3.3 0-5.7 2.5-5.7 5.9v3.1l-1.5 2.6c-.3.5.1 1.2.7 1.2h13c.6 0 1-.7.7-1.2l-1.5-2.6V9.1c0-3.4-2.4-5.9-5.7-5.9z"/><path fill="currentColor" d="M12 1.4l1.2 1.2L12 3.8l-1.2-1.2z"/><path fill="var(--primary,#454af8)" d="M12 17.6l1.7 2-1.7 2-1.7-2z"/></svg><span class="ns-notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--danger,#f23f43);color:#fff;font:700 9px monospace;min-width:16px;height:16px;border-radius:999px;align-items:center;justify-content:center;padding:0 4px;"></span>';
    b.onmouseenter = hoverIn;
    b.onmouseleave = hoverOut;
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
      var firstBtn = bar.querySelector('button');
      if (firstBtn && firstBtn.nextSibling) {
        bar.insertBefore(bell, firstBtn.nextSibling);
      } else {
        bar.insertBefore(bell, bar.firstChild);
      }
      console.log('[NS_NOTIF] Bell injected into top bar');
    }

    if (!bar.querySelector('#ns-refresh-btn')) {
      var rf = document.createElement('button');
      rf.id = 'ns-refresh-btn';
      rf.className = 'ns-notif-anchor';
      rf.title = 'Refresh';
      rf.textContent = '↻';
      rf.style.cssText = btnStyles;
      rf.onmouseenter = hoverIn;
      rf.onmouseleave = hoverOut;
      rf.onclick = function () { softRefresh(); };
      bar.appendChild(rf);
      console.log('[NS_NOTIF] Refresh button injected');
    }

    badge();
  }

  setInterval(ensureUI, 1500);
  ensureUI();
})();

(function () {
  if (window.__nsHomeFix) return;
  window.__nsHomeFix = true;

  function isHomeHash() {
    var h = location.hash || '';
    return h === '' || h === '#' || h === '#home' || h.indexOf('#home') === 0;
  }
  function forceHomeContext() {
    if (!isHomeHash()) return;
    try {
      if (window.AppState) {
        AppState.currentPage = 'home';
        AppState.currentGuild = null;
      }
    } catch (e) {}
    var cs = document.getElementById('channel-sidebar');
    if (cs) cs.remove();
    setTimeout(function () {
      try {
        if (typeof window.syncActive === 'function') window.syncActive();
        else {
          if (typeof window.renderModRail === 'function') window.renderModRail();
          if (typeof window.renderSheet === 'function') window.renderSheet();
        }
      } catch (e) {}
    }, 60);
    setTimeout(function () {
      if (isHomeHash()) {
        var cs2 = document.getElementById('channel-sidebar');
        if (cs2) cs2.remove();
      }
    }, 300);
  }

  window.addEventListener('hashchange', forceHomeContext, true);

  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      var dp = t.getAttribute && (t.getAttribute('data-page') || t.getAttribute('data-nav') || '');
      var txt = (t.textContent || '').trim();
      if (dp === 'home' || txt === 'Home') {
        setTimeout(forceHomeContext, 30);
        setTimeout(forceHomeContext, 250);
        return;
      }
      t = t.parentElement;
    }
  }, true);

  forceHomeContext();
})();