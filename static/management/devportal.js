function buildDevAppSettings() {
  socket.emit('run_command', { cmd: 'developer_portal_info', params: {} });
  setTimeout(() => {
    const loader = document.getElementById('devportal-loading');
    if (loader && loader.style.display !== 'none') {
      loader.innerHTML = '<div style="color:var(--primary);">Failed to load. Please try refreshing.</div>';
    }
  }, 10000);
  return '<div id="devportal-loading" class="spinner-inline"></div>' +
    '<div id="devportal-content" style="display:none;">' +
    '<div class="glass-card">' +
    '<h3>General Information</h3>' +
    '<div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">' +
    '<img id="dev-icon-preview" style="max-width:64px; border-radius:50%; display:none;">' +
    '<input type="file" id="dev-icon" accept="image/*" onchange="previewFile(this, \'dev-icon-preview\')">' +
    '</div>' +
    '<div class="form-group"><label>Name</label><input id="dev-name"></div>' +
    '<div class="form-group"><label>Description</label><textarea id="dev-description" rows="2"></textarea></div>' +
    '<div class="form-group"><label>Application ID</label><input id="dev-client-id" readonly></div>' +
    '<div class="form-group"><label>Public Key</label><input id="dev-public-key" readonly></div>' +
    '<button class="primary-btn" id="dev-save-btn" onclick="saveDevApp()">Save Changes</button>' +
    '</div>' +
    '<div class="glass-card">' +
    '<h3>Security & Legal</h3>' +
    '<div class="form-group"><label>Interactions Endpoint URL</label><input id="dev-interactions-url"></div>' +
    '<div class="form-group"><label>Linked Roles Verification URL</label><input id="dev-linked-roles-url"></div>' +
    '<div class="form-group"><label>Terms of Service URL</label><input id="dev-tos-url"></div>' +
    '<div class="form-group"><label>Privacy Policy URL</label><input id="dev-privacy-url"></div>' +
    '</div>' +
    '<div class="glass-card">' +
    '<h3>Bot Settings</h3>' +
    '<div class="toggle-row" style="display:flex; align-items:center; gap:8px; margin-bottom:0.8rem;">' +
    '<span>Public Bot</span><div class="toggle-switch" id="dev-public" onclick="this.classList.toggle(\'active\')"></div>' +
    '</div>' +
    '<div class="toggle-row" style="display:flex; align-items:center; gap:8px; margin-bottom:0.8rem;">' +
    '<span>Requires OAuth2 Code Grant</span><div class="toggle-switch" id="dev-require-code" onclick="this.classList.toggle(\'active\')"></div>' +
    '</div>' +
    '</div>' +
    '</div>';
}

socket.on('developer_portal_data', function(data) {
  const loading = document.getElementById('devportal-loading');
  const content = document.getElementById('devportal-content');
  if (!loading || !content) return;
  loading.style.display = 'none';
  content.style.display = 'block';
  document.getElementById('dev-name').value = data.name || '';
  document.getElementById('dev-description').value = data.description || '';
  document.getElementById('dev-client-id').value = data.id || '';
  document.getElementById('dev-public-key').value = data.public_key || '';
  document.getElementById('dev-interactions-url').value = data.interactions_endpoint_url || '';
  document.getElementById('dev-linked-roles-url').value = data.linked_roles_verification_url || '';
  document.getElementById('dev-tos-url').value = data.terms_of_service_url || '';
  document.getElementById('dev-privacy-url').value = data.privacy_policy_url || '';
  if (data.icon_url) {
    document.getElementById('dev-icon-preview').src = data.icon_url;
    document.getElementById('dev-icon-preview').style.display = 'block';
  }
  document.getElementById('dev-public').classList.toggle('active', data.bot_public);
  document.getElementById('dev-require-code').classList.toggle('active', data.bot_require_code_grant);
});

async function saveDevApp() {
  const btn = document.getElementById('dev-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const params = {
    name: document.getElementById('dev-name').value.trim(),
    description: document.getElementById('dev-description').value.trim(),
    interactions_endpoint_url: document.getElementById('dev-interactions-url').value.trim(),
    linked_roles_verification_url: document.getElementById('dev-linked-roles-url').value.trim(),
    terms_of_service_url: document.getElementById('dev-tos-url').value.trim(),
    privacy_policy_url: document.getElementById('dev-privacy-url').value.trim(),
    bot_public: document.getElementById('dev-public').classList.contains('active'),
    bot_require_code_grant: document.getElementById('dev-require-code').classList.contains('active')
  };
  const iconInput = document.getElementById('dev-icon');
  if (iconInput.files.length > 0) {
    const iconB64 = await getFileBase64(iconInput);
    if (iconB64) params.icon_b64 = iconB64;
  }
  socket.emit('run_command', { cmd: 'developer_portal_save', params: params });
  pushNotification('Saved', '', 'success', 2000);
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Save Changes'; }, 1000);
}

