function buildStatusPresence() {
  return '<div class="glass-card">' +
    '<h3>Online Presence</h3>' +
    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
    '<button class="primary-btn" onclick="setPresence(\'online\')" style="background:var(--success);">Online</button>' +
    '<button class="primary-btn" onclick="setPresence(\'idle\')" style="background:var(--warning); color:#000;">Idle</button>' +
    '<button class="primary-btn" onclick="setPresence(\'dnd\')" style="background:var(--danger);">Do Not Disturb</button>' +
    '<button class="secondary-btn" onclick="setPresence(\'invisible\')">Invisible</button>' +
    '</div>' +
    '</div>';
}

function setPresence(status) {
  pushNotification('Requesting '+status+'...', '', 'info', 2000);
  socket.emit('run_command', { cmd: 'status_set_presence', params: { status } });
}

function buildStatusRotation() {
  socket.emit('run_command', { cmd: 'status_list_texts', params: {} });
  return '<div class="glass-card">' +
    '<h3>Custom Status Rotation</h3>' +
    '<div style="display:flex; gap:8px; margin-bottom:1rem;">' +
    '<input id="new-status-text" placeholder="New status text...">' +
    '<button class="primary-btn" onclick="addStatusText()">Add</button>' +
    '</div>' +
    '<div id="status-texts-list">Loading...</div>' +
    '<div style="margin-top:1rem; display:flex; align-items:center; gap:8px;">' +
    '<label>Rotation Interval (seconds):</label>' +
    '<input type="number" id="status-interval" value="10" min="5" style="width:80px;">' +
    '<button class="secondary-btn" onclick="setStatusInterval()">Set</button>' +
    '</div>' +
    '</div>';
}

function addStatusText() {
  const input = document.getElementById('new-status-text');
  const text = input.value.trim();
  if (!text) return pushNotification('Text cannot be empty', '', 'warning', 2000);
  socket.emit('run_command', { cmd: 'status_add_text', params: { text } });
  input.value = '';
}

function removeStatusText(index) {
  socket.emit('run_command', { cmd: 'status_remove_text', params: { index } });
}

function setStatusInterval() {
  const interval = parseInt(document.getElementById('status-interval').value) || 10;
  socket.emit('run_command', { cmd: 'status_set_interval', params: { interval } });
}

socket.on('status_texts', function(data) {
  const list = document.getElementById('status-texts-list');
  if (!list) return;
  const intervalInput = document.getElementById('status-interval');
  if (intervalInput) intervalInput.value = data.interval || 10;
  if (data.texts && data.texts.length > 0) {
    list.innerHTML = data.texts.map(function(t, i) {
      return '<div style="display:flex; justify-content:space-between; padding:8px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px;">' +
        '<span>'+esc(t)+'</span>' +
        '<button class="secondary-btn" onclick="removeStatusText('+i+')">Remove</button>' +
        '</div>';
    }).join('');
  } else {
    list.innerHTML = '<div style="color:var(--text-muted);">No status texts added.</div>';
  }
});

const PLACEHOLDERS = [
  { key: '{server}',       label: 'Current server name' },
  { key: '{server_count}', label: 'Number of servers' },
  { key: '{users}',        label: 'Total users across all servers' },
  { key: '{members}',      label: 'Members in current server' },
  { key: '{channels}',     label: 'Channels in current server' },
  { key: '{online}',       label: 'Online members in current server' },
  { key: '{bot_name}',     label: 'Bot username' }
];

function resolvePlaceholder(key) {
  if (!AppState.serverData) return '?';
  switch (key) {
    case '{server}':       return AppState.serverData.name || 'Unknown Server';
    case '{server_count}': return (AppState.cachedGuilds || []).length;
    case '{users}':        return AppState.cachedGuilds.reduce((sum, g) => sum + (g.member_count || 0), 0);
    case '{members}':      return AppState.serverData.member_count || 0;
    case '{channels}':     return (AppState.serverData.channels || []).length;
    case '{online}':       return (AppState.serverData.members || []).filter(m => m.status === 'online').length;
    case '{bot_name}':     return AppState.botInfo ? AppState.botInfo.name : 'Bot';
    default:               return key;
  }
}

function resolveText(str) {
  return str.replace(/\{(\w+)\}/g, (match) => resolvePlaceholder(match));
}

