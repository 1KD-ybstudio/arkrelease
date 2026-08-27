(function () {
  if (window._bpModalReady) return;
  window._bpModalReady = true;
  window._bp = window._bp || { guildId: null, srvAvatar: undefined, srvBanner: undefined, gAvatar: undefined, gBanner: undefined };
  var css = document.createElement('style');
  css.textContent = '.bpm-modal{position:fixed;inset:0;z-index:10100;background:rgba(5,6,10,.7);display:none;align-items:center;justify-content:center;padding:16px}.bpm-modal.show{display:flex}.bpm-card{width:min(430px,94vw);max-height:86vh;overflow-y:auto;background:var(--glass-bg,#12141f);backdrop-filter:blur(20px);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.6)}.bpm-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1))}.bpm-head h3{margin:0;font:600 18px var(--font-heading,system-ui,sans-serif)}.bpm-x{width:30px;height:30px;border-radius:50%;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:rgba(255,255,255,.06);color:var(--text,#fff);cursor:pointer}.bpm-body{padding:16px 18px 20px;display:flex;flex-direction:column;gap:12px}.bpm-sec{font:700 10px monospace;letter-spacing:1.2px;color:var(--text-muted,#8b90a8);margin-top:4px}.bpm-row{display:flex;gap:12px;align-items:flex-start}.bpm-avwrap{width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#8a92ff,#454af8)}.bpm-avwrap img{width:100%;height:100%;object-fit:cover;display:block}.bpm-av-fb{width:100%;height:100%;display:grid;place-items:center;font:600 20px system-ui,sans-serif;color:#fff}.bpm-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}.bpm-fields label{font-size:11px;color:var(--text-muted,#8b90a8);font-weight:700}.bpm-fields input,.bpm-fields textarea{background:rgba(0,0,0,.25);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:10px;color:var(--text,#fff);padding:8px 10px;font-size:13px;width:100%}.bpm-btns{display:flex;gap:6px;flex-wrap:wrap}.bpm-btn{border-radius:10px;padding:8px 12px;font-weight:700;font-size:12px;cursor:pointer;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:rgba(255,255,255,.06);color:var(--text,#fff)}.bpm-save{width:100%;border:none;border-radius:12px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#8a92ff,#454af8);color:#fff;box-shadow:0 0 18px rgba(69,74,248,.35)}.bpm-save:disabled{opacity:.6;cursor:default}.bpm-banner{width:100%;max-height:90px;object-fit:cover;border-radius:10px;border:1px solid var(--glass-border,rgba(255,255,255,.1))}';
  document.head.appendChild(css);
  function ensure() {
    if (document.getElementById('bot-profile-modal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'bot-profile-modal';
    wrap.className = 'bpm-modal';
    wrap.innerHTML =
      '<div class="bpm-card">' +
      '<div class="bpm-head"><h3 id="bpm-title">Bot Profile</h3><button class="bpm-x" id="bpm-x">✕</button></div>' +
      '<div class="bpm-body">' +
      '<span class="bpm-sec">THIS SERVER</span>' +
      '<div class="bpm-row"><div class="bpm-avwrap"><img id="bpm-srv-av" alt="" style="display:none"><span class="bpm-av-fb" id="bpm-srv-av-fb">S</span></div>' +
      '<div class="bpm-fields"><label>Nickname</label><input id="bpm-nickname" placeholder="Server nickname">' +
      '<label>Bio</label><textarea id="bpm-srv-bio" rows="2" placeholder="Per-server bio"></textarea>' +
      '<div class="bpm-btns"><button class="bpm-btn" id="bpm-change-av">Change avatar</button><button class="bpm-btn" id="bpm-s-banner">Change banner</button><button class="bpm-btn" id="bpm-remove">Remove avatar</button></div></div></div>' +
      '<img id="bpm-srv-banner" class="bpm-banner" style="display:none" alt="" title="Tap to clear banner">' +
      '<input type="file" id="bpm-srv-file" accept="image/*" style="display:none">' +
      '<input type="file" id="bpm-s-banner-file" accept="image/*" style="display:none">' +
      '<button class="bpm-save" id="bpm-save-srv">Save server profile</button>' +
      '<span class="bpm-sec">GLOBAL IDENTITY</span>' +
      '<div class="bpm-row"><div class="bpm-avwrap"><img id="bpm-g-av" alt="" style="display:none"><span class="bpm-av-fb" id="bpm-g-av-fb">B</span></div>' +
      '<div class="bpm-fields"><label>Bio</label><textarea id="bpm-bio" rows="2"></textarea>' +
      '<div class="bpm-btns"><button class="bpm-btn" id="bpm-g-av">Avatar</button><button class="bpm-btn" id="bpm-g-banner">Banner</button></div></div></div>' +
      '<img id="bpm-banner-preview" class="bpm-banner" style="display:none" alt="">' +
      '<input type="file" id="bpm-g-av-file" accept="image/*" style="display:none">' +
      '<input type="file" id="bpm-g-banner-file" accept="image/*" style="display:none">' +
      '<button class="bpm-save" id="bpm-save-global">Save global identity</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeBotProfileModal(); });
    document.getElementById('bpm-x').onclick = closeBotProfileModal;
    document.getElementById('bpm-change-av').onclick = function () { document.getElementById('bpm-srv-file').click(); };
    document.getElementById('bpm-s-banner').onclick = function () { document.getElementById('bpm-s-banner-file').click(); };
    document.getElementById('bpm-remove').onclick = function () { bpClear('srv'); };
    document.getElementById('bpm-srv-banner').onclick = function () { bpClear('sbanner'); };
    document.getElementById('bpm-save-srv').onclick = saveServerProfile;
    document.getElementById('bpm-g-av').onclick = function () { document.getElementById('bpm-g-av-file').click(); };
    document.getElementById('bpm-g-banner').onclick = function () { document.getElementById('bpm-g-banner-file').click(); };
    document.getElementById('bpm-save-global').onclick = saveGlobalProfile;
    document.getElementById('bpm-srv-file').onchange = function () { bpReadFile(this, 'srv'); };
    document.getElementById('bpm-s-banner-file').onchange = function () { bpReadFile(this, 'sbanner'); };
    document.getElementById('bpm-g-av-file').onchange = function () { bpReadFile(this, 'gav'); };
    document.getElementById('bpm-g-banner-file').onchange = function () { bpReadFile(this, 'gbanner'); };
  }
  window.openBotProfileModal = function (guildId) {
    ensure();
    window._bp.guildId = guildId;
    window._bp.srvAvatar = undefined;
    window._bp.srvBanner = undefined;
    window._bp.gAvatar = undefined;
    window._bp.gBanner = undefined;
    var g = (AppState.cachedGuilds || []).find(function (x) { return x.id === guildId; });
    document.getElementById('bpm-title').textContent = g ? ('Bot profile — ' + g.name) : 'Bot profile';
    document.getElementById('bpm-nickname').value = '';
    document.getElementById('bpm-srv-bio').value = '';
    document.getElementById('bpm-bio').value = '';
    document.getElementById('bpm-srv-av').style.display = 'none';
    document.getElementById('bpm-srv-av-fb').style.display = 'grid';
    document.getElementById('bpm-srv-banner').style.display = 'none';
    document.getElementById('bpm-banner-preview').style.display = 'none';
    document.getElementById('bot-profile-modal').classList.add('show');
    socket.emit('run_command', { cmd: 'bot_server_profile_get', params: { guild_id: guildId } });
    socket.emit('run_command', { cmd: 'bot_profile_get', params: {} });
  };
  window.closeBotProfileModal = function () {
    var m = document.getElementById('bot-profile-modal');
    if (m) m.classList.remove('show');
  };
  window.bpReadFile = function (input, kind) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      if (kind === 'srv') {
        window._bp.srvAvatar = dataUrl;
        var img = document.getElementById('bpm-srv-av');
        img.src = dataUrl; img.style.display = 'block';
        document.getElementById('bpm-srv-av-fb').style.display = 'none';
      } else if (kind === 'sbanner') {
        window._bp.srvBanner = dataUrl;
        var sb = document.getElementById('bpm-srv-banner');
        sb.src = dataUrl; sb.style.display = 'block';
      } else if (kind === 'gav') {
        window._bp.gAvatar = dataUrl;
        var gav = document.getElementById('bpm-g-av');
        gav.src = dataUrl; gav.style.display = 'block';
        document.getElementById('bpm-g-av-fb').style.display = 'none';
      } else {
        window._bp.gBanner = dataUrl;
        var bp = document.getElementById('bpm-banner-preview');
        bp.src = dataUrl; bp.style.display = 'block';
      }
      pushNotification('Image loaded — press Save to apply', '', 'info', 2000);
    };
    reader.readAsDataURL(file);
    input.value = '';
  };
  window.bpClear = function (kind) {
    if (kind === 'srv') {
      window._bp.srvAvatar = null;
      document.getElementById('bpm-srv-av').style.display = 'none';
      document.getElementById('bpm-srv-av-fb').style.display = 'grid';
    } else if (kind === 'sbanner') {
      window._bp.srvBanner = null;
      document.getElementById('bpm-srv-banner').style.display = 'none';
    }
  };
  function setBpmBusy(busy, which) {
    var srv = document.getElementById('bpm-save-srv');
    var glo = document.getElementById('bpm-save-global');
    if (srv) { srv.disabled = busy; srv.textContent = busy && which === 'srv' ? 'Saving…' : 'Save server profile'; }
    if (glo) { glo.disabled = busy; glo.textContent = busy && which === 'global' ? 'Saving…' : 'Save global identity'; }
    if (busy) setTimeout(function () { setBpmBusy(false); }, 12000);
  }
  socket.on('notification', function () { setBpmBusy(false); });
  socket.on('error', function () { setBpmBusy(false); });
  window.saveServerProfile = function () {
    setBpmBusy(true, 'srv');
    var params = {
      guild_id: window._bp.guildId,
      nickname: document.getElementById('bpm-nickname').value,
      bio: document.getElementById('bpm-srv-bio').value
    };
    if (window._bp.srvAvatar !== undefined) params.avatar = window._bp.srvAvatar;
    if (window._bp.srvBanner !== undefined) params.banner = window._bp.srvBanner;
    socket.emit('run_command', { cmd: 'bot_server_profile_save', params: params });
  };
  window.saveGlobalProfile = function () {
    setBpmBusy(true, 'global');
    var params = { bio: document.getElementById('bpm-bio').value };
    if (window._bp.gAvatar) params.avatar = window._bp.gAvatar;
    if (window._bp.gBanner) params.banner = window._bp.gBanner;
    socket.emit('run_command', { cmd: 'bot_profile_save', params: params });
  };
  socket.on('bot_server_profile', function (d) {
    document.getElementById('bpm-nickname').value = d.nickname || '';
    document.getElementById('bpm-srv-bio').value = d.bio || '';
    if (d.avatar_url && window._bp.srvAvatar === undefined) {
      var img = document.getElementById('bpm-srv-av');
      img.src = d.avatar_url; img.style.display = 'block';
      document.getElementById('bpm-srv-av-fb').style.display = 'none';
    }
    if (d.banner_url && window._bp.srvBanner === undefined) {
      var sb = document.getElementById('bpm-srv-banner');
      sb.src = d.banner_url; sb.style.display = 'block';
    }
  });
  socket.on('bot_profile', function (d) {
    document.getElementById('bpm-bio').value = d.bio || '';
    if (d.avatar_url) {
      var gav = document.getElementById('bpm-g-av');
      gav.src = d.avatar_url; gav.style.display = 'block';
      document.getElementById('bpm-g-av-fb').style.display = 'none';
    }
    if (d.banner_url) {
      var bp = document.getElementById('bpm-banner-preview');
      bp.src = d.banner_url; bp.style.display = 'block';
    }
  });
})();