let installData = {};
function buildDevInstallation() {
  socket.emit('run_command', { cmd: 'developer_portal_install_info', params: {} });
  return '<div id="install-loading" class="spinner-inline"></div>' +
    '<div id="install-content" style="display:none;">' +
    '<div class="glass-card">' +
    '<h3>Invite Generator</h3>' +
    '<div id="perm-calc" class="perm-grid"></div>' +
    '<div style="display:flex; gap:8px; margin-top:1rem;">' +
    '<input id="invite-url" readonly style="flex:1;">' +
    '<button class="secondary-btn" onclick="copyInviteUrl()">Copy</button>' +
    '</div>' +
    '</div>' +
    '</div>';
}

socket.on('developer_portal_install_data', function(data) {
  const loading = document.getElementById('install-loading');
  const content = document.getElementById('install-content');
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
  installData = data;
  renderPermGrid();
  updateInviteUrl();
});

const INVITE_PERMS = [
  {name:"Administrator", bit:3},{name:"Manage Server", bit:5},{name:"Manage Roles", bit:28},
  {name:"Manage Channels", bit:16},{name:"Kick Members", bit:1},{name:"Ban Members", bit:2},
  {name:"Create Invite", bit:0},{name:"Manage Webhooks", bit:29},{name:"Read Messages", bit:10},
  {name:"Send Messages", bit:11},{name:"Manage Messages", bit:13},{name:"Embed Links", bit:14},
  {name:"Attach Files", bit:15},{name:"Read Message History", bit:17},{name:"Mention Everyone", bit:18},
  {name:"Use External Emojis", bit:19},{name:"Connect", bit:20},{name:"Speak", bit:21},
  {name:"Mute Members", bit:22},{name:"Deafen Members", bit:23},{name:"Move Members", bit:24},
  {name:"Use Voice Activity", bit:25},{name:"Priority Speaker", bit:32},{name:"Stream", bit:33}
];
let invitePerms = 0n;
function renderPermGrid() {
  const grid = document.getElementById('perm-calc');
  if (!grid) return;
  grid.innerHTML = INVITE_PERMS.map(p => '<button class="perm-btn neutral" data-bit="'+p.bit+'" onclick="toggleInvitePerm(this)">'+p.name+'</button>').join('');
}
function toggleInvitePerm(btn) {
  btn.classList.toggle('allow'); btn.classList.toggle('neutral');
  const bit = BigInt(btn.dataset.bit);
  if (btn.classList.contains('allow')) invitePerms |= (1n << bit);
  else invitePerms &= ~(1n << bit);
  updateInviteUrl();
}
function updateInviteUrl() {
  const url = installData.invite_url_base + '&permissions=' + invitePerms.toString();
  const inp = document.getElementById('invite-url');
  if (inp) inp.value = url;
}
function copyInviteUrl() { copyToClipboard(document.getElementById('invite-url').value); }

function buildDevBotToken() {
  socket.emit('run_command', { cmd: 'developer_portal_token_info', params: {} });
  return '<div class="glass-card">' +
    '<h3>Bot Token</h3>' +
    '<input id="token-masked" readonly>' +
    '<div style="display:flex; gap:8px; margin-top:8px;">' +
    '<button class="secondary-btn" onclick="copyFullToken()">Copy Token</button>' +
    '<button class="danger-btn" onclick="resetToken()">Regenerate</button>' +
    '</div>' +
    '</div>';
}
socket.on('developer_portal_token_data', function(data) {
  document.getElementById('token-masked').value = data.masked;
  window._fullToken = data.full;
});
function copyFullToken() { if (window._fullToken) copyToClipboard(window._fullToken); }
function resetToken() {
  customConfirm('This will invalidate the current token. Continue?').then(ok => {
    if (ok) socket.emit('run_command', { cmd: 'developer_portal_reset_token', params: {} });
  });
}