function updateRichPresencePreview() {
  const type = document.getElementById('rpc-type')?.value || 'playing';
  const name = document.getElementById('rpc-name')?.value || 'Game';
  const state = document.getElementById('rpc-state')?.value || '';
  const details = document.getElementById('rpc-details')?.value || '';
  const largeImg = document.getElementById('rpc-large-img')?.value || '';
  const largeTooltip = document.getElementById('rpc-large-tooltip')?.value || '';
  const smallImg = document.getElementById('rpc-small-img')?.value || '';
  const smallTooltip = document.getElementById('rpc-small-tooltip')?.value || '';
  const startTime = document.getElementById('rpc-start')?.value || '';
  const endTime = document.getElementById('rpc-end')?.value || '';
  const partySize = document.getElementById('rpc-party-size')?.value || '';
  const preview = document.getElementById('rpc-preview');
  if (!preview) return;
  let html = '<div style="font-weight:600;font-size:0.85rem;color:#fff;">'+resolveText(name)+'</div>';
  if (state || details) {
    html += '<div style="font-size:0.8rem;color:#ccc;">' + [resolveText(state), resolveText(details)].filter(Boolean).join(' • ') + '</div>';
  }
  if (largeImg) {
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;">' +
      '<img src="https://cdn.discordapp.com/app-assets/'+(AppState.botInfo?.id||'0')+'/'+largeImg+'.png" style="width:40px;height:40px;border-radius:6px;background:var(--glass-bg-light);" onerror="this.style.display=\'none\'">' +
      '<div><span style="font-size:0.75rem;color:#ccc;">'+resolveText(largeTooltip||name)+'</span></div></div>';
  }
  if (smallImg) {
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">' +
      '<img src="https://cdn.discordapp.com/app-assets/'+(AppState.botInfo?.id||'0')+'/'+smallImg+'.png" style="width:20px;height:20px;border-radius:4px;background:var(--glass-bg-light);" onerror="this.style.display=\'none\'">' +
      '<span style="font-size:0.7rem;color:#ccc;">'+resolveText(smallTooltip)+'</span></div>';
  }
  if (partySize) {
    const [cur, max] = partySize.split(',').map(s => s.trim());
    html += '<div style="font-size:0.7rem;color:#aaa;margin-top:4px;">Party: '+(cur||'0')+'/'+(max||'?')+'</div>';
  }
  if (startTime || endTime) {
    const elapsed = startTime ? Math.floor((Date.now() - (parseInt(startTime)*1000)) / 1000) : 0;
    const remaining = endTime ? Math.floor(((parseInt(endTime)*1000) - Date.now()) / 1000) : 0;
    let timeStr = '';
    if (startTime) timeStr += elapsed > 0 ? elapsed+'s elapsed' : '';
    if (endTime) timeStr += (timeStr?' • ':'') + (remaining > 0 ? remaining+'s left' : '');
    html += '<div style="font-size:0.7rem;color:#aaa;margin-top:4px;">'+timeStr+'</div>';
  }
  preview.innerHTML = html;
}

