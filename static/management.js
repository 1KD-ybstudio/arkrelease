function buildOverviewContent() {
  if (!AppState.serverData) return '';
  const g = AppState.serverData;
  const textCh = g.channels.filter(c => c.type === 'text');
  const voiceCh = g.channels.filter(c => c.type === 'voice');
  return '<div class="stats-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px,1fr)); gap:16px; margin-bottom:24px;">' +
    '<div class="stat-box" onclick="navigate(\'members\')" style="cursor:pointer;"><div class="stat-value">'+g.member_count+'</div><div class="stat-label">Members</div></div>' +
    '<div class="stat-box" onclick="navigate(\'channels\')" style="cursor:pointer;"><div class="stat-value">'+textCh.length+'</div><div class="stat-label">Text</div></div>' +
    '<div class="stat-box" onclick="navigate(\'channels\')" style="cursor:pointer;"><div class="stat-value">'+voiceCh.length+'</div><div class="stat-label">Voice</div></div>' +
    '<div class="stat-box" onclick="navigate(\'roles\')" style="cursor:pointer;"><div class="stat-value">'+g.roles.length+'</div><div class="stat-label">Roles</div></div>' +
    '</div>' +
    '<div class="glass-card">' +
    '<h3>Edit Server Profile</h3>' +
    '<div class="form-group"><label>Server Name</label><input id="ov-name" value="'+esc(g.name)+'"></div>' +
    '<div class="form-group"><label>Description</label><textarea id="ov-desc" rows="3">'+esc(g.description || '')+'</textarea></div>' +
    '<div class="form-group"><label>Server Icon</label><input type="file" id="ov-icon" accept="image/*" onchange="previewFile(this, \'icon-preview\')"><img id="icon-preview" style="max-width:64px; border-radius:50%; '+(g.icon_url ? '' : 'display:none;')+'" src="'+esc(g.icon_url || '')+'"></div>' +
    '<div class="form-group"><label>Banner</label><input type="file" id="ov-banner" accept="image/*" onchange="previewFile(this, \'banner-preview\')"><img id="banner-preview" style="max-width:100%; max-height:120px; border-radius:10px; '+(g.banner_url ? '' : 'display:none;')+'" src="'+esc(g.banner_url || '')+'"></div>' +
    '<div class="form-group"><label>Invite Splash</label><input type="file" id="ov-splash" accept="image/*" onchange="previewFile(this, \'splash-preview\')"><img id="splash-preview" style="max-width:100%; max-height:120px; border-radius:10px; display:none;"></div>' +
    '<div class="form-group"><label>Verification Level</label><select id="ov-verification">'+[0,1,2,3,4].map(v => '<option value="'+v+'" '+(g.verification_level === v ? 'selected' : '')+'>'+['None','Low','Medium','High','Highest'][v]+'</option>').join('')+'</select></div>' +
    '<div class="form-group"><label>Explicit Content Filter</label><select id="ov-explicit">'+[0,1,2].map(v => '<option value="'+v+'" '+(g.explicit_content_filter === v ? 'selected' : '')+'>'+['Disabled','Members without roles','All members'][v]+'</option>').join('')+'</select></div>' +
    '<div class="form-group"><label>AFK Channel</label><select id="ov-afk"><option value="">None</option>'+g.channels.filter(c => c.type === 'voice').map(c => '<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></div>' +
    '<div class="form-group"><label>AFK Timeout (seconds)</label><input type="number" id="ov-afk-timeout" value="300" placeholder="300"></div>' +
    '<div class="form-group"><label>System Channel</label><select id="ov-system"><option value="">None</option>'+textCh.map(c => '<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></div>' +
    '<button class="primary-btn" id="ov-save-btn" onclick="saveOverview()">Save Changes</button>' +
    '</div>';
}

function buildRolesContent() {
  if (!AppState.serverData) return '';
  let html = '<div class="glass-card"><h3>Roles</h3><button class="primary-btn" onclick="createRole()" style="margin-bottom:1rem;">Create Role</button>';
  AppState.serverData.roles.forEach(r => {
    const hex = '#' + r.color.toString(16).padStart(6, '0');
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0;">' +
      '<span style="color:'+hex+'">@'+esc(r.name)+'</span>' +
      '<div>' +
      '<button class="secondary-btn" onclick="editRole(\''+r.id+'\')">Edit</button>' +
      '<button class="danger-btn" onclick="deleteRole(\''+r.id+'\')">Delete</button>' +
      '</div>' +
      '</div>';
  });
  html += '</div>';
  return html;
}

function buildChannelsContent() {
  if (!AppState.serverData) return '<div class="glass-card"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg><p>No server data loaded.</p></div></div>';
  return '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">' +
    '<button class="primary-btn" onclick="document.getElementById(\'modal-create-channel\').style.display=\'flex\'; loadCategoriesForCreate();">+ Create Channel</button>' +
    '<button class="secondary-btn" onclick="document.getElementById(\'modal-create-category\').style.display=\'flex\'">+ Create Category</button>' +
    '</div>' +
    '<div id="channel-tree" style="max-height:calc(100vh - 200px); overflow-y:auto;"></div>';
}

function loadChannelTree() {
  socket.emit('run_command', { cmd: 'guild_structure', params: { guild_id: AppState.currentGuild } });
}

socket.on('guild_structure', function(data) {
  const channelTree = document.getElementById('channel-tree');
  if (channelTree) {
    let html = '';
    if (data.categories && data.categories.length > 0) {
      data.categories.forEach(cat => {
        html += '<div class="channel-tree-category"><div class="cat-header" style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:rgba(0,0,0,0.2); border-radius:var(--radius-sm); cursor:pointer;" onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === \'none\' ? \'block\' : \'none\')"><span style="color:var(--primary); font-weight:600;">'+esc(cat.name)+'</span><div style="display:flex; gap:4px;"><button class="secondary-btn" onclick="event.stopPropagation(); openCategorySettings(\''+cat.id+'\')" style="font-size:0.7rem;">Settings</button><span style="font-size:0.8rem; color:var(--text);">▾</span></div></div><div class="cat-channels" style="display:block;">';
        if (cat.channels && cat.channels.length > 0) {
          cat.channels.forEach(ch => {
            html += '<div class="channel-tree-item" data-channel-id="'+ch.id+'" style="cursor:grab; padding:6px 12px;" onclick="openChannelSettings(\''+ch.id+'\')"><span>'+(ch.type==='voice'?'~':'#')+' '+esc(ch.name)+'</span></div>';
          });
        } else {
          html += '<div style="padding:4px 8px; color:var(--text-muted); font-size:0.8rem;">Empty</div>';
        }
        html += '</div></div>';
      });
    }
    if (data.uncategorised && data.uncategorised.length > 0) {
      html += '<div class="channel-tree-category"><div class="cat-header" style="color:var(--primary); font-weight:600; padding:8px; background:rgba(0,0,0,0.2); border-radius:var(--radius-sm);">Uncategorised</div><div class="cat-channels" style="display:block;">';
      data.uncategorised.forEach(ch => {
        html += '<div class="channel-tree-item" data-channel-id="'+ch.id+'" style="cursor:grab; padding:6px 12px;" onclick="openChannelSettings(\''+ch.id+'\')"><span>'+(ch.type==='voice'?'~':'#')+' '+esc(ch.name)+'</span></div>';
      });
      html += '</div></div>';
    }
    if ((!data.categories || data.categories.length === 0) && (!data.uncategorised || data.uncategorised.length === 0)) {
      html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><p>No channels found.</p></div>';
    }
    channelTree.innerHTML = html;
    initChannelDrag();
  }

  const categoriesList = document.getElementById('categories-list');
  if (categoriesList) {
    let html = '';
    if (data.categories && data.categories.length > 0) {
      data.categories.forEach(cat => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:6px;"><span style="color:var(--primary); font-weight:600;">'+esc(cat.name)+'</span><div style="display:flex; gap:4px;"><button class="secondary-btn" onclick="openCategorySettings(\''+cat.id+'\')" style="font-size:0.8rem;">Edit</button><button class="danger-btn" onclick="deleteCategoryFromList(\''+cat.id+'\')" style="font-size:0.8rem;">Delete</button></div></div>';
      });
    } else {
      html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><p>No categories found.</p></div>';
    }
    categoriesList.innerHTML = html;
  }
});

let dragData = null;
function initChannelDrag() {
  document.querySelectorAll('.channel-tree-item').forEach(item => {
    item.removeEventListener('mousedown', onDragStart);
    item.removeEventListener('touchstart', onDragStart);
    item.addEventListener('mousedown', onDragStart);
    item.addEventListener('touchstart', onDragStart, { passive: false });
  });
}

function onDragStart(e) {
  const item = e.currentTarget;
  const channelId = item.dataset.channelId;
  if (!channelId) return;
  const isTouch = e.type === 'touchstart';
  const startX = isTouch ? e.touches[0].clientX : e.clientX;
  const startY = isTouch ? e.touches[0].clientY : e.clientY;
  let timer = setTimeout(() => {
    timer = null;
    const clone = item.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.opacity = '0.8';
    clone.style.pointerEvents = 'none';
    clone.style.width = item.offsetWidth + 'px';
    clone.style.left = startX - 20 + 'px';
    clone.style.top = startY - 10 + 'px';
    document.body.appendChild(clone);
    dragData = { channelId, clone, startY, item, origIndex: Array.from(item.parentNode.children).indexOf(item) };
    item.style.opacity = '0.3';
  }, 600);

  function onMove(e) {
    if (!dragData) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragData.clone.style.top = clientY - 10 + 'px';
    const treeItems = [...document.querySelectorAll('.channel-tree-item')];
    const mouseY = clientY;
    let target = null;
    for (const el of treeItems) {
      const rect = el.getBoundingClientRect();
      if (mouseY > rect.top && mouseY < rect.bottom) { target = el; break; }
    }
    treeItems.forEach(el => el.style.borderTop = el.style.borderBottom = '');
    if (target && target !== item) {
      const rect = target.getBoundingClientRect();
      const mid = rect.top + rect.height/2;
      if (clientY < mid) target.style.borderTop = '2px solid var(--primary)';
      else target.style.borderBottom = '2px solid var(--primary)';
    }
  }

  function onEnd(e) {
    clearTimeout(timer);
    if (!dragData) return;
    const { clone, channelId, item, origIndex } = dragData;
    clone.remove();
    item.style.opacity = '1';
    const treeItems = [...document.querySelectorAll('.channel-tree-item')];
    let targetIndex = -1;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    for (let i = 0; i < treeItems.length; i++) {
      const rect = treeItems[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) { targetIndex = i; break; }
    }
    if (targetIndex === -1) {
      dragData = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      treeItems.forEach(el => el.style.borderTop = el.style.borderBottom = '');
      return;
    }
    const currentIndex = Array.from(item.parentNode.children).indexOf(item);
    const newIndex = targetIndex;
    let newPos;
    if (newIndex === currentIndex) { newPos = null; }
    else if (newIndex < currentIndex) { newPos = newIndex; }
    else { newPos = newIndex - 1; }
    if (newPos !== null) {
      socket.emit('run_command', {
        cmd: 'channel_move_absolute',
        params: { channel_id: channelId, position: newPos, guild_id: AppState.currentGuild }
      });
    }
    treeItems.forEach(el => el.style.borderTop = el.style.borderBottom = '');
    dragData = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
  }

  function cancelDrag(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientX - startX) > 20 || Math.abs(clientY - startY) > 20) {
      clearTimeout(timer);
      document.removeEventListener('mousemove', cancelDrag);
      document.removeEventListener('touchmove', cancelDrag);
      document.removeEventListener('mouseup', cancelDrag);
      document.removeEventListener('touchend', cancelDrag);
    }
  }

  document.addEventListener('mousemove', cancelDrag);
  document.addEventListener('touchmove', cancelDrag, { passive: false });
  document.addEventListener('mouseup', () => { clearTimeout(timer); });
  document.addEventListener('touchend', () => { clearTimeout(timer); });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);

  if (isTouch) {
    const preventScroll = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchend', () => document.removeEventListener('touchmove', preventScroll), { once: true });
  }
}