function buildDevEmojis() {
  socket.emit('run_command', { cmd: 'developer_app_emojis_list', params: {} });
  return '<div style="margin-bottom:1rem;"><button class="primary-btn" onclick="uploadAppEmoji()">Add App Emoji</button></div>' +
    '<div id="app-emojis-grid"></div>';
}
socket.on('developer_app_emojis', function(data) {
  const grid = document.getElementById('app-emojis-grid');
  if (!grid) return;
  grid.innerHTML = data.emojis.map(e => '<div class="expression-chip" style="display:flex; align-items:center; gap:4px; padding:6px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px; cursor:pointer;" onclick="deleteAppEmoji(\''+e.id+'\')">' +
    '<img src="https://cdn.discordapp.com/emojis/'+e.id+'.png" style="width:24px;height:24px;">' +
    '<span>:'+e.name+':</span>' +
    '</div>').join('') || '<div style="color:var(--text-muted);">No app emojis.</div>';
});
async function uploadAppEmoji() {
  const name = await customPrompt('Emoji name:');
  if (!name) return;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async function() {
    const file = input.files[0]; if (!file) return;
    const b64 = await getFileBase64({ files: [file] });
    if (b64) {
      socket.emit('run_command', { cmd: 'developer_app_emoji_upload', params: { name, image: b64 } });
      setTimeout(() => socket.emit('run_command', { cmd: 'developer_app_emojis_list', params: {} }), 1000);
    }
  };
  input.click();
}
function deleteAppEmoji(id) {
  customConfirm('Delete this app emoji?').then(ok => {
    if (ok) {
      socket.emit('run_command', { cmd: 'developer_app_emoji_delete', params: { emoji_id: id } });
      setTimeout(() => socket.emit('run_command', { cmd: 'developer_app_emojis_list', params: {} }), 500);
    }
  });
}

function buildDevWebhooks() {
  socket.emit('run_command', { cmd: 'developer_webhooks_list', params: {} });
  return '<div id="dev-webhooks-list"></div>';
}
socket.on('developer_webhooks', function(data) {
  const list = document.getElementById('dev-webhooks-list');
  if (!list) return;
  list.innerHTML = data.webhooks.map(wh => '<div style="display:flex; justify-content:space-between; padding:8px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px;">' +
    '<div><strong>'+esc(wh.name)+'</strong><br><small>'+esc(wh.channel)+'</small></div>' +
    '<div><button class="danger-btn" onclick="deleteDevWebhook(\''+wh.id+'\')">Delete</button></div>' +
    '</div>').join('') || '<div style="color:var(--text-muted);">No webhooks found.</div>';
});
function deleteDevWebhook(id) {
  customConfirm('Delete this webhook?').then(ok => {
    if (ok) {
      socket.emit('run_command', { cmd: 'developer_webhook_delete', params: { webhook_id: id } });
      setTimeout(() => socket.emit('run_command', { cmd: 'developer_webhooks_list', params: {} }), 500);
    }
  });
}

function buildDevRichPresence() {
  socket.emit('run_command', { cmd: 'developer_rich_presence_assets', params: {} });
  return '<div style="margin-bottom:1rem;"><button class="primary-btn" onclick="uploadRPCAsset()">Add Asset</button></div>' +
    '<div id="rpc-assets-grid"></div>';
}
socket.on('developer_rich_presence_assets', function(data) {
  const grid = document.getElementById('rpc-assets-grid');
  if (!grid) return;
  grid.innerHTML = data.assets.map(a => '<div class="expression-chip" style="display:flex; align-items:center; gap:4px; padding:6px; background:var(--glass-bg-light); border-radius:var(--radius-sm); margin-bottom:4px; cursor:pointer;" onclick="deleteRPCAsset(\''+a.id+'\')">' +
    '<img src="https://cdn.discordapp.com/app-assets/'+a.application_id+'/'+a.id+'.png" style="width:48px;height:48px;object-fit:contain;">' +
    '<span>'+esc(a.name)+'</span>' +
    '</div>').join('') || '<div style="color:var(--text-muted);">No assets.</div>';
});
async function uploadRPCAsset() {
  const name = await customPrompt('Asset name:');
  if (!name) return;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async function() {
    const file = input.files[0]; if (!file) return;
    const b64 = await getFileBase64({ files: [file] });
    if (b64) {
      socket.emit('run_command', { cmd: 'developer_rich_presence_asset_upload', params: { name, image: b64 } });
      setTimeout(() => socket.emit('run_command', { cmd: 'developer_rich_presence_assets', params: {} }), 1000);
    }
  };
  input.click();
}
function deleteRPCAsset(id) {
  customConfirm('Delete this asset?').then(ok => {
    if (ok) {
      socket.emit('run_command', { cmd: 'developer_rich_presence_asset_delete', params: { asset_id: id } });
      setTimeout(() => socket.emit('run_command', { cmd: 'developer_rich_presence_assets', params: {} }), 500);
    }
  });
}