function buildRichPresenceEditor() {
  return '<div class="glass-card">' +
    '<h3>Rich Presence Editor</h3>' +
    '<div style="display:flex; gap:24px; flex-wrap:wrap;">' +
    '<div style="flex:1; min-width:280px;" id="rpc-form" oninput="saveFormDraft(\'rpcDraft\',\'rpc-form\')">' +
    '<div class="form-group"><label>Activity Type</label><select id="rpc-type"><option value="playing">Playing</option><option value="listening">Listening</option><option value="watching">Watching</option><option value="streaming">Streaming</option><option value="competing">Competing</option></select></div>' +
    '<div class="form-group"><label>Name</label><div style="display:flex; gap:4px;"><input id="rpc-name" placeholder="e.g. Minecraft"><button class="secondary-btn" onclick="showPlaceholderPicker(\'rpc-name\')" style="font-size:0.7rem; padding:6px 8px;">{ }</button></div></div>' +
    '<div class="form-group"><label>State</label><div style="display:flex; gap:4px;"><input id="rpc-state" placeholder="e.g. In a lobby"><button class="secondary-btn" onclick="showPlaceholderPicker(\'rpc-state\')" style="font-size:0.7rem; padding:6px 8px;">{ }</button></div></div>' +
    '<div class="form-group"><label>Details</label><div style="display:flex; gap:4px;"><input id="rpc-details" placeholder="e.g. Playing with friends"><button class="secondary-btn" onclick="showPlaceholderPicker(\'rpc-details\')" style="font-size:0.7rem; padding:6px 8px;">{ }</button></div></div>' +
    '<div class="form-group"><label>Large Image Key</label><input id="rpc-large-img" placeholder="e.g. logo"></div>' +
    '<div class="form-group"><label>Large Image Tooltip</label><input id="rpc-large-tooltip" placeholder="e.g. Playing since 2023"></div>' +
    '<div class="form-group"><label>Small Image Key</label><input id="rpc-small-img" placeholder="e.g. rank_gold"></div>' +
    '<div class="form-group"><label>Small Image Tooltip</label><input id="rpc-small-tooltip" placeholder="e.g. Gold Rank"></div>' +
    '<div class="form-group"><label>Start Timestamp (unix seconds)</label><input id="rpc-start" placeholder="e.g. 1690000000"></div>' +
    '<div class="form-group"><label>End Timestamp (unix seconds)</label><input id="rpc-end" placeholder="e.g. 1690003600"></div>' +
    '<div class="form-group"><label>Party Size (current, max)</label><input id="rpc-party-size" placeholder="e.g. 3, 5"></div>' +
    '<button class="primary-btn" onclick="setRichPresence()">Set Rich Presence</button>' +
    '</div>' +
    '<div style="width:280px; background:var(--glass-bg); backdrop-filter:blur(var(--blur)); border:1px solid var(--glass-border); border-radius:var(--radius); padding:16px; box-shadow:var(--shadow);">' +
    '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Live Preview</div>' +
    '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">' +
    '<img src="'+(AppState.botInfo?.avatar_url || '/arklum.png')+'" style="width:36px;height:36px;border-radius:50%;">' +
    '<span style="font-weight:600;">'+(AppState.botInfo?.name || 'Bot')+'</span>' +
    '</div>' +
    '<div id="rpc-preview" style="font-size:0.8rem; color:#fff;"></div>' +
    '</div>' +
    '</div>' +
    '</div>';
}

function showPlaceholderPicker(inputId) {
  const popup = document.getElementById('msg-popup');
  let items = PLACEHOLDERS.map(p => 
    '<div class="msg-popup-item" onclick="insertPlaceholder(\''+inputId+'\',\''+p.key+'\'); hidePopup()">'+
    p.key+' <span style="color:var(--text-muted);">('+resolvePlaceholder(p.key)+')</span></div>'
  ).join('');
  popup.innerHTML = items;
  popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)'; popup.style.display = 'block';
  setTimeout(() => document.addEventListener('click', hidePopup, { once: true }), 50);
}

function insertPlaceholder(inputId, key) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = (input.value || '') + key;
  updateRichPresencePreview();
}

function setRichPresence() {
  const payload = {
    type: document.getElementById('rpc-type')?.value || 'playing',
    name: document.getElementById('rpc-name')?.value || '',
    state: document.getElementById('rpc-state')?.value || '',
    details: document.getElementById('rpc-details')?.value || '',
    large_image: document.getElementById('rpc-large-img')?.value || '',
    large_text: document.getElementById('rpc-large-tooltip')?.value || '',
    small_image: document.getElementById('rpc-small-img')?.value || '',
    small_text: document.getElementById('rpc-small-tooltip')?.value || '',
    start: document.getElementById('rpc-start')?.value || '',
    end: document.getElementById('rpc-end')?.value || '',
    party_size: document.getElementById('rpc-party-size')?.value || ''
  };
  if (!payload.name) { pushNotification('Name is required', '', 'warning', 2000); return; }
  socket.emit('run_command', { cmd: 'status_set_rich_presence', params: payload });
  pushNotification('Rich presence set', '', 'success', 2000);
}
function saveFormDraft(key, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const data = {};
  container.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'file') return;
    if (el.type === 'checkbox' || el.type === 'radio') data[el.id] = el.checked;
    else data[el.id] = el.value;
  });
  container.querySelectorAll('.toggle-switch').forEach(el => {
    data[el.id] = el.classList.contains('active');
  });
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFormDraft(key, containerId) {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = data[id];
      else if (el.classList.contains('toggle-switch')) {
        if (data[id]) el.classList.add('active'); else el.classList.remove('active');
      }
      else el.value = data[id] || '';
    });
    return true;
  } catch(e) {
    return false;
  }
}