function openChannelSettings(channelId) {
  document.getElementById('edit-channel-id').value = channelId;
  socket.emit('run_command', { cmd: 'channel_get', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
  document.getElementById('modal-channel-settings').style.display = 'flex';
}

socket.on('channel_info', function(data) {
  document.getElementById('edit-channel-name').value = data.name || '';
  document.getElementById('edit-channel-topic').value = data.topic || '';
  document.getElementById('edit-channel-slowmode').value = data.slowmode || 0;
  document.getElementById('edit-channel-nsfw').classList.toggle('active', data.nsfw);
  document.getElementById('edit-channel-private').classList.toggle('active', data.private);
  loadCategoriesForEdit(data.category_id);
  switchChannelTab('general');
});

function deleteChannelFromModal() {
  const chId = document.getElementById('edit-channel-id').value;
  if (!chId) return;
  customConfirm('Delete this channel permanently?').then(ok => {
    if (!ok) return;
    socket.emit('run_command', { cmd: 'channel_delete', params: { channel_id: chId, guild_id: AppState.currentGuild } });
    document.getElementById('modal-channel-settings').style.display = 'none';
    setTimeout(loadChannelTree, 500);
  });
}

function loadCategoriesForEdit(selectedCategoryId) {
  socket.emit('run_command', { cmd: 'guild_structure', params: { guild_id: AppState.currentGuild } });
  socket.once('guild_structure', function(struct) {
    const sel = document.getElementById('edit-channel-category');
    sel.innerHTML = '<option value="">No Category</option>';
    if (struct.categories) {
      struct.categories.forEach(cat => {
        const selected = cat.id === selectedCategoryId ? ' selected' : '';
        sel.innerHTML += '<option value="'+cat.id+'" '+selected+'>'+esc(cat.name)+'</option>';
      });
    }
  });
}

function loadCategoriesForCreate() {
  socket.emit('run_command', { cmd: 'guild_structure', params: { guild_id: AppState.currentGuild } });
  socket.once('guild_structure', function(struct) {
    const sel = document.getElementById('new-channel-category');
    sel.innerHTML = '<option value="">No Category</option>';
    if (struct.categories) {
      struct.categories.forEach(cat => {
        sel.innerHTML += '<option value="'+cat.id+'">'+esc(cat.name)+'</option>';
      });
    }
  });
}

function createChannel() {
  const name = document.getElementById('new-channel-name').value.trim() || 'new-channel';
  const type = document.getElementById('new-channel-type').value;
  const category = document.getElementById('new-channel-category').value;
  const private = document.getElementById('new-channel-private').classList.contains('active');
  socket.emit('run_command', { cmd: 'channel_create', params: { name, type, category_id: category || undefined, private, guild_id: AppState.currentGuild } });
  document.getElementById('modal-create-channel').style.display = 'none';
  setTimeout(loadChannelTree, 500);
}

function createCategory() {
  const name = document.getElementById('new-category-name').value.trim() || 'New Category';
  const private = document.getElementById('new-category-private').classList.contains('active');
  socket.emit('run_command', { cmd: 'category_create', params: { name, private, guild_id: AppState.currentGuild } });
  document.getElementById('modal-create-category').style.display = 'none';
  setTimeout(loadChannelTree, 500);
}

function saveChannelSettings() {
  const channelId = document.getElementById('edit-channel-id').value;
  const name = document.getElementById('edit-channel-name').value.trim();
  const topic = document.getElementById('edit-channel-topic').value.trim();
  const category = document.getElementById('edit-channel-category').value;
  const slowmode = parseInt(document.getElementById('edit-channel-slowmode').value) || 0;
  const nsfw = document.getElementById('edit-channel-nsfw').classList.contains('active');
  const private = document.getElementById('edit-channel-private').classList.contains('active');
  socket.emit('run_command', { cmd: 'channel_edit', params: { channel_id: channelId, name, topic, category_id: category || null, slowmode, nsfw, private, guild_id: AppState.currentGuild } });
  document.getElementById('modal-channel-settings').style.display = 'none';
  setTimeout(loadChannelTree, 500);
}

function switchChannelTab(tab) {
  document.querySelectorAll('#modal-channel-settings .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  ['general', 'permissions', 'webhooks', 'pins', 'invites'].forEach(t => {
    document.getElementById('channel-tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'permissions') loadPermissions();
  if (tab === 'webhooks') loadWebhooks();
  if (tab === 'pins') loadPins();
  if (tab === 'invites') loadInvites();
}

function loadPermissions() {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'channel_permissions_get', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
}

socket.on('channel_permissions', function(data) {
  const list = document.getElementById('permissions-list');
  if (!list) return;
  let html = '';
  (data.overwrites || []).forEach(ow => {
    html += '<div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:8px; margin-bottom:4px;">' +
      '<span>'+esc(ow.name)+' <span style="color:var(--primary); font-size:0.7rem;">('+ow.type+')</span></span>' +
      '<div>' +
      '<button class="secondary-btn" onclick="openPermissionEditor(\''+data.channel_id+'\',\''+ow.id+'\',\''+ow.type+'\',\''+esc(ow.name)+'\')" style="font-size:0.7rem;">Edit</button>' +
      '<button class="danger-btn" onclick="removePermissionOverwrite(\''+data.channel_id+'\',\''+ow.id+'\',\''+ow.type+'\')" style="font-size:0.7rem;">Remove</button>' +
      '</div>' +
      '</div>';
  });
  if (!data.overwrites || data.overwrites.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg><p>No custom permissions.</p></div>';
  list.innerHTML = html;
});

function addPermissionRole() {
  document.getElementById('perm-add-title').textContent = 'Add Role';
  socket.emit('run_command', { cmd: 'server_roles_list', params: { guild_id: AppState.currentGuild } });
  socket.once('server_roles_data', function(data) {
    const sel = document.getElementById('perm-add-select');
    sel.innerHTML = '';
    (data.roles || []).forEach(r => { if (r.name !== '@everyone') sel.innerHTML += '<option value="'+r.id+'">'+esc(r.name)+'</option>'; });
    document.getElementById('modal-permission-add').style.display = 'flex';
  });
}

function addPermissionMember() {
  document.getElementById('perm-add-title').textContent = 'Add Member';
  socket.emit('run_command', { cmd: 'server_members_list', params: { guild_id: AppState.currentGuild } });
  socket.once('server_members_list', function(data) {
    const sel = document.getElementById('perm-add-select');
    sel.innerHTML = '';
    (data.members || []).forEach(m => { sel.innerHTML += '<option value="'+m.id+'">'+esc(m.name)+' ('+esc(m.username)+')</option>'; });
    document.getElementById('modal-permission-add').style.display = 'flex';
  });
}

function addPermissionTarget() {
  const sel = document.getElementById('perm-add-select');
  const targetId = sel.value;
  const targetType = document.getElementById('perm-add-title').textContent === 'Add Role' ? 'role' : 'member';
  const channelId = document.getElementById('edit-channel-id').value;
  if (!targetId) return;
  socket.emit('run_command', { cmd: 'channel_permissions_set', params: { channel_id: channelId, target_id: targetId, target_type: targetType, permission: 'view_channel', action: 'neutral', guild_id: AppState.currentGuild } });
  document.getElementById('modal-permission-add').style.display = 'none';
  setTimeout(loadPermissions, 400);
}

function removePermissionOverwrite(channelId, targetId, targetType) {
  socket.emit('run_command', { cmd: 'channel_permissions_set', params: { channel_id: channelId, target_id: targetId, target_type: targetType, permission: 'view_channel', action: 'neutral', guild_id: AppState.currentGuild } });
  setTimeout(loadPermissions, 400);
}

let permEditorData = {};
const PERM_BITS = {
  "administrator": 3, "view_audit_log": 7, "manage_guild": 5, "manage_roles": 28,
  "manage_channels": 16, "kick_members": 1, "ban_members": 2, "create_invite": 0,
  "change_nickname": 26, "manage_nicknames": 27, "manage_webhooks": 29,
  "manage_emojis_and_stickers": 30, "manage_events": 31, "moderate_members": 40,
  "view_channel": 10, "send_messages": 11, "send_tts_messages": 12,
  "manage_messages": 13, "embed_links": 14, "attach_files": 15,
  "read_message_history": 17, "mention_everyone": 18, "use_external_emojis": 19,
  "connect": 20, "speak": 21, "mute_members": 22, "deafen_members": 23,
  "move_members": 24, "use_voice_activity": 25, "priority_speaker": 32,
  "stream": 33, "use_application_commands": 34, "request_to_speak": 35,
  "create_public_threads": 36, "create_private_threads": 37,
  "use_external_stickers": 38, "send_messages_in_threads": 39,
  "start_embedded_activities": 41
};

function openPermissionEditor(channelId, targetId, targetType, targetName) {
  document.getElementById('perm-editor-title').textContent = 'Permissions for ' + targetName;
  socket.emit('run_command', { cmd: 'channel_permissions_get', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
  socket.once('channel_permissions', function(data) {
    const ow = (data.overwrites || []).find(o => o.id === targetId);
    const allowed = ow ? ow.allowed : [];
    const denied = ow ? ow.denied : [];
    let html = '';
    Object.keys(PERM_BITS).forEach(perm => {
      let state = 'neutral';
      if (allowed.includes(perm)) state = 'allow';
      if (denied.includes(perm)) state = 'deny';
      let bg, color;
      if (state === 'allow') { bg = '#2ecc71'; color = '#fff'; }
      else if (state === 'deny') { bg = '#ff5e57'; color = '#fff'; }
      else { bg = 'rgba(255,255,255,0.1)'; color = 'var(--text)'; }
      html += '<button style="font-size:0.7rem; padding:6px 10px; margin:2px; background:'+bg+'; color:'+color+'; border:none; border-radius:4px; cursor:pointer;" onclick="cyclePermission(\''+perm+'\',\''+state+'\')">'+perm.replace(/_/g,' ')+'</button>';
    });
    document.getElementById('perm-editor-list').innerHTML = html;
    document.getElementById('modal-permission-editor').style.display = 'flex';
    permEditorData = { channelId, targetId, targetType };
  });
}

function cyclePermission(perm, currentState) {
  let action;
  if (currentState === 'neutral') action = 'allow';
  else if (currentState === 'allow') action = 'deny';
  else action = 'neutral';
  socket.emit('run_command', { cmd: 'channel_permissions_set', params: { channel_id: permEditorData.channelId, target_id: permEditorData.targetId, target_type: permEditorData.targetType, permission: perm, action, guild_id: AppState.currentGuild } });
  setTimeout(() => openPermissionEditor(permEditorData.channelId, permEditorData.targetId, permEditorData.targetType, document.getElementById('perm-editor-title').textContent.replace('Permissions for ', '')), 300);
}

function loadWebhooks() {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'channel_webhooks', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
}

socket.on('channel_webhooks', function(data) {
  const list = document.getElementById('webhooks-list');
  if (!list) return;
  let html = '';
  (data.webhooks || []).forEach(wh => {
    html += '<div style="background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:10px; margin-bottom:6px;">' +
      '<strong>'+esc(wh.name)+'</strong>' +
      '<div style="display:flex; gap:4px; margin-top:5px;">' +
      '<button class="secondary-btn" onclick="copyToClipboard(\''+wh.url+'\')" style="font-size:0.7rem;">Copy URL</button>' +
      '<button class="secondary-btn" onclick="openEditWebhook(\''+wh.id+'\',\''+esc(wh.name)+'\')" style="font-size:0.7rem;">Edit</button>' +
      '<button class="danger-btn" onclick="deleteWebhook(\''+wh.id+'\')" style="font-size:0.7rem;">Delete</button>' +
      '</div>' +
      '</div>';
  });
  if (!data.webhooks || data.webhooks.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><p>No webhooks.</p></div>';
  list.innerHTML = html;
});

function createChannelWebhook() {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'webhook_create', params: { channel_id: channelId, name: 'Arklum Webhook', guild_id: AppState.currentGuild } });
  setTimeout(loadWebhooks, 500);
}

function openEditWebhook(webhookId, currentName) {
  document.getElementById('edit-webhook-id').value = webhookId;
  document.getElementById('edit-webhook-name').value = currentName;
  socket.emit('run_command', { cmd: 'guild_structure', params: { guild_id: AppState.currentGuild } });
  socket.once('guild_structure', function(struct) {
    const sel = document.getElementById('edit-webhook-channel');
    sel.innerHTML = '<option value="">Same Channel</option>';
    if (struct.categories) {
      struct.categories.forEach(cat => {
        (cat.channels || []).forEach(ch => {
          sel.innerHTML += '<option value="'+ch.id+'">'+esc(ch.name)+'</option>';
        });
      });
    }
    if (struct.uncategorised) {
      struct.uncategorised.forEach(ch => {
        sel.innerHTML += '<option value="'+ch.id+'">'+esc(ch.name)+'</option>';
      });
    }
    document.getElementById('modal-edit-webhook').style.display = 'flex';
  });
}

function saveWebhookEdit() {
  const webhookId = document.getElementById('edit-webhook-id').value;
  const name = document.getElementById('edit-webhook-name').value.trim();
  const channelId = document.getElementById('edit-webhook-channel').value;
  socket.emit('run_command', { cmd: 'webhook_edit', params: { id: webhookId, name, channel_id: channelId || undefined, guild_id: AppState.currentGuild } });
  document.getElementById('modal-edit-webhook').style.display = 'none';
  setTimeout(loadWebhooks, 500);
}

function deleteWebhook(webhookId) {
  customConfirm('Delete this webhook?').then(ok => {
    if (!ok) return;
    socket.emit('run_command', { cmd: 'webhook_delete', params: { id: webhookId, guild_id: AppState.currentGuild } });
    setTimeout(loadWebhooks, 500);
  });
}

function loadPins() {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'channel_pins', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
}

socket.on('channel_pins', function(data) {
  const list = document.getElementById('pins-list');
  if (!list) return;
  let html = '';
  (data.pins || []).forEach(pin => {
    html += '<div style="background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:10px; margin-bottom:6px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<span style="font-size:0.8rem;">'+esc(pin.author)+': '+esc(pin.content)+'</span>' +
      '<button class="secondary-btn" onclick="unpinMessage(\''+pin.id+'\')" style="font-size:0.7rem;">Unpin</button>' +
      '</div>' +
      '</div>';
  });
  if (!data.pins || data.pins.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg><p>No pinned messages.</p></div>';
  list.innerHTML = html;
});

function unpinMessage(messageId) {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'channel_unpin', params: { channel_id: channelId, message_id: messageId, guild_id: AppState.currentGuild } });
  setTimeout(loadPins, 500);
}

function loadInvites() {
  const channelId = document.getElementById('edit-channel-id').value;
  socket.emit('run_command', { cmd: 'channel_invites', params: { channel_id: channelId, guild_id: AppState.currentGuild } });
}

socket.on('channel_invites', function(data) {
  const list = document.getElementById('invites-list');
  if (!list) return;
  let html = '';
  (data.invites || []).forEach(inv => {
    html += '<div style="background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:10px; margin-bottom:6px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<span style="font-size:0.8rem;">'+inv.url+' ('+inv.uses+'/'+(inv.max_uses || '∞')+')</span>' +
      '<div>' +
      '<button class="secondary-btn" onclick="copyToClipboard(\''+inv.url+'\')" style="font-size:0.7rem;">Copy</button>' +
      '<button class="danger-btn" onclick="revokeInvite(\''+inv.code+'\')" style="font-size:0.7rem;">Revoke</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  });
  if (!data.invites || data.invites.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg><p>No active invites.</p></div>';
  list.innerHTML = html;
});

function revokeInvite(code) {
  customConfirm('Revoke this invite?').then(ok => {
    if (!ok) return;
    socket.emit('run_command', { cmd: 'channel_invite_revoke', params: { code, guild_id: AppState.currentGuild } });
    setTimeout(loadInvites, 500);
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => pushNotification('Copied', '', 'success', 2000)).catch(() => pushNotification('Copy failed', '', 'error'));
}

function previewFile(input, imgId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { const img = document.getElementById(imgId); if (img) { img.src = e.target.result; img.style.display = 'block'; } };
  reader.readAsDataURL(file);
}

function getFileBase64(fileInput) {
  return new Promise(resolve => {
    const file = fileInput.files[0];
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function saveOverview() {
  const btn = document.getElementById('ov-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const params = {
    guild_id: AppState.currentGuild,
    name: document.getElementById('ov-name').value,
    description: document.getElementById('ov-desc').value,
    verification_level: document.getElementById('ov-verification').value,
    explicit_content_filter: document.getElementById('ov-explicit').value,
    afk_channel_id: document.getElementById('ov-afk').value || null,
    afk_timeout: document.getElementById('ov-afk-timeout').value,
    system_channel_id: document.getElementById('ov-system')?.value || null
  };
  const iconB64 = await getFileBase64(document.getElementById('ov-icon'));
  if (iconB64) params.icon_b64 = iconB64;
  const bannerB64 = await getFileBase64(document.getElementById('ov-banner'));
  if (bannerB64) params.banner_b64 = bannerB64;
  const splashB64 = await getFileBase64(document.getElementById('ov-splash'));
  if (splashB64) params.splash_b64 = splashB64;
  socket.emit('run_command', { cmd: 'server_overview_save', params: params });
  pushNotification('Saved', '', 'success', 2000);
  setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; } }, 1000);
}

async function createRole() {
  const name = await customPrompt('Role name:');
  if (!name) return;
  socket.emit('run_command', { cmd: 'server_roles_create', params: { name, color:0, hoist:false, mentionable:false, guild_id:AppState.currentGuild } });
  setTimeout(() => socket.emit('get_guild_details', { guild_id:AppState.currentGuild }), 400);
}

function editRole(id) {
  const role = AppState.serverData.roles.find(r => r.id === id);
  if (!role) return;

  const content = '<div class="glass-card">' +
    '<h3>Edit Role</h3>' +
    '<input id="edit-role-name" value="'+esc(role.name)+'">' +
    '<input type="color" id="edit-role-color" value="#'+role.color.toString(16).padStart(6,'0')+'">' +
    '<div style="display:flex; gap:8px; margin-bottom:0.8rem;">' +
    '<button class="primary-btn" onclick="saveRole(\''+id+'\')">Save</button>' +
    '<button class="danger-btn" onclick="deleteRole(\''+id+'\')">Delete</button>' +
    '</div>' +
    '<h4>Permissions</h4>' +
    '<div class="perm-grid" id="perm-grid"></div>' +
    '<div style="margin-top:20px;">' +
    '<button class="secondary-btn" onclick="loadRoleMembers(\''+id+'\')">View Members</button>' +
    '<div id="role-members-list" style="margin-top:10px;"></div>' +
    '</div>' +
    '</div>';

  const backButton = '<button class="header-btn" onclick="navigate(\'roles\')">←</button>';

  DOM.mainContent.innerHTML = '<div style="display:flex; flex-direction:column; height:100%;">' +
    '<div class="page-top-bar">' +
    backButton +
    '<div class="page-title">Edit Role</div>' +
    '<button class="header-btn" onclick="refreshCurrentView()">↻</button>' +
    '</div>' +
    '<div class="page-scroll">'+content+'</div>' +
    '</div>';

  renderPermissionEditorRoles(role.permissions);
}

function loadRoleMembers(roleId) {
  socket.emit('run_command', { cmd: 'role_members_list', params: { role_id: roleId, guild_id: AppState.currentGuild } });
}

socket.on('role_members', function(data) {
  const container = document.getElementById('role-members-list');
  if (!container) return;
  if (!data.members || data.members.length === 0) {
    container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><p>No members have this role.</p></div>';
    return;
  }
  container.innerHTML = data.members.map(m => 
    '<div style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid var(--glass-border);">' +
    '<strong>'+esc(m.name)+'</strong> <span style="color:var(--text-muted);">('+esc(m.username)+')</span>' +
    '</div>'
  ).join('');
});

function renderPermissionEditorRoles(perms) {
  const grid = document.getElementById('perm-grid');
  if (!grid) return;
  let html = '';
  Object.keys(PERM_BITS).forEach(perm => {
    const bit = 1n << BigInt(PERM_BITS[perm]);
    const state = (BigInt(perms) & bit) === bit ? 'allow' : 'neutral';
    html += '<button class="perm-btn '+state+'" data-perm="'+perm+'" onclick="togglePerm(this)">'+esc(perm.replace(/_/g,' '))+'</button>';
  });
  grid.innerHTML = html;
}

function togglePerm(btn) { if (btn.classList.contains('allow')) { btn.classList.remove('allow'); btn.classList.add('deny'); } else if (btn.classList.contains('deny')) { btn.classList.remove('deny'); btn.classList.add('neutral'); } else { btn.classList.remove('neutral'); btn.classList.add('allow'); } }

function saveRole(id) {
  const name = document.getElementById('edit-role-name').value, color = parseInt(document.getElementById('edit-role-color').value.slice(1), 16);
  let perms = 0n;
  document.querySelectorAll('.perm-btn').forEach(btn => {
    if (btn.classList.contains('allow')) {
      const bit = PERM_BITS[btn.dataset.perm];
      if (bit !== undefined) perms |= (1n << BigInt(bit));
    }
  });
  socket.emit('run_command', { cmd:'server_roles_edit', params:{ id, name, color, permissions:perms.toString(), guild_id:AppState.currentGuild } });
  pushNotification('Role saved', '', 'success', 2000); setTimeout(() => socket.emit('get_guild_details', { guild_id:AppState.currentGuild }), 400);
}

function deleteRole(id) {
  customConfirm('Delete this role?').then(ok => {
    if (!ok) return;
    socket.emit('run_command', { cmd:'server_roles_delete', params:{ id, guild_id:AppState.currentGuild } });
    setTimeout(() => socket.emit('get_guild_details', { guild_id:AppState.currentGuild }), 400);
  });
}

function buildMembersContent() {
  return '<div style="margin-bottom:1rem;">' +
    '<input type="text" id="member-search" placeholder="Search members..." oninput="filterMembersList()" style="margin-bottom:0;">' +
    '</div>' +
    '<div id="member-list-container" style="max-height:calc(100vh - 200px); overflow-y:auto;"></div>';
}

let memberSearchTimeout = null;
function filterMembersList() {
  clearTimeout(memberSearchTimeout);
  memberSearchTimeout = setTimeout(() => {
    const query = document.getElementById('member-search').value.toLowerCase();
    renderMembersList(query);
  }, 200);
}

function renderMembersList(filter) {
  if (!AppState.serverData || !AppState.serverData.members) return;
  const container = document.getElementById('member-list-container');
  if (!container) return;
  const filtered = AppState.serverData.members.filter(m => {
    const name = (m.name || '').toLowerCase();
    const username = (m.username || '').toLowerCase();
    const search = (filter || '').toLowerCase();
    if (!search) return true;
    if (name.startsWith(search) || username.startsWith(search)) return true;
    return false;
  });
  container.innerHTML = filtered.length ? filtered.map(m => {
    const avatar = m.avatar_url ? '<img src="'+esc(m.avatar_url)+'" style="width:32px;height:32px;border-radius:50%;margin-right:8px;" loading="lazy">' : '';
    const statusColor = getStatusColor(m.status);
    const rolePills = (m.roles || []).map(roleId => {
      const role = AppState.serverData.roles?.find(r => r.id === roleId);
      if (!role || role.name === '@everyone') return '';
      const colorHex = '#' + (role.color || 0).toString(16).padStart(6, '0');
      return '<span style="background:'+colorHex+'; color:#fff; padding:1px 6px; border-radius:8px; font-size:0.65rem; margin-left:4px;">'+esc(role.name)+'</span>';
    }).join('');
    return '<div class="member-item" style="display:flex; align-items:center; justify-content:space-between; padding:8px; border-radius:var(--radius-sm); margin-bottom:4px; background:var(--glass-bg-light); border:1px solid var(--glass-border); cursor:pointer;" onclick="openMemberActions(\''+m.id+'\')">' +
      '<div style="display:flex; align-items:center;">'+avatar+
      '<div><div style="font-weight:600;">'+esc(m.name)+'</div><div style="font-size:0.7rem; color:var(--text-muted);">'+esc(m.username || '')+'</div></div></div>' +
      '<div style="display:flex; align-items:center; gap:4px;">' +
      '<span style="width:8px; height:8px; border-radius:50%; background:'+statusColor+';"></span>' +
      rolePills +
      '</div>' +
      '</div>';
  }).join('') : '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No members found.</p></div>';
}

function openMemberActions(userId) {
  const member = AppState.serverData.members.find(m => m.id === userId);
  if (!member) return;
  let html = '<div style="display:flex; align-items:center; margin-bottom:1rem;">' +
    (member.avatar_url ? '<img src="'+esc(member.avatar_url)+'" style="width:48px;height:48px;border-radius:50%;margin-right:12px;">' : '') +
    '<div><div style="font-weight:700;">'+esc(member.name)+'</div><div style="font-size:0.8rem; color:var(--primary);">'+esc(member.username || '')+'</div></div>' +
    '</div>';
  if (member.roles && member.roles.length > 0) {
    html += '<div style="margin-bottom:0.8rem;"><strong>Roles:</strong> ';
    member.roles.forEach(roleId => {
      const role = AppState.serverData.roles?.find(r => r.id === roleId);
      if (role && role.name !== '@everyone') {
        const colorHex = '#' + (role.color || 0).toString(16).padStart(6, '0');
        html += '<span style="background:'+colorHex+'; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.75rem; margin-right:4px;">'+esc(role.name)+'</span>';
      }
    });
    html += '</div>';
  }
  html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:0.8rem;">' +
    '<input type="number" id="timeout-duration" value="60" placeholder="Seconds" style="width:80px; margin-bottom:0;">' +
    '<button class="secondary-btn" onclick="executeMemberAction(\'timeout\', \''+userId+'\')">Timeout</button>' +
    '</div>' +
    '<div style="display:flex; gap:8px;">' +
    '<button class="secondary-btn" onclick="executeMemberAction(\'kick\', \''+userId+'\')">Kick</button>' +
    '<button class="danger-btn" onclick="executeMemberAction(\'ban\', \''+userId+'\')">Ban</button>' +
    '</div>';
  document.getElementById('member-actions-content').innerHTML = html;
  document.getElementById('modal-member-actions').style.display = 'flex';
}

function executeMemberAction(action, userId) {
  let cmd, params = { user_id: userId, guild_id: AppState.currentGuild };
  if (action === 'timeout') {
    cmd = 'member_timeout';
    const duration = document.getElementById('timeout-duration')?.value || 60;
    params.duration = parseInt(duration);
    customConfirm('Timeout this member for '+params.duration+' seconds?').then(ok => {
      if (!ok) return;
      socket.emit('run_command', { cmd, params });
      document.getElementById('modal-member-actions').style.display = 'none';
      pushNotification('Action executed', '', 'success', 2000);
    });
    return;
  } else if (action === 'kick') {
    cmd = 'member_kick';
    customConfirm('Kick this member?').then(ok => {
      if (!ok) return;
      socket.emit('run_command', { cmd, params });
      document.getElementById('modal-member-actions').style.display = 'none';
      pushNotification('Action executed', '', 'success', 2000);
    });
    return;
  } else if (action === 'ban') {
    cmd = 'member_ban';
    customConfirm('Ban this member?').then(ok => {
      if (!ok) return;
      socket.emit('run_command', { cmd, params });
      document.getElementById('modal-member-actions').style.display = 'none';
      pushNotification('Action executed', '', 'success', 2000);
    });
    return;
  }
}

let catEditorData = {};
function openCategorySettings(catId) {
  document.getElementById('edit-category-id').value = catId;
  socket.emit('run_command', { cmd: 'guild_structure', params: { guild_id: AppState.currentGuild } });
  socket.once('guild_structure', function(struct) {
    const cat = struct.categories.find(c => c.id === catId);
    if (!cat) return;
    document.getElementById('edit-category-name').value = cat.name;
    document.getElementById('edit-category-position').value = cat.position;
    document.getElementById('modal-category-settings').style.display = 'flex';
    switchCategoryTab('general');
  });
}

function deleteCategoryFromModal() {
  const catId = document.getElementById('edit-category-id').value;
  if (!catId) return;
  customConfirm('Delete this category and all its channels?').then(ok => {
    if (!ok) return;
    socket.emit('run_command', { cmd: 'category_delete', params: { category_id: catId, guild_id: AppState.currentGuild } });
    document.getElementById('modal-category-settings').style.display = 'none';
    setTimeout(loadChannelTree, 500);
  });
}

function saveCategorySettings() {
  const catId = document.getElementById('edit-category-id').value;
  const name = document.getElementById('edit-category-name').value.trim();
  const position = parseInt(document.getElementById('edit-category-position').value) || 0;
  socket.emit('run_command', { cmd: 'category_edit', params: { category_id: catId, name, position, guild_id: AppState.currentGuild } });
  document.getElementById('modal-category-settings').style.display = 'none';
  setTimeout(loadChannelTree, 500);
}

function switchCategoryTab(tab) {
  document.querySelectorAll('#modal-category-settings .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cat-tab-' + tab).classList.add('active');
  document.getElementById('category-tab-general').style.display = tab === 'general' ? 'block' : 'none';
  document.getElementById('category-tab-permissions').style.display = tab === 'permissions' ? 'block' : 'none';
  if (tab === 'permissions') loadCategoryPermissions();
}

function loadCategoryPermissions() {
  const catId = document.getElementById('edit-category-id').value;
  socket.emit('run_command', { cmd: 'category_permissions_get', params: { category_id: catId, guild_id: AppState.currentGuild } });
}

socket.on('category_permissions', function(data) {
  const list = document.getElementById('category-permissions-list');
  if (!list) return;
  let html = '';
  (data.overwrites || []).forEach(ow => {
    html += '<div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:8px; margin-bottom:4px;">' +
      '<span>'+esc(ow.name)+' <span style="color:var(--primary); font-size:0.7rem;">('+ow.type+')</span></span>' +
      '<div>' +
      '<button class="secondary-btn" onclick="openCategoryPermEditor(\''+data.category_id+'\',\''+ow.id+'\',\''+ow.type+'\',\''+esc(ow.name)+'\')" style="font-size:0.7rem;">Edit</button>' +
      '<button class="danger-btn" onclick="removeCategoryPermOverwrite(\''+data.category_id+'\',\''+ow.id+'\',\''+ow.type+'\')" style="font-size:0.7rem;">Remove</button>' +
      '</div>' +
      '</div>';
  });
  if (!data.overwrites || data.overwrites.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg><p>No custom permissions.</p></div>';
  list.innerHTML = html;
});

function addCategoryPermissionRole() {
  document.getElementById('perm-add-title').textContent = 'Add Role';
  socket.emit('run_command', { cmd: 'server_roles_list', params: { guild_id: AppState.currentGuild } });
  socket.once('server_roles_data', function(data) {
    const sel = document.getElementById('perm-add-select');
    sel.innerHTML = '';
    (data.roles || []).forEach(r => { if (r.name !== '@everyone') sel.innerHTML += '<option value="'+r.id+'">'+esc(r.name)+'</option>'; });
    document.getElementById('modal-permission-add').style.display = 'flex';
  });
}

function addCategoryPermissionMember() {
  document.getElementById('perm-add-title').textContent = 'Add Member';
  socket.emit('run_command', { cmd: 'server_members_list', params: { guild_id: AppState.currentGuild } });
  socket.once('server_members_list', function(data) {
    const sel = document.getElementById('perm-add-select');
    sel.innerHTML = '';
    (data.members || []).forEach(m => { sel.innerHTML += '<option value="'+m.id+'">'+esc(m.name)+' ('+esc(m.username)+')</option>'; });
    document.getElementById('modal-permission-add').style.display = 'flex';
  });
}

function addCategoryPermissionTarget() {
  const sel = document.getElementById('perm-add-select');
  const targetId = sel.value;
  const targetType = document.getElementById('perm-add-title').textContent === 'Add Role' ? 'role' : 'member';
  const catId = document.getElementById('edit-category-id').value;
  if (!targetId) return;
  socket.emit('run_command', { cmd: 'category_permissions_set', params: { category_id: catId, target_id: targetId, target_type: targetType, permission: 'view_channel', action: 'neutral', guild_id: AppState.currentGuild } });
  document.getElementById('modal-permission-add').style.display = 'none';
  setTimeout(loadCategoryPermissions, 400);
}

function removeCategoryPermOverwrite(catId, targetId, targetType) {
  socket.emit('run_command', { cmd: 'category_permissions_set', params: { category_id: catId, target_id: targetId, target_type: targetType, permission: 'view_channel', action: 'neutral', guild_id: AppState.currentGuild } });
  setTimeout(loadCategoryPermissions, 400);
}

function openCategoryPermEditor(catId, targetId, targetType, targetName) {
  document.getElementById('perm-editor-title').textContent = 'Permissions for ' + targetName;
  socket.emit('run_command', { cmd: 'category_permissions_get', params: { category_id: catId, guild_id: AppState.currentGuild } });
  socket.once('category_permissions', function(data) {
    const ow = (data.overwrites || []).find(o => o.id === targetId);
    const allowed = ow ? ow.allowed : [];
    const denied = ow ? ow.denied : [];
    let html = '';
    Object.keys(PERM_BITS).forEach(perm => {
      let state = 'neutral';
      if (allowed.includes(perm)) state = 'allow';
      if (denied.includes(perm)) state = 'deny';
      let bg, color;
      if (state === 'allow') { bg = '#2ecc71'; color = '#fff'; }
      else if (state === 'deny') { bg = '#ff5e57'; color = '#fff'; }
      else { bg = 'rgba(255,255,255,0.1)'; color = 'var(--text)'; }
      html += '<button style="font-size:0.7rem; padding:6px 10px; margin:2px; background:'+bg+'; color:'+color+'; border:none; border-radius:4px; cursor:pointer;" onclick="cycleCategoryPerm(\''+perm+'\',\''+state+'\')">'+perm.replace(/_/g,' ')+'</button>';
    });
    document.getElementById('perm-editor-list').innerHTML = html;
    document.getElementById('modal-permission-editor').style.display = 'flex';
    catEditorData = { catId, targetId, targetType };
  });
}

function cycleCategoryPerm(perm, currentState) {
  let action;
  if (currentState === 'neutral') action = 'allow';
  else if (currentState === 'allow') action = 'deny';
  else action = 'neutral';
  socket.emit('run_command', { cmd: 'category_permissions_set', params: { category_id: catEditorData.catId, target_id: catEditorData.targetId, target_type: catEditorData.targetType, permission: perm, action, guild_id: AppState.currentGuild } });
  setTimeout(() => openCategoryPermEditor(catEditorData.catId, catEditorData.targetId, catEditorData.targetType, document.getElementById('perm-editor-title').textContent.replace('Permissions for ', '')), 300);
}

function buildBansContent() {
  socket.emit('run_command', { cmd: 'server_bans_list', params: { guild_id: AppState.currentGuild } });
  return '<div id="ban-list-container" style="max-height:calc(100vh - 200px); overflow-y:auto;">' +
    '<div class="inline-loader"><div class="ethereum-container"><svg xmlns="http://w3.org" viewBox="-80 -80 416 577" width="100%" height="100%"><defs><filter id="magnetic-glow-inline" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="container-cluster"><g class="part-top-left"><path fill="#8a92ff" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="#3438cc" d="M0 212.32l127.96 75.638v-133.8z"/></g><g class="part-top-right"><path fill="#454af8" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="#1a1c72" d="M127.961 287.958l127.96-75.637-127.96-58.162z"/></g><g class="part-bottom-v"><path fill="#8a92ff" d="M127.962 416.905v-104.72L0 236.585z"/><path fill="#3a3edf" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/></g></g></svg></div></div></div>';
}

socket.on('server_bans', function(data) {
  const container = document.getElementById('ban-list-container');
  if (!container) return;
  const bans = data.bans || [];
  let html = '';
  if (bans.length === 0) {
    html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg><p>No banned users</p></div>';
  } else {
    bans.forEach(ban => {
      html += '<div style="display:flex; align-items:center; justify-content:space-between; padding:8px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px;">' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
        '<img src="'+esc(ban.avatar_url || '')+'" style="width:32px;height:32px;border-radius:50%;" onerror="this.style.display=\'none\'" loading="lazy">' +
        '<div><strong>'+esc(ban.user_name)+'</strong><br><small>'+esc(ban.reason || 'No reason')+'</small></div>' +
        '</div>' +
        '<button class="secondary-btn" onclick="unbanUser(\''+ban.user_id+'\')">Unban</button>' +
        '</div>';
    });
  }
  container.innerHTML = html;
});

function unbanUser(userId) {
  customConfirm('Unban this user?').then(confirmed => {
    if (!confirmed) return;
    socket.emit('run_command', { cmd: 'member_unban', params: { user_id: userId, guild_id: AppState.currentGuild } });
    setTimeout(() => socket.emit('run_command', { cmd: 'server_bans_list', params: { guild_id: AppState.currentGuild } }), 500);
  });
}

function buildAuditLogContent() {
  socket.emit('run_command', { cmd: 'server_audit_log', params: { guild_id: AppState.currentGuild } });
  return '<div id="audit-log-container" style="max-height:calc(100vh - 200px); overflow-y:auto;">' +
    '<div class="inline-loader"><div class="ethereum-container"><svg xmlns="http://w3.org" viewBox="-80 -80 416 577" width="100%" height="100%"><defs><filter id="magnetic-glow-inline" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="container-cluster"><g class="part-top-left"><path fill="#8a92ff" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="#3438cc" d="M0 212.32l127.96 75.638v-133.8z"/></g><g class="part-top-right"><path fill="#454af8" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="#1a1c72" d="M127.961 287.958l127.96-75.637-127.96-58.162z"/></g><g class="part-bottom-v"><path fill="#8a92ff" d="M127.962 416.905v-104.72L0 236.585z"/><path fill="#3a3edf" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/></g></g></svg></div></div></div>';
}

socket.on('server_audit_log', function(data) {
  const container = document.getElementById('audit-log-container');
  if (!container) return;
  const entries = data.entries || [];
  let html = '';
  if (entries.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg><p>No audit entries found.</p></div>';
  else {
    entries.forEach(entry => {
      html += '<div style="padding:8px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px;">' +
        '<div style="display:flex; justify-content:space-between;">' +
        '<strong>'+esc(entry.action)+'</strong>' +
        '<span style="font-size:0.75rem; color:var(--primary);">'+esc(entry.created_at)+'</span>' +
        '</div>' +
        '<div>By: '+esc(entry.user)+'</div>' +
        '<div>Target: '+esc(entry.target)+'</div>' +
        (entry.reason ? '<div>Reason: '+esc(entry.reason)+'</div>' : '') +
        '</div>';
    });
  }
  container.innerHTML = html;
});

function buildExpressionsContent() {
  socket.emit('run_command', { cmd: 'server_expression_list', params: { guild_id: AppState.currentGuild } });
  socket.emit('run_command', { cmd: 'server_sticker_list', params: { guild_id: AppState.currentGuild } });
  return '<div style="display:flex; gap:8px; margin-bottom:1rem;">' +
    '<button class="primary-btn" onclick="showAddEmojiModal()">Add Emoji</button>' +
    '<button class="secondary-btn" onclick="showAddStickerModal()">Add Sticker</button>' +
    '</div>' +
    '<div class="glass-card" style="margin-bottom:1rem;">' +
    '<h3>Emojis</h3>' +
    '<div id="expressions-grid" style="display:flex; flex-wrap:wrap; gap:8px;"></div>' +
    '</div>' +
    '<div class="glass-card">' +
    '<h3>Stickers</h3>' +
    '<div id="stickers-grid" style="display:flex; flex-wrap:wrap; gap:8px;"></div>' +
    '</div>';
}

socket.on('server_sticker_data', function(data) {
  const grid = document.getElementById('stickers-grid');
  if (!grid) return;
  const stickers = data.stickers || [];
  if (stickers.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="width:100%;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>No stickers.</p></div>';
    return;
  }
  grid.innerHTML = stickers.map(s => '<div class="expression-chip" onclick="showStickerActions(\''+s.id+'\',\''+esc(s.name)+'\')" style="display:flex; align-items:center; gap:4px; padding:6px; background:var(--glass-bg-light); border-radius:var(--radius-sm); cursor:pointer;">' +
    '<img src="'+esc(s.url)+'" style="width:48px;height:48px;object-fit:contain;" loading="lazy">' +
    '<span style="font-size:0.8rem;">'+esc(s.name)+'</span>' +
    '</div>').join('');
});

function showStickerActions(id, name) {
  const popup = document.getElementById('msg-popup');
  popup.innerHTML = '<div class="msg-popup-item" onclick="deleteSticker(\''+id+'\'); hidePopup();">Delete</div>';
  popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)'; popup.style.display = 'block';
  setTimeout(() => document.addEventListener('click', hidePopup, { once: true }), 50);
}

function deleteSticker(id) {
  customConfirm('Delete this sticker?').then(confirmed => {
    if (!confirmed) return;
    socket.emit('run_command', { cmd: 'sticker_delete', params: { sticker_id: id, guild_id: AppState.currentGuild } });
    setTimeout(() => socket.emit('run_command', { cmd: 'server_sticker_list', params: { guild_id: AppState.currentGuild } }), 500);
  });
}

socket.on('server_expression_data', function(data) {
  const grid = document.getElementById('expressions-grid');
  if (!grid) return;
  let html = '';
  const emojis = data.emojis || [];
  if (emojis.length === 0) html += '<div class="empty-state" style="width:100%;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg><p>No emojis.</p></div>';
  else {
    emojis.forEach(emoji => {
      html += '<div class="expression-chip" onclick="showExpressionActions(\''+emoji.id+'\',\''+esc(emoji.name)+'\')" style="display:flex; align-items:center; gap:4px; padding:6px; background:var(--glass-bg-light); border-radius:var(--radius-sm); cursor:pointer;">' +
        '<img src="'+esc(emoji.url)+'" style="width:24px;height:24px;" loading="lazy">' +
        '<span style="font-size:0.8rem;">:'+esc(emoji.name)+':</span>' +
        '</div>';
    });
  }
  grid.innerHTML = html;
});

async function showAddEmojiModal() {
  const name = await customPrompt('Emoji name:');
  if (!name) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;
    const base64 = await getFileBase64({ files: [file] });
    if (base64) {
      socket.emit('run_command', { cmd: 'emoji_upload', params: { name, image: base64, guild_id: AppState.currentGuild } });
      setTimeout(() => socket.emit('run_command', { cmd: 'server_expression_list', params: { guild_id: AppState.currentGuild } }), 1000);
    }
  };
  input.click();
}

async function showAddStickerModal() {
  const name = await customPrompt('Sticker name:');
  if (!name) return;
  const description = await customPrompt('Description (optional):', '');
  const emoji = (await customPrompt('Related emoji (default 😀):', '😀')) || '😀';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg, image/gif';
  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;
    const base64 = await getFileBase64({ files: [file] });
    if (base64) {
      socket.emit('run_command', { cmd: 'sticker_upload', params: { name, description, emoji, image: base64, guild_id: AppState.currentGuild } });
      setTimeout(() => socket.emit('run_command', { cmd: 'server_sticker_list', params: { guild_id: AppState.currentGuild } }), 1000);
    }
  };
  input.click();
}

function showExpressionActions(id, name) {
  const popup = document.getElementById('msg-popup');
  popup.innerHTML = '<div class="msg-popup-item" onclick="editExpression(\''+id+'\',\''+esc(name)+'\')">Edit</div>' +
    '<div class="msg-popup-item" onclick="deleteExpression(\''+id+'\'); hidePopup();">Delete</div>';
  popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)'; popup.style.display = 'block';
  setTimeout(() => document.addEventListener('click', hidePopup, { once: true }), 50);
}

function deleteExpression(id) {
  customConfirm('Delete this emoji?').then(confirmed => {
    if (!confirmed) return;
    socket.emit('run_command', { cmd: 'emoji_delete', params: { emoji_id: id, guild_id: AppState.currentGuild } });
    setTimeout(() => socket.emit('run_command', { cmd: 'server_expression_list', params: { guild_id: AppState.currentGuild } }), 500);
  });
}

function editExpression(id, name) {
  customPrompt('New name:', name).then(newName => {
    if (!newName) return;
    pushNotification('Rename not supported by Discord API', '', 'info', 2000);
  });
}

function buildInvitesContent() {
  socket.emit('run_command', { cmd: 'server_invites_list', params: { guild_id: AppState.currentGuild } });
  return '<div style="margin-bottom:1rem;"><button class="primary-btn" onclick="showCreateInviteModal()">Generate Invite</button></div>' +
    '<div id="invites-list-container" style="max-height:calc(100vh - 200px); overflow-y:auto;"></div>';
}

socket.on('server_invites', function(data) {
  const container = document.getElementById('invites-list-container');
  if (!container) return;
  const invites = data.invites || [];
  let html = '';
  if (invites.length === 0) html = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg><p>No active invites.</p></div>';
  else {
    invites.forEach(inv => {
      html += '<div style="display:flex; align-items:center; justify-content:space-between; padding:8px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px;" onclick="showInviteActions(\''+inv.code+'\',\''+esc(inv.url)+'\')">' +
        '<div>' +
        '<div><strong>'+esc(inv.url)+'</strong></div>' +
        '<div style="font-size:0.75rem;">Created by '+esc(inv.inviter)+' in #'+esc(inv.channel)+' | Uses: '+inv.uses+'/'+(inv.max_uses || '∞')+'</div>' +
        '</div>' +
        '<button class="secondary-btn" onclick="event.stopPropagation(); copyToClipboard(\''+inv.url+'\')">Copy</button>' +
        '</div>';
    });
  }
  container.innerHTML = html;
});

function showInviteActions(code, url) {
  const popup = document.getElementById('msg-popup');
  popup.innerHTML = '<div class="msg-popup-item" onclick="copyToClipboard(\''+esc(url)+'\'); hidePopup();">Copy</div>' +
    '<div class="msg-popup-item" onclick="revokeInvite(\''+code+'\'); hidePopup();">Revoke</div>';
  popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)'; popup.style.display = 'block';
  setTimeout(() => document.addEventListener('click', hidePopup, { once: true }), 50);
}

function showCreateInviteModal() {
  const channel = AppState.serverData.channels.find(c => c.type === 'text');
  if (!channel) { pushNotification('No text channel found', '', 'warning', 2000); return; }
  socket.emit('run_command', { cmd: 'invite_create', params: { channel_id: channel.id, guild_id: AppState.currentGuild, max_uses: 0, max_age: 0, temporary: false } });
  setTimeout(() => socket.emit('run_command', { cmd: 'server_invites_list', params: { guild_id: AppState.currentGuild } }), 1000);
}