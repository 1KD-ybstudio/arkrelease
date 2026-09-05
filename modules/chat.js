
(function () {
  if (window.arkIcon) return;
  var S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  window.ArkIcons = {
    mic: '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0"/><path d="M12 16.5V21"/><path d="M9 21h6"/>',
    'mic-off': '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0"/><path d="M12 16.5V21"/><path d="M4 4l16 16"/>',
    chat: '<path d="M21 11.5a8 8 0 0 1-8.5 8L4 21l1.6-3.6A8 8 0 1 1 21 11.5z"/>',
    leave: '<path d="M4 14c4.5-4.5 11.5-4.5 16 0"/><path d="M4 14l-1.5 3.5L6 19"/><path d="M20 14l1.5 3.5L18 19"/>',
    react: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    reply: '<path d="M9 14L4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 7 7v4"/>',
    edit: '<path d="M4 20l4.5-1L20 7.5l-3.5-3.5L5 15.5 4 20z"/><path d="M13.5 6l3.5 3.5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M4 12l16-8-6.5 16-2.5-6.5L4 12z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    hash: '<path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17"/>',
    down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    book: '<path d="M5 4a2 2 0 0 1 2-2h12v18H7a2 2 0 0 0-2 2V4z"/><path d="M9 2v18"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
    warn: '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    play: '<path d="M8 5l11 7-11 7V5z"/>',
    file: '<path d="M6 2h8l4 4v16H6V2z"/><path d="M14 2v4h4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'
  };
  window.arkIcon = function (name, size, cls) {
    var b = window.ArkIcons[name] || '';
    return '<svg class="' + (cls || 'ark-ic') + '" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" ' + S + ' aria-hidden="true">' + b + '</svg>';
  };
  var st = document.createElement('style');
  st.textContent = '.ark-ic{vertical-align:-3px;flex-shrink:0}';
  document.head.appendChild(st);
})();

var CHAT_IS_MOBILE = (function () {
    try {
        return /Mobi|Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
    } catch (e) {
        return false;
    }
})();

let currentProfileUserId = null;
let mentionPopupItems = [];
let mentionPopupVisible = false, mentionFilter = '', mentionSelectedIndex = -1;
let serverEmojis = [], emojiTab = 'native';
let typingIndicatorTimeout = null;
let touchState = { startX: 0, startY: 0, wrapper: null, msgId: null, swiping: false, timer: null };
let micStream = null;
let micNode = null;
let micContext = null;
let micActive = false;
let currentVoiceChannelId = null;
let unseenCount = 0;
let chatNearBottom = true;
window.isLoadingHistory = {};
window.unreadChannels = new Set();

function updateUnreadBadges() {
  const unreads = window.unreadChannels || new Set();
  document.querySelectorAll('.channel-item').forEach(el => {
    const id = el.dataset.channelId;
    el.classList.toggle('has-unread', unreads.has(id));
  });
  document.querySelectorAll('.ns-it[data-chan], .nsh-it[data-chan]').forEach(el => {
    const id = el.dataset.chan;
    el.classList.toggle('has-unread', unreads.has(id));
  });
}
const messageCache = {};
const messageCacheLastId = {};
const messageCacheComplete = {};
const TEXT_EXTENSIONS = ['txt', 'py', 'js', 'json', 'css', 'html', 'htm', 'md', 'yaml', 'yml', 'log', 'csv', 'ts', 'jsx', 'tsx', 'xml', 'ini', 'cfg', 'toml', 'r', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'sql', 'sh', 'bash', 'bat', 'ps1', 'swift', 'kt', 'go', 'rs'];
const inviteCache = {
  resolve: function (code) {
    return new Promise((resolve) => {
      if (this._cache[code]) {
        const cached = this._cache[code];
        if (Date.now() - cached.time < 300000) { resolve(cached.data); return; }
      }
      const pending = this._pending[code];
      if (pending) { pending.push(resolve); return; }
      this._pending[code] = [resolve];
      socket.emit('resolve_invite', { code: code });
      socket.once('invite_resolved', (data) => {
        if (data.code === code) {
          this._cache[code] = { data, time: Date.now() };
          const list = this._pending[code] || [];
          delete this._pending[code];
          list.forEach(cb => cb(data));
        }
      });
    });
  },
  _cache: {},
  _pending: {}
};
class InviteCard extends HTMLElement {
  connectedCallback() {
    const code = this.getAttribute('code');
    if (!code) return;
    this.innerHTML = '<div style="display:inline-block; background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:8px 12px; margin:4px 0; cursor:pointer;"><span class="spinner-inline" style="width:16px;height:16px;border-width:2px;"></span> Loading invite...</div>';
    inviteCache.resolve(code).then(data => {
      if (data.error) { this.innerHTML = ''; return; }
      const icon = data.icon_url ? '<img src="' + esc(data.icon_url) + '" style="width:32px;height:32px;border-radius:50%;margin-right:8px;" draggable="false">' : '';
      this.innerHTML = '<div style="display:flex; align-items:center; background:var(--glass-bg-light); border:1px solid var(--glass-border); border-radius:var(--radius-sm); padding:8px 12px; margin:4px 0; cursor:pointer;" onclick="copyInviteCode(\'' + esc(code) + '\', event)" title="Click to copy invite link">' + icon + '<div><div style="font-weight:600; font-size:0.9rem;">' + esc(data.server_name) + '</div><div style="font-size:0.75rem; color:var(--text-muted);">' + (data.member_count || 0).toLocaleString() + ' members • ' + (data.presence_count || 0).toLocaleString() + ' online</div></div></div>';
    });
  }
}
if (!customElements.get('invite-card')) customElements.define('invite-card', InviteCard);
function copyInviteCode(code, event) {
  event.stopPropagation();
  const url = 'https://discord.gg/' + code;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => pushNotification('Invite link copied', '', 'success', 2000));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); pushNotification('Invite link copied', '', 'success', 2000); } catch (e) { pushNotification('Copy failed', '', 'error', 2000); }
    document.body.removeChild(ta);
  }
}
const MIC_WORKLET = [
  'class MicPCMProcessor extends AudioWorkletProcessor {',
  '  constructor() { super(); this.acc = new Float32Array(0); }',
  '  process(inputs) {',
  '    const ch = inputs[0] && inputs[0][0];',
  '    if (!ch) return true;',
  '    const merged = new Float32Array(this.acc.length + ch.length);',
  '    merged.set(this.acc);',
  '    merged.set(ch, this.acc.length);',
  '    let off = 0;',
  '    while (merged.length - off >= 960) {',
  '      const pcm = new Int16Array(960);',
  '      for (let i = 0; i < 960; i++) {',
  '        const s = Math.max(-1, Math.min(1, merged[off + i]));',
  '        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;',
  '      }',
  '      this.port.postMessage(pcm, [pcm.buffer]);',
  '      off += 960;',
  '    }',
  '    this.acc = merged.slice(off);',
  '    return true;',
  '  }',
  '}',
  "registerProcessor('mic-pcm-processor', MicPCMProcessor);"
].join('\n');

document.addEventListener('visibilitychange', function () {
  if (!document.hidden && micContext && micContext.state === 'suspended') micContext.resume();
});

let micStarting = false;
async function startMicBroadcast() {
  if (micStarting || micActive) return;
  micStarting = true;
  try {
    stopMicBroadcast(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      pushNotification('Mic needs a secure context (HTTPS or localhost)', '', 'error', 4000);
      return;
    }
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    micContext = ctx;
    if (ctx.state === 'suspended') await ctx.resume();
    if (micContext !== ctx) { try { ctx.close(); } catch (e) {} return; }
    const source = ctx.createMediaStreamSource(micStream);
    if (micContext.audioWorklet) {
      const blob = new Blob([MIC_WORKLET], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      await micContext.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      micNode = new AudioWorkletNode(micContext, 'mic-pcm-processor');
      micNode.port.onmessage = function (e) {
        if (e.data && e.data.buffer) socket.emit('mic_audio', e.data.buffer);
      };
      const silent = micContext.createGain();
      silent.gain.value = 0;
      source.connect(micNode);
      micNode.connect(silent);
      silent.connect(micContext.destination);
    } else {
      micNode = micContext.createScriptProcessor(4096, 1, 1);
      micNode.onaudioprocess = function (event) {
        const input = event.inputBuffer.getChannelData(0);
        const buf = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        socket.emit('mic_audio', buf.buffer);
      };
      const silent = micContext.createGain();
      silent.gain.value = 0;
      source.connect(micNode);
      micNode.connect(silent);
      silent.connect(micContext.destination);
    }
    micActive = true;
    updateMicButton();
    pushNotification('Microphone active – speak now', '', 'info', 2000);
  } catch (e) {
    console.error('Mic error:', e);
    micActive = false;
    updateMicButton();
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
      pushNotification('Mic blocked – tap ⓘ in the address bar → Site settings → Microphone → Allow, then tap 🎤 again', '', 'error', 6000);
    } else if (e && e.name === 'NotFoundError') {
      pushNotification('No microphone found on this device', '', 'error', 3000);
    } else {
      pushNotification('Mic access denied', '', 'error', 2000);
    }
  } finally {
    micStarting = false;
  }
}
function stopMicBroadcast(silent) {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (micNode) { try { micNode.disconnect(); } catch (e) {} micNode = null; }
  if (micContext) { try { micContext.close(); } catch (e) {} micContext = null; }
  micActive = false;
  updateMicButton();
  if (!silent) pushNotification('Microphone stopped', '', 'info', 2000);
}
function toggleMic() {
    if (micActive) {
        stopMicBroadcast();
    } else {
        startMicBroadcast();
    }
}
function updateMicButton() {
  const btn = document.getElementById('vc-btn-mic') || document.getElementById('vc-btn-mic-header');
  if (!btn) return;
  if (micActive) {
    btn.innerHTML = arkIcon('mic');
    btn.style.background = 'rgba(255,255,255,.06)';
   } else {
    btn.innerHTML = arkIcon('mic-off');
    btn.style.background = 'var(--danger,#f23f43)';
  }
  var ms = document.getElementById('vc-mic-state');
  if (ms) ms.innerHTML = micActive ? arkIcon('mic', 14) : arkIcon('mic-off', 14);
}
function leaveVC() { socket.emit('leave_vc'); }
function joinVC(channelId) { currentVoiceChannelId = channelId; socket.emit('join_vc', { channel_id: channelId }); }
let dragState = { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
let wasDragged = false;
function startDrag(e) {
  e.preventDefault();
  const overlay = document.getElementById('vc-floating-overlay');
  if (!overlay) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  dragState.isDragging = true;
  wasDragged = false;
  dragState.startX = clientX; dragState.startY = clientY;
  dragState.startLeft = overlay.offsetLeft; dragState.startTop = overlay.offsetTop;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', stopDrag);
}
function onDrag(e) {
  if (!dragState.isDragging) return;
  e.preventDefault();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const dx = clientX - dragState.startX;
  const dy = clientY - dragState.startY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) wasDragged = true;
  const overlay = document.getElementById('vc-floating-overlay');
  if (overlay) { overlay.style.left = (dragState.startLeft + dx) + 'px'; overlay.style.top = (dragState.startTop + dy) + 'px'; }
}
function stopDrag() {
  dragState.isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);
}
let voiceMemberRefreshInterval = null;
let voiceSpeaking = {};
let voiceConnectedAt = 0;
let voiceTimerInterval = null;
function voiceChannelName() {
  if (!currentVoiceChannelId || !AppState.serverData) return 'Voice';
  const ch = AppState.serverData.channels.find(function (c) { return c.id === currentVoiceChannelId; });
  return ch ? ch.name : 'Voice';
}
function ensureVoiceUI() {
  if (document.getElementById('vc-pill')) return;
  var st = document.createElement('style');
  st.textContent = '@keyframes vcPulse{0%,100%{opacity:1}50%{opacity:.35}}.vc-speaking{box-shadow:0 0 0 2px #23a55a,0 0 10px rgba(35,165,90,.6)!important;border-radius:50%;}';
  document.head.appendChild(st);
  var isMob = (typeof isMobileDevice !== 'undefined') ? isMobileDevice : window.matchMedia('(max-width:900px)').matches;
  var bottom = isMob ? 'calc(110px + env(safe-area-inset-bottom))' : '20px';
  var panelBottom = isMob ? 'calc(172px + env(safe-area-inset-bottom))' : '80px';
  var btnCss = 'width:34px;height:34px;border-radius:50%;border:1px solid var(--glass-border,rgba(255,255,255,.1));background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  var pill = document.createElement('div');
  pill.id = 'vc-pill';
  pill.style.cssText = 'position:fixed;right:12px;bottom:' + bottom + ';z-index:9990;display:none;align-items:center;gap:8px;background:#12141f;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:999px;padding:8px 12px;box-shadow:0 8px 24px rgba(0,0,0,.5);';
  pill.innerHTML =
    '<span id="vc-live-dot" style="width:8px;height:8px;border-radius:50%;background:#00d4aa;box-shadow:0 0 8px #00d4aa;animation:vcPulse 1.6s infinite;flex-shrink:0;"></span>' +
    '<div id="vc-pill-body" style="cursor:pointer;display:flex;flex-direction:column;line-height:1.15;margin-right:2px;">' +
    '<span id="vc-pill-name" style="font:700 11px system-ui,sans-serif;color:#fff;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>' +
    '<span id="vc-pill-timer" style="font:600 9px monospace;color:var(--text-muted,#8b90a8);">00:00</span>' +
    '</div>' +
    ' <button id="vc-btn-mic" title="Mute / unmute" style="' + btnCss + '">' + arkIcon('mic') + '</button>' +
    ' <button id="vc-btn-chat" title="Open channel chat" style="' + btnCss + '">' + arkIcon('chat') + '</button>' +
    ' <button id="vc-btn-leave" title="Leave voice" style="' + btnCss + 'background:var(--danger,#f23f43);border:none;">' + arkIcon('leave') + '</button>';
  document.body.appendChild(pill);
  var panel = document.createElement('div');
  panel.id = 'vc-panel';
  panel.style.cssText = 'position:fixed;right:12px;bottom:' + panelBottom + ';z-index:9990;display:none;width:260px;max-height:340px;overflow-y:auto;background:#12141f;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:10px;';
  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span style="font:700 10px monospace;color:#00d4aa;letter-spacing:1px;">IN VOICE</span><button id="vc-panel-close" style="border:none;background:none;color:var(--text-muted,#8b90a8);cursor:pointer;font-size:14px;">' + arkIcon('close', 14) + '</button></div><div id="vc-member-list"></div>';
  document.body.appendChild(panel);
  pill.querySelector('#vc-pill-body').addEventListener('click', function () { toggleVoicePanel(); });
  pill.querySelector('#vc-btn-mic').addEventListener('click', function (e) { e.stopPropagation(); toggleMic(); });
  pill.querySelector('#vc-btn-chat').addEventListener('click', function (e) { e.stopPropagation(); openVoiceChat(currentVoiceChannelId); });
  pill.querySelector('#vc-btn-leave').addEventListener('click', function (e) { e.stopPropagation(); leaveVC(); });
  panel.querySelector('#vc-panel-close').addEventListener('click', function () { toggleVoicePanel(false); });
}
function toggleVoicePanel(force) {
  var panel = document.getElementById('vc-panel');
  if (!panel) return;
  var show = (typeof force === 'boolean') ? force : panel.style.display === 'none';
  panel.style.display = show ? 'block' : 'none';
  if (show) updateVoiceMemberList();
}
function fmtVoiceTimer(ms) {
  var s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function startVoiceTimers() {
  stopVoiceTimers();
  voiceTimerInterval = setInterval(function () {
    var t = document.getElementById('vc-pill-timer');
    if (t) t.textContent = fmtVoiceTimer(Date.now() - voiceConnectedAt);
  }, 1000);
  voiceMemberRefreshInterval = setInterval(updateVoiceMemberList, 3000);
}
function stopVoiceTimers() {
  if (voiceTimerInterval) { clearInterval(voiceTimerInterval); voiceTimerInterval = null; }
  if (voiceMemberRefreshInterval) { clearInterval(voiceMemberRefreshInterval); voiceMemberRefreshInterval = null; }
}
function updateVoiceMemberList() {
  var listEl = document.getElementById('vc-member-list');
  if (!listEl || !currentVoiceChannelId || !AppState.serverData) return;
  var members = AppState.serverData.members.filter(function (m) { return m.voice_channel_id === currentVoiceChannelId; });
  var botId = AppState.botInfo ? AppState.botInfo.id : null;
  var html = '';
  if (botId) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;">' +
      '<img src="' + esc(AppState.botInfo.avatar_url || '/arklum.png') + '" class="' + (voiceSpeaking[botId] ? 'vc-speaking' : '') + '" style="width:26px;height:26px;border-radius:50%;">' +
      '<span style="font-size:.8rem;color:#fff;flex:1;">' + esc(AppState.botInfo.name) + ' (bot)</span>' +
      ' <span id="vc-mic-state" style="font-size:.8rem;">' + (micActive ? arkIcon('mic', 14) : arkIcon('mic-off', 14)) + '</span></div>';
  }
  html += members.map(function (m) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;">' +
      '<img src="' + esc(m.avatar_url || '/arklum.png') + '" class="' + (voiceSpeaking[m.id] ? 'vc-speaking' : '') + '" style="width:26px;height:26px;border-radius:50%;" onerror="this.style.display=\'none\'" loading="lazy">' +
      '<span style="font-size:.8rem;color:#fff;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.display_name || m.name || m.username) + '</span>' +
      (voiceSpeaking[m.id] ? ' <span style="font-size:.7rem;color:#23a55a;">' + arkIcon('volume', 12) + '</span>' : '') +
      '</div>';
  }).join('');
  listEl.innerHTML = html || '<div style="color:var(--text-muted,#8b90a8);font-size:.8rem;padding:6px;">No one else here.</div>';
}
function showVoiceUI() {
  ensureVoiceUI();
  var pill = document.getElementById('vc-pill');
  if (pill) pill.style.display = 'flex';
  var n = document.getElementById('vc-pill-name');
  if (n) n.textContent = voiceChannelName();
  startVoiceTimers();
  updateVoiceMemberList();
}
function hideVoiceUI() {
  var pill = document.getElementById('vc-pill');
  var panel = document.getElementById('vc-panel');
  if (pill) pill.style.display = 'none';
  if (panel) panel.style.display = 'none';
  stopVoiceTimers();
}
function toggleChannelSidebar() {
  const existing = document.getElementById('channel-sidebar');
  if (existing) existing.remove();
  else buildChannelSidebar();
}
function setupChatLayout() {
  const html = '<div class="chat-layout" style="display:flex; flex-direction:column; height:100%;">' +
    '<div class="page-top-bar">' +
    ' <button class= "header-btn " onclick= "toggleSidebar() " title= "Menu " >' + arkIcon('menu') + ' </button >' +
    ' <button class= "header-btn " onclick= "toggleChannelSidebar() " title= "Channels " >' + arkIcon('hash') + ' </button >' +
    '<div class="page-title" id="chat-channel-title">Select a channel</div>' +
    '<span id="typing-indicator" style="font-size:0.75rem; color:var(--primary); margin-left:8px; display:none;"></span>' +
    ' <button class="header-btn" id="vc-btn-mic-header" onclick="toggleMic()" title="Microphone" style="display:none;">' + arkIcon('mic') + '</button>' +
    ' <button class="header-btn" id="vc-btn-leave-header" onclick="leaveVC()" title="Leave Voice Chat" style="display:none;">' + arkIcon('leave') + '</button>' +
    ' <button class="header-btn" onclick="refreshCurrentView()" title="Refresh chat">' + arkIcon('refresh') + '</button>' +
    '</div>' +
    '<div class="chat-messages" id="chat-messages" style="flex:1; overflow:hidden; position:relative; background:rgba(0,0,0,0.2);">' +
    '<div class="chat-corner chat-corner-tl" id="chatCornerTL"></div>' +
    '<div class="chat-corner chat-corner-br" id="chatCornerBR"></div>' +
    '<div class="chat-messages-list" id="chat-messages-list" style="height:100%; overflow-y:auto; padding:1rem; position:relative; z-index:1;">' +
    '<div class="empty-state" id="chat-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><p>Select a channel or DM to start chatting</p></div>' +
    '</div>' +
    ' <button id="jump-present" onclick="jumpToPresent()">' + arkIcon('down', 16) + ' <span id="jump-count"></span></button>' +
    '</div>' +
    '<div class="chat-input-container" style="flex-shrink:0; padding:8px 12px; padding-bottom:calc(8px + var(--safe-bottom)); background:rgba(18,20,24,0.55); backdrop-filter:blur(25px); border-top:1px solid var(--glass-border);">' +
    '<div id="typing-indicator-bar" style="display:none;font-size:0.75rem;color:var(--primary);padding:0 2px 6px;"></div>' +
    '<div class="reply-preview" id="reply-preview" style="padding:6px 10px; background:rgba(0,212,170,0.15); border-left:3px solid var(--primary); font-size:0.8rem; color:var(--primary); margin-bottom:8px; border-radius:4px; display:none;">' +
    '<span id="reply-text"></span><span style="cursor:pointer;font-weight:bold;margin-left:10px;" onclick="cancelReply()">' + arkIcon('close', 12) + '</span>' +
    '</div>' +
    '<div class="attachment-previews" id="attachment-previews" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0; max-height:120px; overflow-y:auto;"></div>' +
    '<div class="chat-input-row" style="display:flex; gap:8px; align-items:center;">' +
    ' <button class="secondary-btn" onclick="document.getElementById(\'chat-attach\').click()" title="Attach">' + arkIcon('plus') + '</button>' +
    ' <button class="secondary-btn" id="emoji-btn" onclick="toggleEmojiPicker()" title="Emoji">' + arkIcon('react') + '</button>' +
    '<textarea id="chat-input" placeholder="Type a message..." rows="1" style="flex:1; resize:none; min-height:40px; max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); border-radius:var(--radius-sm); color:var(--text); padding:10px 12px; font-family:inherit; font-size:0.9rem;"></textarea>' +
    ' <button class="primary-btn" onclick="sendChatMessage()" title="Send">' + arkIcon('send') + '</button>' +
    '</div>' +
    '</div>' +
    '<input type="file" id="chat-attach" style="display:none" multiple>' +
    '</div>';
  DOM.mainContent.innerHTML = html;
  var mListEl = document.getElementById('chat-messages-list');
  if (mListEl) {
    mListEl.addEventListener('scroll', function () {
    chatNearBottom = (mListEl.scrollHeight - mListEl.scrollTop - mListEl.clientHeight) < 80;
    if (chatNearBottom) hideJumpPill();
    else showJumpPill(unseenCount);
    if (mListEl.scrollTop < 50 && !window.isLoadingHistory[AppState.activeChatChannel] && messageCache[AppState.activeChatChannel] && messageCache[AppState.activeChatChannel].length > 0) {
      window.isLoadingHistory[AppState.activeChatChannel] = true;
      const oldestMsg = messageCache[AppState.activeChatChannel][0];
      if (oldestMsg && oldestMsg.id) {
        socket.emit('fetch_chat', { channel_id: AppState.activeChatChannel, before_id: oldestMsg.id, limit: 50 });
      }
    }
  });
  }
  const ta = document.getElementById('chat-input');
  if (ta) {
    let typingTimer = null;
    ta.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 150) + 'px';
      if (typingTimer) clearTimeout(typingTimer);
      if (this.value.trim().length > 0) {
        socket.emit('typing_start', {
          channel_id: AppState.activeChatChannel || AppState.activeDmChannel,
          user_name: AppState.botInfo ? AppState.botInfo.name : 'Bot'
        });
        typingTimer = setTimeout(function () { typingTimer = null; }, 2000);
      }
    });
    if (ta && CHAT_IS_MOBILE) ta.setAttribute('enterkeyhint', 'enter');
    ta.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey && !CHAT_IS_MOBILE) {
        e.preventDefault();
        e.stopPropagation();
        sendChatMessage();
        return;
      }
      if (e.key === 'ArrowUp' && this.value.trim() === '' && AppState.botInfo) {
        var messages = document.querySelectorAll('.message-wrapper[data-author-id="' + AppState.botInfo.id + '"]');
        if (messages.length) {
          e.preventDefault();
          var last = messages[messages.length - 1];
          var text = last.querySelector('.msg-text');
          if (text) {
            this.value = text.textContent;
            AppState.editTarget = last.dataset.msgId;
            pushNotification('Editing last message', '', 'info', 2000);
          }
        }
      }
    });
  }
  document.getElementById('chat-attach').addEventListener('change', function (e) {
    const files = e.target.files;
    if (!files.length) return;
    for (const file of files) window.pendingAttachments.push(file);
    const previewContainer = document.getElementById('attachment-previews');
    previewContainer.innerHTML = '';
    window.pendingAttachments.forEach(function (file, i) {
      const chip = document.createElement('div');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);border:1px solid var(--glass-border);border-radius:8px;padding:4px 8px;font-size:0.8rem;color:var(--text);';
      chip.innerHTML = esc(file.name) + ' <span onclick="window.pendingAttachments.splice(' + i + ',1); this.parentElement.remove();" style="cursor:pointer;">' + arkIcon('close', 12) + '</span>';
      previewContainer.appendChild(chip);
    });
    e.target.value = '';
  });
}
function renderChat() {
  if (!AppState.serverData) return;
  setupChatLayout();
  if (typeof applyThemeVisuals === 'function') applyThemeVisuals();
  buildChannelSidebar();
  const savedChannel = localStorage.getItem('lastChatChannel');
  const savedDM = localStorage.getItem('lastChatDM');
  if (savedChannel) setTimeout(() => selectChatChannel(savedChannel), 100);
  else if (savedDM) {
    try {
      const dm = JSON.parse(savedDM);
      setTimeout(() => openDm(dm.id), 100);
    } catch (e) {}
  }
}
function buildChannelSidebar() {
  const categories = AppState.serverData.categories || [];
  const channels = AppState.serverData.channels;
  const categorized = {};
  categories.forEach(function (c) { categorized[c.id] = { name: c.name, channels: [] }; });
  const uncategorized = [];
  channels.forEach(function (ch) {
    if (ch.category_id && categorized[ch.category_id]) categorized[ch.category_id].channels.push(ch);
    else uncategorized.push(ch);
  });
  let html = '<div style="position:fixed; top:var(--header-height); left:0; width:260px; bottom:0; background:rgba(18,20,24,0.7); backdrop-filter:blur(25px); border-right:1px solid var(--glass-border); overflow-y:auto; z-index:150; padding:0.5rem;" id="channel-sidebar">';
  html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px;"><span style="font-weight:600; color:var(--primary);">Channels</span><button onclick="toggleChannelSidebar()" class="secondary-btn" style="font-size:0.8rem;">' + arkIcon('close', 14) + '</button></div>';
  for (const catId in categorized) {
    const cat = categorized[catId];
    if (cat.channels.length === 0) continue;
    html += '<div class="channel-category"><div class="category-header" onclick="this.parentElement.classList.toggle(\'open\')" style="padding:6px 8px; cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--primary);">' + esc(cat.name) + '</div><div class="category-channels">';
    cat.channels.forEach(function (ch) {
      html += '<div class="channel-item' + (AppState.activeChatChannel === ch.id ? ' active' : '') + '" data-channel-id="' + ch.id + '" style="padding:6px 12px; cursor:pointer; border-radius:6px; margin-bottom:1px; font-size:0.85rem; color:var(--text); display:flex; align-items:center; gap:6px;">' + (ch.type === 'voice' ? '~' : '#') + ' <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(ch.name) + '</span>' + (ch.type === 'voice' ? '<button data-vc-join="' + ch.id + '" style="flex-shrink:0; border:none; border-radius:999px; background:var(--primary,#454af8); color:#fff; font:700 9px system-ui,sans-serif; padding:4px 10px; cursor:pointer;">JOIN</button>' : '') + '</div>';
    });
    html += '</div></div>';
  }
  if (uncategorized.length > 0) {
    html += '<div class="channel-category open"><div class="category-channels">';
    uncategorized.forEach(function (ch) {
      html += '<div class="channel-item' + (AppState.activeChatChannel === ch.id ? ' active' : '') + '" data-channel-id="' + ch.id + '" style="padding:6px 12px; cursor:pointer; border-radius:6px; margin-bottom:1px; font-size:0.85rem; display:flex; align-items:center; gap:6px;">' + (ch.type === 'voice' ? '~' : '#') + ' <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(ch.name) + '</span>' + (ch.type === 'voice' ? '<button data-vc-join="' + ch.id + '" style="flex-shrink:0; border:none; border-radius:999px; background:var(--primary,#454af8); color:#fff; font:700 9px system-ui,sans-serif; padding:4px 10px; cursor:pointer;">JOIN</button>' : '') + '</div>';
    });
    html += '</div></div>';
  }
  html += '<div style="margin-top:8px; padding:0 8px;"><span style="font-weight:600; color:var(--primary);">Members</span></div>';
  html += '<div style="padding:4px 8px;"><input type="text" id="chat-member-search" placeholder="Search members..." oninput="filterChatMembers()" style="margin-bottom:8px;"></div>';
  html += '<div id="chat-member-list" style="overflow-y:auto; padding:0 4px;"></div>';
  html += '</div>';
  const existing = document.getElementById('channel-sidebar');
  if (existing) existing.remove();
  DOM.mainContent.insertAdjacentHTML('beforeend', html);
  const sidebarEl = document.getElementById('channel-sidebar');
  if (sidebarEl) {
    sidebarEl.addEventListener('click', function (e) {
      const jb = e.target.closest('[data-vc-join]');
      if (jb) { e.stopPropagation(); joinVC(jb.getAttribute('data-vc-join')); return; }
      const item = e.target.closest('.channel-item');
      if (item) {
        const chId = item.dataset.channelId;
        if (chId) selectChatChannel(chId);
      }
    });
  }
  if (AppState.serverData && AppState.serverData.members) renderChatMemberList(AppState.serverData.members);
}
function selectChatChannel(channelId) {
  AppState.activeChatChannel = channelId;
  AppState.activeDmChannel = null;
  AppState.dmRecipient = null;
  const ch = AppState.serverData.channels.find(c => c.id === channelId);
  const title = document.getElementById('chat-channel-title');
  if (title) title.textContent = (ch && ch.type === 'voice' ? '🔊 ' : '#') + (ch ? ch.name : 'Chat');
  const messagesContainer = document.getElementById('chat-messages-list');
  if (!messagesContainer) return;
  unseenCount = 0;
  chatNearBottom = true;
  hideJumpPill();
  if (messageCache[channelId] && messageCache[channelId].length > 0) {
    window._nsLastSeen = localStorage.getItem('ns_lastseen_' + channelId);
    messagesContainer.innerHTML = renderMessagesGrouped(messageCache[channelId], window._nsLastSeen);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    localStorage.setItem('ns_lastseen_' + channelId, messageCache[channelId][messageCache[channelId].length - 1].id);
  } else {
    messagesContainer.innerHTML = '<div class="empty-state"><div class="skeleton" style="width:60%; height:16px; margin-bottom:8px;"></div><div class="skeleton" style="width:80%; height:16px; margin-bottom:8px;"></div><div class="skeleton" style="width:50%; height:16px;"></div></div>';
    socket.emit('fetch_chat', { channel_id: channelId });
  }
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  const active = document.querySelector('.channel-item[data-channel-id="' + channelId + '"]');
  if (active) active.classList.add('active');
  toggleChannelSidebar();
  saveAppState();
  localStorage.setItem('lastChatChannel', channelId);
  localStorage.removeItem('lastChatDM');
}
function renderChatMemberList(members) {
  const list = document.getElementById('chat-member-list');
  if (!list) return;
  list.innerHTML = members.map(m => `<div class="member-item" onclick="openDm('${m.id}')" style="display:flex; align-items:center; gap:8px; padding:6px 8px; cursor:pointer; border-radius:8px; font-size:0.85rem;"><div style="position:relative; width:28px; height:28px; flex-shrink:0;"><img src="${esc(m.avatar_url || '')}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'" draggable="false" loading="lazy"><span style="width:10px;height:10px;border-radius:50%;position:absolute;bottom:-2px;right:-2px;border:2px solid #1a1a1a;background:${getStatusColor(m.status)}"></span></div><div style="min-width:0"><strong>${esc(m.name)}</strong>${m.custom_status ? '<br><small style="color:var(--primary);">' + esc(m.custom_status) + '</small>' : ''}</div></div>`).join('');
}
function filterChatMembers() {
  const query = document.getElementById('chat-member-search')?.value?.toLowerCase() || '';
  const members = AppState.serverData?.members || [];
  renderChatMemberList(members.filter(m => m.name.toLowerCase().includes(query) || m.username.toLowerCase().includes(query)));
}
function showVoicePopup(channelId) {
  const popup = document.getElementById('msg-popup');
  if (!popup) return;
  let html = '<div class="msg-popup-item" onclick="joinVC(\'' + channelId + '\');hidePopup()">Join Voice Chat</div>' +
    '<div class="msg-popup-item" onclick="openVoiceChat(\'' + channelId + '\');hidePopup()">Open Chat</div>';
  if (AppState.serverData && AppState.serverData.members) {
    const vcMembers = AppState.serverData.members.filter(m => m.voice_channel_id === channelId);
    if (vcMembers.length > 0) {
      html += '<div style="border-top:1px solid var(--glass-border);margin-top:4px;padding-top:4px;">' +
        '<div style="font-size:0.7rem;color:var(--primary);padding:4px 14px;">IN VOICE</div>';
      vcMembers.forEach(m => {
        html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 14px;font-size:0.8rem;color:var(--text);">' +
          (m.avatar_url ? '<img src="' + esc(m.avatar_url) + '" style="width:20px;height:20px;border-radius:50%;" draggable="false" loading="lazy">' : '') +
          '<span>' + esc(m.name) + '</span></div>';
      });
      html += '</div>';
    }
  }
  popup.innerHTML = html;
  popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)'; popup.style.display = 'block';
  setTimeout(() => document.addEventListener('click', hidePopup, { once: true }), 50);
}
function openVoiceChat(channelId) {
  const ch = AppState.serverData && AppState.serverData.channels.find(function (c) { return c.id === channelId; });
  if (!ch) { pushNotification('Voice channel not found', '', 'warning', 2000); return; }
  if (AppState.currentPage !== 'chat' && typeof navigate === 'function') navigate('chat');
  setTimeout(function () { selectChatChannel(channelId); }, 50);
}

const HL_KEYWORDS = {
  js: 'const let var function return if else for while do switch case break continue new class extends super this typeof instanceof in of try catch finally throw async await yield import export from default delete void null undefined true false static get set',
  py: 'def class return if elif else for while break continue pass import from as with try except finally raise lambda yield global nonlocal assert del not and or in is None True False self async await print',
  rb: 'def class end if elsif else for while do begin unless require module include extend puts print return nil true false self new and or not',
  java: 'public private protected static final void int long double float boolean char String class interface extends implements return if else for while try catch finally throw throws new import package this super null true false',
  c: 'int long double float char void unsigned signed struct union enum typedef static extern const volatile return if else for while do switch case break continue sizeof include define NULL true false',
  cpp: 'int long double float char void unsigned signed struct union enum typedef static extern const volatile return if else for while do switch case break continue sizeof class public private protected virtual template typename namespace using new delete this nullptr true false auto',
  cs: 'public private protected static readonly void int long double float bool char string class interface return if else for while try catch finally throw new using namespace var async await this base null true false',
  php: 'function return if else elseif for foreach while do switch case break continue class extends implements public private protected static new echo print include require use namespace true false null',
  go: 'func package import var const type struct interface map chan return if else for range switch case break continue go defer select nil true false default',
  rs: 'fn let mut const struct enum impl trait pub use mod crate return if else for while loop match break continue self Self true false None Some async await dyn ref move where',
  kt: 'fun val var class object interface return if else for while when try catch finally throw import package null true false this super data companion init',
  swift: 'func var let class struct enum protocol extension return if else for while switch case break continue guard defer import public private internal static nil true false self super init',
  sh: 'if then else elif fi for while do done case esac function return exit echo local export readonly source shift in',
  sql: 'select from where insert into values update set delete create table drop alter index join left right inner outer full on group by order having limit offset and or not null primary key foreign references as distinct union all exists between like in',
  json: 'true false null',
  yaml: 'true false null',
  toml: 'true false',
  ini: 'true false',
  r: 'function return if else for while repeat break next library require TRUE FALSE NULL NA',
  bat: 'echo set if else for goto call exit rem start title',
  css: 'important',
  md: '', txt: '', log: '', csv: ''
};
function highlightCode(code, lang) {
  lang = String(lang || '').toLowerCase();
  if (lang === 'h' || lang === 'hpp') lang = 'c';
  if (lang === 'ts' || lang === 'jsx' || lang === 'tsx') lang = 'js';
  if (lang === 'bash') lang = 'sh';
  if (lang === 'yml') lang = 'yaml';
  if (lang === 'htm') lang = 'html';
  if (lang === 'cfg' || lang === 'conf') lang = 'ini';
  var out = '', last = 0, m;
  if (lang === 'html' || lang === 'xml') {
    var reH = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g;
    while ((m = reH.exec(code))) {
      var t = m[0];
      if (t.indexOf('<!--') === 0) out += '<span class="hl-c">' + esc(t) + '</span>';
      else if (t.charAt(0) === '<') {
        out += t.replace(/(<\/?)([a-zA-Z][\w:-]*)|([a-zA-Z-]+)(=)("[^"]*"|'[^']*')?|(>)/g, function (mm, a, b, an, eq, val, gt) {
          if (a) return esc(a) + '<span class="hl-t">' + esc(b) + '</span>';
          if (an) return '<span class="hl-a">' + esc(an) + '</span>' + (eq ? esc(eq) : '') + (val ? '<span class="hl-s">' + esc(val) + '</span>' : '');
          if (gt) return esc(gt);
          return esc(mm);
        });
      } else out += esc(t);
      last = reH.lastIndex;
    }
    return out;
  }
  if (lang === 'css') {
    var reC = /(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|([a-zA-Z-]+)(?=\s*:)|(\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|fr|deg|pt)?\b)|([.#][A-Za-z][\w-]*)/g;
    while ((m = reC.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="hl-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="hl-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="hl-p">' + esc(m[3]) + '</span>';
      else if (m[4]) out += '<span class="hl-n">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="hl-t">' + esc(m[5]) + '</span>';
      last = reC.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }
  var kwList = HL_KEYWORDS[lang];
  var set = kwList ? new Set(kwList.split(/\s+/).filter(Boolean)) : null;
  var hash = { py: 1, rb: 1, sh: 1, yaml: 1, toml: 1, r: 1, ini: 1, ps1: 1 }[lang];
  var re = new RegExp(
    '(\\/\\*[\\s\\S]*?\\*\\/|' + (hash ? '#[^\\n]*' : '\\/\\/[^\\n]*') + ')' +
    '|("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)' +
    '|(\\b\\d+(?:\\.\\d+)?\\b)' +
    '|([A-Za-z_$][\\w$]*)', 'g');
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += '<span class="hl-c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="hl-s">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="hl-n">' + esc(m[3]) + '</span>';
    else if (m[4]) {
      var w = m[4];
      if (set && set.has(w.toLowerCase())) out += '<span class="hl-k">' + esc(w) + '</span>';
      else if (/^\s*\(/.test(code.slice(re.lastIndex))) out += '<span class="hl-f">' + esc(w) + '</span>';
      else out += esc(w);
    }
    last = re.lastIndex;
  }
  out += esc(code.slice(last));
  return out;
}

function renderDiscordMarkdown(text) {
  if (!text) return '';
  let html = esc(text);
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, function (m, lang, code) {
    const highlighted = highlightCode(code, lang);
    const copyBtn = '<button class="code-copy-btn" onclick="event.stopPropagation(); copyCodeBlock(this)" title="Copy code">⧉</button>';
    const langTag = lang ? '<span class="code-lang">' + esc(lang) + '</span>' : '';
    return '<div class="code-block-wrapper" style="position:relative; margin:8px 0; max-width:100%;">' + langTag + copyBtn +
    '<pre class="code-block" onclick="copyCodeBlock(this)" style="background:#1e1f22; color:#d4d4d4; padding:14px 12px 12px; border-radius:8px; font-family:monospace; overflow-x:auto; cursor:pointer; max-width:100%;"><code>' + highlighted + '</code></pre></div>';
  });
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code" onclick="copyCodeInline(this)">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1.1rem; margin:4px 0;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem; margin:4px 0;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.3rem; margin:4px 0;">$1</h1>');
  html = html.replace(/^-# (.+)$/gm, '<span style="font-size:0.8rem; color:#aaa; display:block; margin:2px 0;">$1</span>');
  html = html.replace(/^_+ _$/gm, '<span style="display:block; height:1.2em;"></span>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" style="background:#202225;color:transparent;border-radius:3px;cursor:pointer;" onclick="this.style.color=this.style.color===\'white\'?\'transparent\':\'white\'">$1</span>');
  html = html.replace(/^>>> (.+)$/gm, '<div style="border-left:4px solid var(--primary); padding-left:8px; color:#ccc;">$1</div>');
  html = html.replace(/^> (.+)$/gm, '<div style="border-left:4px solid var(--primary); padding-left:8px; color:#ccc;">$1</div>');
  html = html.replace(/&lt;@&(\d+)&gt;/g, function (mm, id) {
  const r = (AppState.serverData && AppState.serverData.roles || []).find(function (x) { return x.id === id; });
  return '<span style="background:rgba(74,74,255,0.3);padding:0 2px;border-radius:3px;">@' + (r ? r.name : id) + '</span>';
  });
  html = html.replace(/&lt;@!?(\d+)&gt;/g, function (mm, id) {
    const mem = (AppState.serverData && AppState.serverData.members || []).find(function (x) { return x.id === id; });
    return '<span style="background:rgba(0,212,170,0.15);padding:0 2px;border-radius:3px;">@' + (mem ? mem.name : id) + '</span>';
  });
  html = html.replace(/@everyone/g, '<span style="background:rgba(255,200,0,0.2);padding:0 2px;border-radius:3px;">@everyone</span>');
  html = html.replace(/@here/g, '<span style="background:rgba(255,200,0,0.2);padding:0 2px;border-radius:3px;">@here</span>');
  html = html.replace(/&lt;@&(?:amp;)?(\d+)&gt;/g, function (mm, id) {
    const r = (AppState.serverData && AppState.serverData.roles || []).find(function (x) { return x.id === id; });
    return '<span style="background:rgba(74,74,255,0.3);padding:0 2px;border-radius:3px;">@' + (r ? esc(r.name) : id) + '</span>';
  });
  html = html.replace(/&lt;@!?(\d+)&gt;/g, function (mm, id) {
    const mem = (AppState.serverData && AppState.serverData.members || []).find(function (x) { return x.id === id; });
    return '<span style="background:rgba(0,212,170,0.15);padding:0 2px;border-radius:3px;cursor:pointer;" onclick="insertMention(\'' + id + '\')">@' + (mem ? esc(mem.name) : id) + '</span>';
  });
  html = html.replace(/&lt;#(\d+)&gt;/g, function (mm, id) {
    const ch = (AppState.serverData && AppState.serverData.channels || []).find(function (c) { return c.id === id; });
    return '<span style="background:rgba(0,212,170,0.15);border-radius:4px;padding:0 2px;cursor:pointer;" onclick="selectChatChannel(\'' + id + '\')">#' + (ch ? esc(ch.name) : id) + '</span>';
  });
  html = html.replace(/@everyone/g, '<span style="background:rgba(255,200,0,0.2);padding:0 2px;border-radius:3px;">@everyone</span>');
  html = html.replace(/@here/g, '<span style="background:rgba(255,200,0,0.2);padding:0 2px;border-radius:3px;">@here</span>');
  html = html.replace(/&lt;(a?):(\w+):(\d+)&gt;/g, function (mm, anim, name, id) {
    const ext = anim ? '.gif' : '.png';
    return '<img src="https://cdn.discordapp.com/emojis/' + id + ext + '" alt=":' + name + ':" style="height:1.4em;width:auto;vertical-align:bottom;" draggable="false" loading="lazy" onerror="this.style.display=\'none\'">';
  });
  html = html.replace(/\[([^\]]*)\]\(((?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)(\w+))\)/gi, '<invite-card code="$3"></invite-card>');
  html = html.replace(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)(\w+)/gi, '<invite-card code="$1"></invite-card>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--primary);">$1</a>');
  html = html.replace(/(?<!["'=])https?:\/\/\S+/g, '<a href="$&" target="_blank" style="color:var(--primary);">$&</a>');
  return html;
}

var HAS_HOVER = false;
try { HAS_HOVER = window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (e) {}
(function () {
  if (document.getElementById('ns-msg-actions-styles')) return;
  var st = document.createElement('style');
  st.id = 'ns-msg-actions-styles';
  st.textContent =
    '.msg-actions{position:absolute;top:-14px;right:8px;display:none;align-items:center;gap:2px;background:#12141f;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:8px;padding:2px 4px;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,.4)}' +
    '.message-wrapper:hover .msg-actions{display:flex}' +
    '.msg-actions button{background:none;border:none;color:var(--text-muted,#8b90a8);font-size:14px;padding:4px 6px;border-radius:6px;cursor:pointer}' +
    '.msg-actions button:hover{background:rgba(255,255,255,.08);color:#fff}';
  document.head.appendChild(st);
})();

function ensureChatStyles() {
  if (document.getElementById('ns-chat-styles')) return;
  var st = document.createElement('style');
  st.id = 'ns-chat-styles';
  st.textContent =
    '.msg-compact{padding-top:0;padding-bottom:0}' +
    '.msg-compact .msg-avatar-spacer{width:32px;flex-shrink:0;position:relative}' +
    '.msg-compact .hover-time{position:absolute;left:0;top:6px;width:32px;text-align:center;font-size:0.6rem;color:var(--text-muted);opacity:0;pointer-events:none}' +
    '.msg-compact:hover{background:rgba(255,255,255,0.04)}' +
    '.msg-compact:hover .hover-time{opacity:1}' +
    '.date-divider{display:flex;align-items:center;gap:10px;margin:14px 4px 6px;color:var(--text-muted);font:600 0.7rem monospace}' +
    '.date-divider::before,.date-divider::after{content:"";flex:1;height:1px;background:var(--glass-border,rgba(255,255,255,.1))}' +
    '.new-divider{display:flex;align-items:center;gap:10px;margin:14px 4px 6px;color:#f23f43;font:700 0.7rem monospace}' +
    '.new-divider::before,.new-divider::after{content:"";flex:1;height:1px;background:#f23f43}' +
    '#jump-present{position:absolute;left:50%;transform:translateX(-50%);bottom:18px;z-index:5;display:none;align-items:center;gap:6px;background:var(--primary,#454af8);color:#fff;border:none;border-radius:999px;padding:8px 14px;font:700 12px system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)}' +
    '#jump-present #jump-count{background:rgba(0,0,0,.25);border-radius:999px;padding:2px 8px}' +
    '.msg-actions{position:absolute;top:-14px;right:8px;display:none;align-items:center;gap:2px;background:#12141f;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:8px;padding:2px 4px;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,.4)}' +
    '.message-wrapper:hover .msg-actions{display:flex}' +
    '.msg-actions button{background:none;border:none;color:var(--text-muted,#8b90a8);font-size:14px;padding:4px 6px;border-radius:6px;cursor:pointer}' +
    '.msg-actions button:hover{background:rgba(255,255,255,.08);color:#fff}' +
    '.channel-item{position:relative}' +
    '.channel-item.has-unread{font-weight:700!important;color:#fff!important;background:rgba(255,255,255,0.05)}' +
    '.channel-item.has-unread::before{content:"";position:absolute;left:4px;top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 6px #fff}' +
    '.code-lang{position:absolute;top:6px;left:10px;font:600 9px monospace;letter-spacing:1px;color:#8b90a8;text-transform:uppercase;pointer-events:none;z-index:2}' +
    '.code-copy-btn{position:absolute;top:4px;right:6px;z-index:2;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#dfe2ff;border-radius:6px;padding:2px 7px;font-size:11px;cursor:pointer}' +
    '.hl-k{color:#569CD6}.hl-s{color:#CE9178}.hl-c{color:#6A9955;font-style:italic}.hl-n{color:#B5CEA8}.hl-f{color:#DCDCAA}.hl-t{color:#569CD6}.hl-a{color:#9CDCFE}.hl-p{color:#9CDCFE}' +
    '.quick-reacts{display:flex;justify-content:space-around;align-items:center;gap:4px;padding:10px 8px;margin-bottom:4px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));font-size:22px}' +
    '.quick-reacts span{cursor:pointer;transition:transform .12s;padding:4px 6px;border-radius:8px;line-height:1}' +
    '.quick-reacts span:hover{transform:scale(1.3);background:rgba(255,255,255,.08)}' +
    '@media(hover:none){.msg-actions{display:none!important}}' +
    '#profile-popup{width:320px;max-width:92vw;padding:0;background:transparent;border:none;box-shadow:none}' +
    '#profile-popup .pf-card{width:100%}';
document.head.appendChild(st);
}
function snowflakeDate(id) {
  try {
    var ms = Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000));
    return new Date(ms);
  } catch (e) { return null; }
}
function sameGroup(prev, cur) {
  if (!prev || prev.author_id !== cur.author_id) return false;
  if (cur.reply_ref || cur.reply_to) return false;
  var dp = snowflakeDate(prev.id);
  var dc = snowflakeDate(cur.id);
  if (!dp || !dc) return false;
  if (dp.toDateString() !== dc.toDateString()) return false;
  return (dc - dp) < 420000;
}
function renderMessagesGrouped(msgs, lastSeenId) {
  ensureChatStyles();
  var html = '';
  var prev = null;
  var prevDay = '';
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var d = snowflakeDate(m.id);
    var day = d ? d.toDateString() : '';
    if (d && day !== prevDay) {
      html += '<div class="date-divider">' + d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + '</div>';
    }
    if (day) prevDay = day;
    if (lastSeenId && prev && prev.id === lastSeenId) html += '<div class="new-divider">NEW</div>';
    html += renderMessage(m, prev);
    prev = m;
  }
  return html;
}
function renderMessage(m, prev) {
  ensureChatStyles();
  const compact = !!prev && sameGroup(prev, m);
  var isOwn = !!(AppState.botInfo && m.author_id === AppState.botInfo.id);
  const name = esc(m.display_name || m.author);
  const avatarSrc = m.avatar_url || '/arklum.png';
  const avatar = compact
    ? '<div class="msg-avatar-spacer"></div><span class="hover-time">' + esc((m.timestamp || '').slice(0, 5)) + '</span>'
    : '<img src="' + esc(avatarSrc) + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;cursor:pointer;" onclick="showMiniProfile(\'' + esc(m.author_id) + '\', event)" draggable="false" loading="lazy">';
  const editedTag = m.edited ? '<span style="font-size:0.65rem;color:var(--primary);">(edited)</span>' : '';
  const time = '<span style="color:var(--text-muted);font-size:0.75rem;margin-right:6px;">[' + esc(m.timestamp) + ']' + editedTag + '</span>';
  let contentHtml = '';
  if (m.segments && m.segments.length) {
    contentHtml = m.segments.map(function (seg) {
      switch (seg.type) {
        case 'text': return renderDiscordMarkdown(seg.content);
        case 'mention': return '<span style="background:rgba(0,212,170,0.15);border-radius:4px;padding:0 2px;cursor:pointer;" onclick="insertMention(\'' + esc(seg.user_id) + '\')">@' + esc(seg.display) + '</span>';
        case 'role': { const colorHex = seg.color ? '#' + seg.color.toString(16).padStart(6, '0') : 'var(--primary)'; return '<span style="color:' + colorHex + ';background:rgba(74,74,255,0.1);border-radius:4px;padding:0 2px;">' + esc(seg.name) + '</span>'; }
        case 'channel': return '<span style="background:rgba(0,212,170,0.15);border-radius:4px;padding:0 2px;">#' + esc(seg.name) + '</span>';
        case 'emoji': return '<img src="'+esc(seg.url)+'" alt=":'+esc(seg.name)+':" style="height:1.4em; width:auto; vertical-align:bottom;" draggable="false" loading="lazy" onerror="this.style.display=\'none\'">';
        default: return esc(seg.content || '');
      }
    }).join('');
  } else { contentHtml = renderDiscordMarkdown(m.content_raw || ''); }
  let embedHtml = ''; if (Array.isArray(m.embeds) && m.embeds.length) embedHtml = m.embeds.map(renderEmbed).join('');
  let attachmentHtml = renderAttachments(m.attachments);
  let stickerHtml = ''; if (Array.isArray(m.stickers) && m.stickers.length) { stickerHtml = m.stickers.map(function (s) { return '<img src="' + esc(s.url) + '" alt="' + esc(s.filename) + '" style="max-width:160px;border-radius:4px;margin-top:4px;" draggable="false" loading="lazy">'; }).join(''); }
  let replyRefHtml = ''; if (m.reply_ref) { replyRefHtml = '<div class="reply-reference" style="font-size:0.75rem; color:var(--primary); border-left:3px solid var(--primary); padding-left:8px; margin-bottom:4px; opacity:0.8;">Replying to <strong>' + esc(m.reply_ref.author) + '</strong>: ' + esc(m.reply_ref.content) + '</div>'; }
  let reactionsHtml = ''; if (Array.isArray(m.reactions) && m.reactions.length) { reactionsHtml = '<div class="reactions-container" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">' + m.reactions.map(function (r) { let emojiDisplay = r.emoji_name; if (r.emoji_id) { emojiDisplay = '<img src="https://cdn.discordapp.com/emojis/' + r.emoji_id + '.png" style="width:16px;height:16px;vertical-align:middle;" draggable="false" loading="lazy">'; } return '<span class="reaction-chip" data-emoji-name="' + r.emoji_name + '" style="display:inline-flex;align-items:center;gap:2px;padding:2px 6px;background:rgba(255,255,255,0.08);border:1px solid var(--glass-border);border-radius:8px;font-size:0.75rem;cursor:pointer;">' + emojiDisplay + '<span class="reaction-count">' + r.count + '</span></span>'; }).join('') + '</div>'; }
  return '<div class="message-wrapper' + (compact ? ' msg-compact' : '') + '"' + (m.temp ? ' data-temp="true"' : '') + ' data-msg-id="' + m.id + '" data-author-id="' + m.author_id + '" style="position:relative; overflow:hidden; cursor:pointer; border-radius:8px; padding:4px; margin:0 -4px; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;">' +
    '<div class="swipe-indicator" style="position:absolute; top:0; left:0; height:100%; width:0; background:var(--primary); opacity:0.3; transition:width 0.1s linear; border-radius:4px 0 0 4px; pointer-events:none;"></div>' +
    (HAS_HOVER ? '<div class="msg-actions">' +
    ' <button title="React" onclick="event.stopPropagation();openReactionPicker(\'' + m.id + '\')">' + arkIcon('react') + '</button>' +
    ' <button title="Reply" onclick="event.stopPropagation();setReplyTarget(\'' + m.id + '\')">' + arkIcon('reply') + '</button>' +
    (isOwn ? ' <button title="Edit" onclick="event.stopPropagation();editMessage(\'' + m.id + '\')">' + arkIcon('edit') + '</button>' : '') +
    ' <button title="Copy Text" onclick="event.stopPropagation();copyText(\'' + m.id + '\')">' + arkIcon('copy') + '</button>' +
    '</div>' : '') +
    '<div class="message-content" style="font-size:0.9rem; display:flex; gap:10px;">' +
    avatar +
    '<div style="flex:1;min-width:0;">' +
    (compact ? '' : '<div style="display:flex;align-items:baseline;gap:8px;"><strong style="cursor:pointer;" onclick="showMiniProfile(\'' + esc(m.author_id) + '\', event)">' + name + '</strong>' + time + '</div>') +
    replyRefHtml +
    '<div class="msg-text">' + contentHtml + '</div>' +
    embedHtml +
    attachmentHtml +
    stickerHtml +
    reactionsHtml +
    '</div>' +
    '</div>' +
    '</div>';
}
function renderEmbed(embed) {
  let html = '<div class="embed-card" style="background:rgba(0,0,0,0.25); border-left:4px solid ' + (embed.color ? '#' + embed.color.toString(16).padStart(6, '0') : 'var(--primary)') + '; border-radius:6px; padding:10px; margin-top:8px; color:var(--text);">';
  if (embed.author) {
    html += '<div class="embed-author" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
    if (embed.author.icon_url) html += '<img src="' + esc(embed.author.icon_url) + '" style="width:22px;height:22px;border-radius:50%;" draggable="false" loading="lazy">';
    html += '<span style="font-size:0.85rem;font-weight:600;">' + renderDiscordMarkdown(embed.author.name) + '</span>';
    if (embed.author.url) html = '<a href="' + esc(embed.author.url) + '" target="_blank" style="text-decoration:none;color:inherit;">' + html + '</a>';
    html += '</div>';
  }
  if (embed.title) {
    html += '<div class="embed-title" style="font-weight:600;margin-bottom:4px;">';
    if (embed.url) html += '<a href="' + esc(embed.url) + '" target="_blank" style="color:var(--primary);text-decoration:none;">' + renderDiscordMarkdown(embed.title) + '</a>';
    else html += renderDiscordMarkdown(embed.title);
    html += '</div>';
  }
  if (embed.description) html += '<div class="embed-description" style="font-size:0.85rem;white-space:pre-wrap;margin-bottom:8px;">' + renderDiscordMarkdown(embed.description) + '</div>';
  if (embed.fields && embed.fields.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:8px;">';
    embed.fields.forEach(function (f) {
      html += '<div style="flex:1 1 40%;min-width:120px;"><div style="font-weight:700;font-size:0.8rem;">' + renderDiscordMarkdown(f.name) + '</div><div style="font-size:0.8rem;white-space:pre-wrap;">' + renderDiscordMarkdown(f.value) + '</div></div>';
    });
    html += '</div>';
  }
  if (embed.image && embed.image.url) html += ambientGlowImage(embed.image.url, 'max-width:100%; border-radius:8px; margin-top:4px;');
  if (embed.thumbnail && embed.thumbnail.url) html += ambientGlowImage(embed.thumbnail.url, 'max-width:80px; max-height:80px; border-radius:8px; margin-top:4px;');
  if (embed.footer) {
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:0.75rem;color:var(--primary);">';
    if (embed.footer.icon_url) html += '<img src="' + esc(embed.footer.icon_url) + '" style="width:18px;height:18px;border-radius:50%;" draggable="false" loading="lazy">';
    html += '<span>' + renderDiscordMarkdown(embed.footer.text) + '</span>';
    html += '</div>';
  }
  if (embed.timestamp) html += '<div style="font-size:0.7rem;color:var(--primary);margin-top:4px;">' + esc(embed.timestamp) + '</div>';
  html += '</div>';
  return html;
}
function ambientGlowImage(src, style, onclick, fit) {
  if (!src) return '';
  const f = fit || 'cover';
  const clickAttr = onclick ? `onclick="${onclick}"` : '';
  return '<div style="position:relative; display:block; width:100%; height:100%; overflow:hidden; cursor:pointer;' + style + '"' + clickAttr + '>' +
    '<img src="' + src + '" style="width:100%; height:100%; object-fit:' + f + '; position:relative; z-index:1;" draggable="false" loading="lazy">' +
    '<img src="' + src + '" aria-hidden="true" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(24px) saturate(150%); opacity:0.6; pointer-events:none; z-index:0;" draggable="false" loading="lazy">' +
    '</div>';
}
function compressImage(file, maxWidth = 1280, maxHeight = 720, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;
      if (width <= maxWidth && height <= maxHeight) { resolve(file); return; }
      if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
      if (height > maxHeight) { width = Math.round((maxHeight / height) * width); height = maxHeight; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        else resolve(file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
async function processFile(file) {
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const b64 = ev.target.result.split(',')[1];
        socket.emit('upload_file', { filename: file.name, data: b64 });
        socket.once('file_compressed', (result) => { resolve({ filename: result.filename, data: result.data }); });
      };
      reader.readAsDataURL(file);
    });
  } else {
    const compressed = await compressImage(file);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (ev) { resolve({ filename: file.name, data: ev.target.result.split(',')[1] }); };
      reader.readAsDataURL(compressed);
    });
  }
}

function splitLongText(text, limit) {
  if (!text || text.length <= limit) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(' ', limit);
    if (cut < limit / 2) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  let content = input.value.trim();
  if (window.mentionTokens) {
    for (const key in window.mentionTokens) {
      content = content.split(key).join(window.mentionTokens[key]);
    }
  }
  if (window.channelTokens) {
    for (const key in window.channelTokens) {
      content = content.split(key).join(window.channelTokens[key]);
    }
  }
  const MAX_FILES_PER_MSG = 10;
  if (!content && (!window.pendingAttachments || window.pendingAttachments.length === 0)) return;
  if (AppState.editTarget) {
    socket.emit('edit_message', { channel_id: AppState.activeChatChannel || AppState.activeDmChannel, message_id: AppState.editTarget, content });
    AppState.editTarget = null;
    pushNotification('Message edited', '', 'success', 2000);
    input.value = '';
    return;
  }
  const channelId = AppState.activeChatChannel || AppState.activeDmChannel;
  if (!channelId) { pushNotification('Select a channel first', '', 'warning', 2000); return; }
  const payloadBase = { content };
  if (AppState.replyTarget) payloadBase.reply_to = AppState.replyTarget;
  const files = window.pendingAttachments || [];
  window.pendingAttachments = [];
  if (AppState.replyTarget) { AppState.replyTarget = null; cancelReply(); }
  const sendOne = (payload) => { socket.emit(AppState.activeChatChannel ? 'send_chat_message' : 'send_dm_message', payload); };
  const insertTemp = (text) => {
    const now = new Date();
    const tempMsg = {
      temp: true,
      author_id: AppState.botInfo ? AppState.botInfo.id : '0',
      author: AppState.botInfo ? AppState.botInfo.name : 'Bot',
      display_name: AppState.botInfo ? AppState.botInfo.name : 'Bot',
      avatar_url: AppState.botInfo ? AppState.botInfo.avatar_url : null,
      content_raw: text,
      segments: [{ type: 'text', content: text }],
      timestamp: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0'),
      id: 'local-' + Date.now(),
      attachments: [], embeds: [], stickers: [], reactions: [], edited: false
    };
    if (!messageCache[channelId]) messageCache[channelId] = [];
    messageCache[channelId].push(tempMsg);
    const container = document.getElementById('chat-messages-list');
    if (container) {
      var _prev = messageCache[channelId].slice(-2)[0] || null;
      container.insertAdjacentHTML('beforeend', renderMessage(tempMsg, _prev));
      container.scrollTop = container.scrollHeight;
    }
  };
  if (files.length === 0) {
    const chunks = splitLongText(content, 1900);
    if (chunks.length > 1) pushNotification('Long message split into ' + chunks.length + ' parts', '', 'info', 2000);
    chunks.forEach(function (part, idx) {
      const payload = { channel_id: channelId, content: part };
      if (idx === 0 && payloadBase.reply_to) payload.reply_to = payloadBase.reply_to;
      sendOne(payload);
      insertTemp(part);
    });
  } else {
    (async function () {
      const validFiles = [];
      for (const file of files) {
        const processed = await processFile(file);
        validFiles.push(processed);
      }
      if (validFiles.length === 0 && !content) return;
      const batches = [];
      for (let i = 0; i < validFiles.length; i += MAX_FILES_PER_MSG) batches.push(validFiles.slice(i, i + MAX_FILES_PER_MSG));
      if (batches.length > 1) pushNotification('Sending ' + validFiles.length + ' files in ' + batches.length + ' messages…', '', 'info', 2000);
      let firstBatch = true;
      for (const batch of batches) {
        const payload = { channel_id: channelId, ...payloadBase, attachments: [] };
        for (const file of batch) payload.attachments.push(file);
        sendOne(payload);
        if (firstBatch) { insertTemp(content); firstBatch = false; }
      }
    })();
  }
  input.value = '';
  cancelReply();
  const previewContainer = document.getElementById('attachment-previews');
  if (previewContainer) previewContainer.innerHTML = '';
}

function showJumpPill(count) {
  var pill = document.getElementById('jump-present');
  if (!pill) return;
  var badge = document.getElementById('jump-count');
  if (badge) badge.textContent = count > 0 ? String(count) : '';
  pill.style.display = 'flex';
}
function hideJumpPill() {
  unseenCount = 0;
  var pill = document.getElementById('jump-present');
  if (pill) pill.style.display = 'none';
}
function jumpToPresent() {
  var mList = document.getElementById('chat-messages-list');
  if (mList) mList.scrollTo({ top: mList.scrollHeight, behavior: 'smooth' });
  hideJumpPill();
}

function setReplyTarget(msgId) {
  AppState.replyTarget = msgId;
  const msgEl = document.querySelector('.message-wrapper[data-msg-id="' + msgId + '"]');
  let author = '', text = '';
  if (msgEl) {
    author = (msgEl.querySelector('strong') ? msgEl.querySelector('strong').textContent : '').trim();
    text = (msgEl.querySelector('.msg-text') ? msgEl.querySelector('.msg-text').textContent : '').trim().substring(0, 50);
  }
  if (!author && !text) { cancelReply(); return; }
  const preview = (author ? author + ': ' : '') + (text || '…');
  const previewEl = document.getElementById('reply-preview');
  const textEl = document.getElementById('reply-text');
  if (previewEl && textEl) { textEl.textContent = preview; previewEl.style.display = 'flex'; }
  const input = document.getElementById('chat-input');
  if (input) input.focus();
}

function cancelReply() {
  AppState.replyTarget = null;
  const preview = document.getElementById('reply-preview');
  const textEl = document.getElementById('reply-text');
  if (textEl) textEl.textContent = '';
  if (preview) preview.style.display = 'none';
}

function editMessage(msgId) {
  AppState.editTarget = msgId;
  const msgEl = document.querySelector('.message-wrapper[data-msg-id="' + msgId + '"]');
  if (!msgEl) return;
  const text = msgEl.querySelector('.msg-text') ? msgEl.querySelector('.msg-text').textContent : '';
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; input.focus(); }
  pushNotification('Editing - press Enter to save', '', 'info', 2000);
}
function showMiniProfile(userId, event) {
  const popup = document.getElementById('profile-popup');
  if (!popup) return;
  currentProfileUserId = userId;
  ensureProfileStyles();
  const member = (AppState.serverData && AppState.serverData.members)
    ? AppState.serverData.members.find(m => m.id === userId)
    : null;
  const statusColor = member ? getStatusColor(member.status) : 'gray';
  popup.innerHTML =
    '<div class="pf-card">' +
      '<div id="profile-banner" class="pf-banner"></div>' +
      '<div class="pf-body">' +
        '<div class="pf-avatar-wrap">' +
          '<img id="profile-avatar" src="' + (member ? (member.avatar_url || '/arklum.png') : '/arklum.png') + '" alt="" draggable="false">' +
          '<img id="profile-deco" src="" alt="" style="display:none;" draggable="false">' +
          '<span id="profile-status-dot" class="pf-dot" style="background:' + statusColor + ';"></span>' +
        '</div>' +
        '<div class="pf-idrow">' +
          '<span id="pf-nameplate"><span id="profile-name">' + (member ? esc(member.name) : '') + '</span></span>' +
          '<span id="profile-username" class="pf-username">' + (member ? '@' + esc(member.username) : '') + '</span>' +
        '</div>' +
        '<div id="profile-badges" class="pf-badges"></div>' +
        '<div class="pf-tabs">' +
          '<button class="pf-tab active" onclick="pfSwitchTab(\'about\')">About</button>' +
          '<button class="pf-tab" onclick="pfSwitchTab(\'server\')">Server</button>' +
        '</div>' +
        '<div id="pf-about" class="pf-section">' +
          '<div id="profile-custom-status" class="pf-custom">' + (member && member.custom_status ? esc(member.custom_status) : '') + '</div>' +
          '<div id="profile-bio" class="pf-bio" style="display:none;"></div>' +
          '<div id="profile-dates" class="pf-dates"></div>' +
        '</div>' +
        '<div id="pf-server" class="pf-section" style="display:none;">' +
          '<div id="profile-nick" class="pf-nick"></div>' +
          '<div id="profile-roles" class="pf-roles"></div>' +
        '</div>' +
        '<div class="pf-actions">' +
          '<button id="profile-mention-btn" class="secondary-btn" title="Mention">@</button>' +
          ' <button id="profile-dm-btn" class="secondary-btn" title="Message">' + arkIcon('chat') + '</button>' +
          ' <button class="secondary-btn" title="Copy ID" onclick="copyToClipboard(\'' + userId + '\')">' + arkIcon('copy') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  const mentionBtn = document.getElementById('profile-mention-btn');
  const dmBtn = document.getElementById('profile-dm-btn');
  if (mentionBtn) mentionBtn.onclick = function () { insertMention(userId); hideProfilePopup(); };
  if (dmBtn) dmBtn.onclick = function () { openDm(userId); hideProfilePopup(); };
  const trigger = event.target;
  const wrapper = trigger.closest('.message-wrapper') || trigger.closest('.member-item');
  if (wrapper) {
    if (popup.parentElement && popup.parentElement !== document.body) {
      popup.parentElement.classList.remove('popup-open');
      document.body.appendChild(popup);
    }
    const rect = trigger.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const relX = rect.left - wrapperRect.left;
    const relY = rect.bottom - wrapperRect.top;
    popup.style.position = 'absolute';
    popup.style.left = Math.min(relX, wrapperRect.width - 320) + 'px';
    popup.style.top = relY + 5 + 'px';
    popup.style.display = 'block';
    wrapper.appendChild(popup);
    wrapper.classList.add('popup-open');
  } else {
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.display = 'block';
    document.body.appendChild(popup);
  }
  socket.emit('run_command', { cmd: 'fetch_user_profile', params: { user_id: userId, guild_id: AppState.currentGuild } });
  socket.emit('run_command', { cmd: 'fetch_user_profile_full', params: { user_id: userId, guild_id: AppState.currentGuild } });
}
function openDm(userId) {
  if (AppState.currentPage !== 'chat') {
    navigate('chat');
    setTimeout(function () { socket.emit('open_dm', { user_id: userId }); }, 100);
    saveAppState();
    return;
  }
  socket.emit('open_dm', { user_id: userId });
  saveAppState();
  localStorage.setItem('lastChatDM', JSON.stringify({ id: userId, display_name: 'DM' }));
  localStorage.removeItem('lastChatChannel');
}
socket.on('user_profile', function (data) {
  if (!currentProfileUserId || data.id !== currentProfileUserId) return;
  var el = function (id) { return document.getElementById(id); };
  var bannerEl = el('profile-banner');
  if (bannerEl) {
    if (data.banner_url) {
      bannerEl.style.backgroundImage = 'url(' + esc(data.banner_url) + ')';
      bannerEl.style.backgroundColor = '';
    } else if (data.accent_color) {
      var col = '#' + data.accent_color.toString(16).padStart(6, '0');
      bannerEl.style.backgroundImage = 'linear-gradient(135deg, ' + col + ', ' + adjustColor(col, -30) + ')';
      bannerEl.style.backgroundColor = '';
    } else {
      bannerEl.style.backgroundImage = 'linear-gradient(135deg, var(--primary), #3a1a1a)';
      bannerEl.style.backgroundColor = '';
    }
  }
  var bioEl = el('profile-bio');
  if (bioEl) {
    if (data.bio) { bioEl.textContent = data.bio; bioEl.style.display = 'block'; }
    else { bioEl.style.display = 'none'; }
  }
  var rolesContainer = el('profile-roles');
  if (rolesContainer && data.roles && data.roles.length) {
    rolesContainer.innerHTML = data.roles.map(function (r) {
      var colorHex = '#' + (r.color || 0).toString(16).padStart(6, '0');
      return '<span class="role-pill" style="background:' + colorHex + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75rem;">' + esc(r.name) + '</span>';
    }).join('');
  }
  var dotEl = el('profile-status-dot');
  if (data.status && dotEl) dotEl.style.background = getStatusColor(data.status);
  var stText = el('profile-status-text');
  if (data.status && stText) stText.textContent = data.status;
  var csEl = el('profile-custom-status');
  if (data.custom_status && csEl) csEl.textContent = data.custom_status;
});

const PF_BADGE_MAP = {
  Staff: { l: 'STAFF', c: '#5865F2' },
  Partner: { l: 'PARTNER', c: '#5865F2' },
  Hypesquad: { l: 'HYPESQUAD', c: '#F47FFF' },
  HypeSquadOnlineHouse1: { l: 'BRAVERY', c: '#F47B7B' },
  HypeSquadOnlineHouse2: { l: 'BRILLIANCE', c: '#FBD44C' },
  HypeSquadOnlineHouse3: { l: 'BALANCE', c: '#45D6B5' },
  BugHunterLevel1: { l: 'BUG HUNTER', c: '#78D44A' },
  BugHunterLevel2: { l: 'BUG HUNTER II', c: '#78D44A' },
  PremiumEarlySupporter: { l: 'EARLY SUPPORTER', c: '#F47FFF' },
  VerifiedDeveloper: { l: 'VERIFIED DEV', c: '#5865F2' },
  CertifiedModerator: { l: 'MODERATOR', c: '#5865F2' },
  ActiveDeveloper: { l: 'ACTIVE DEV', c: '#5865F2' }
};
function ensureProfileStyles() {
  if (document.getElementById('ns-profile-styles')) return;
  var st = document.createElement('style');
  st.id = 'ns-profile-styles';
  st.textContent =
    '#profile-popup .pf-card{width:300px;max-width:90vw;background:#12141f;border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.5)}' +
    '.pf-banner{height:74px;background:linear-gradient(135deg,var(--primary,#454af8),#1a1c72);background-size:cover;background-position:center}' +
    '.pf-body{padding:0 14px 12px}' +
    '.pf-avatar-wrap{position:relative;width:68px;height:68px;margin-top:-34px;border-radius:50%;box-shadow:0 0 0 4px #12141f}' +
    '.pf-avatar-wrap img#profile-avatar{width:68px;height:68px;border-radius:50%;object-fit:cover}' +
    '#profile-deco{position:absolute;inset:-8px;width:84px;height:84px;pointer-events:none}' +
    '.pf-dot{position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:50%;border:3px solid #12141f}' +
    '.pf-idrow{margin-top:6px}' +
    '#pf-nameplate{display:inline-block;font-weight:800;font-size:1.05rem}' +
    '.pf-username{display:block;color:var(--text-muted,#8b90a8);font-size:.8rem;margin-top:2px}' +
    '.pf-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}' +
    '.pf-badge{background:rgba(255,255,255,.06);border:1px solid var(--bc,#5865F2);color:var(--bc,#5865F2);font:700 9px monospace;letter-spacing:.5px;padding:2px 7px;border-radius:999px}' +
    '.pf-tabs{display:flex;gap:4px;margin:10px 0 6px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1))}' +
    '.pf-tab{flex:1;background:none;border:none;color:var(--text-muted,#8b90a8);font:700 11px system-ui;padding:6px 0;cursor:pointer;border-bottom:2px solid transparent}' +
    '.pf-tab.active{color:var(--primary,#454af8);border-bottom-color:var(--primary,#454af8)}' +
    '.pf-section{padding:6px 0}' +
    '.pf-custom{font-size:.8rem;color:var(--primary,#454af8);margin-bottom:4px}' +
    '.pf-bio{font-size:.8rem;color:var(--text,#fff);white-space:pre-wrap}' +
    '.pf-dates{margin-top:6px;font:600 9px monospace;color:var(--text-muted,#8b90a8);display:flex;flex-direction:column;gap:2px}' +
    '.pf-nick{font-size:.8rem;margin-bottom:6px;color:var(--text,#fff)}' +
    '.pf-roles{display:flex;flex-wrap:wrap;gap:4px}' +
    '.pf-actions{display:flex;gap:6px;margin-top:10px}' +
    '.pf-actions button{flex:1}' +
    '#profile-popup{width:320px;max-width:92vw;padding:0;background:transparent;border:none;box-shadow:none}' +
    '#profile-popup .pf-card{width:100%}';
document.head.appendChild(st);
}
function pfSwitchTab(tab) {
  var about = document.getElementById('pf-about');
  var server = document.getElementById('pf-server');
  if (!about || !server) return;
  about.style.display = tab === 'about' ? 'block' : 'none';
  server.style.display = tab === 'server' ? 'block' : 'none';
  document.querySelectorAll('.pf-tab').forEach(function (t) {
    t.classList.toggle('active', (tab === 'about' && t.textContent === 'About') || (tab === 'server' && t.textContent === 'Server'));
  });
}
socket.on('user_profile_full', function (d) {
  if (!currentProfileUserId || d.id !== currentProfileUserId) return;
  var el = function (id) { return document.getElementById(id); };
  var BADGE_LABELS = {
    Staff: ['STAFF', '#5865F2'],
    Partner: ['PARTNER', '#5865F2'],
    Hypesquad: ['HYPESQUAD', '#F47FFF'],
    HypeSquadOnlineHouse1: ['BRAVERY', '#F47B7B'],
    HypeSquadOnlineHouse2: ['BRILLIANCE', '#FBD44C'],
    HypeSquadOnlineHouse3: ['BALANCE', '#45D6B5'],
    BugHunterLevel1: ['BUG HUNTER', '#78D44A'],
    BugHunterLevel2: ['BUG HUNTER II', '#78D44A'],
    PremiumEarlySupporter: ['EARLY SUPPORTER', '#F47FFF'],
    VerifiedDeveloper: ['VERIFIED DEV', '#5865F2'],
    CertifiedModerator: ['MODERATOR', '#5865F2'],
    ActiveDeveloper: ['ACTIVE DEV', '#5865F2']
  };
  var bannerEl = el('profile-banner');
  if (bannerEl) {
    if (d.banner_url) {
      bannerEl.style.backgroundImage = 'url(' + d.banner_url + ')';
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
    } else if (d.accent_color) {
      var col = '#' + Number(d.accent_color).toString(16).padStart(6, '0');
      bannerEl.style.backgroundImage = 'linear-gradient(135deg,' + col + ',' + adjustColor(col, -30) + ')';
    }
  }
  var nameEl = el('profile-name');
  if (nameEl && d.display_name) nameEl.textContent = d.display_name;
  var unameEl = el('profile-username');
  if (unameEl && d.username) unameEl.textContent = '@' + d.username;
  var avEl = el('profile-avatar');
  if (avEl && d.avatar_url) avEl.src = d.avatar_url;
  var decoEl = el('profile-deco');
  if (decoEl && d.decoration_url) { decoEl.src = d.decoration_url; decoEl.style.display = 'block'; }
  var badgesEl = el('profile-badges');
  if (badgesEl) {
    var chips = [];
    if (d.nitro) chips.push(['<svg viewBox="0 0 24 24" width="11" height="11" style="vertical-align:-2px;margin-right:4px;"><path fill="currentColor" d="M12 1.5c.4 2.9 1.4 5.2 3.3 7.1 1.9 1.9 4.3 3 7.2 3.4-2.9.4-5.3 1.5-7.2 3.4-1.9 1.9-2.9 4.2-3.3 7.1-.4-2.9-1.4-5.2-3.3-7.1-1.9-1.9-4.3-3-7.2-3.4 2.9-.4 5.3-1.5 7.2-3.4 1.9-1.9 2.9-4.2 3.3-7.1z"/></svg>NITRO', '#F47FFF']);
    if (d.bot) chips.push(['BOT', '#5865F2']);
    (d.badges || []).forEach(function (f) { if (BADGE_LABELS[f]) chips.push(BADGE_LABELS[f]); });
    if (d.member && d.member.boost_since) chips.push(['BOOSTER', '#F47FFF']);
    badgesEl.innerHTML = chips.map(function (c) {
      return '<span style="background:rgba(255,255,255,.06);border:1px solid ' + c[1] + ';color:' + c[1] + ';font:700 9px monospace;letter-spacing:.5px;padding:2px 7px;border-radius:999px;">' + c[0] + '</span>';
    }).join('');
  }
  if (d.nameplate && d.nameplate.palette && nameEl) {
    var p = d.nameplate.palette;
    var cols = [p.primary, p.secondary, p.tertiary].filter(Boolean);
    if (cols.length) {
      nameEl.style.background = 'linear-gradient(90deg,' + cols.join(',') + ')';
      nameEl.style.webkitBackgroundClip = 'text';
      nameEl.style.backgroundClip = 'text';
      nameEl.style.color = 'transparent';
    }
  }
  var datesEl = el('profile-dates');
  if (datesEl) {
    var fmt = function (iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
    var h = '';
    if (d.created_at) h += '<span>DISCORD MEMBER SINCE ' + fmt(d.created_at) + '</span>';
    if (d.member && d.member.joined_at) h += '<span>SERVER MEMBER SINCE ' + fmt(d.member.joined_at) + '</span>';
    if (d.member && d.member.boost_since) h += '<span>BOOSTING SINCE ' + fmt(d.member.boost_since) + '</span>';
    datesEl.innerHTML = h;
  }
  var nickEl = el('profile-nick');
  if (nickEl && d.member && d.member.nick) nickEl.textContent = 'Nickname: ' + d.member.nick;
});

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) + amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) + amt);
  const B = Math.max(0, (num & 0x0000FF) + amt);
  return '#' + (R << 16 | G << 8 | B).toString(16).padStart(6, '0');
}
function hideProfilePopup() {
  const p = document.getElementById('profile-popup');
  if (p) {
    p.style.display = 'none';
    if (p.parentElement) {
      p.parentElement.classList.remove('popup-open');
      document.body.appendChild(p);
    }
  }
}
function insertMention(userId, startIndex, displayName) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const mem = (AppState.serverData && AppState.serverData.members || []).find(function (x) { return x.id === userId; });
  const name = displayName || (mem ? mem.name : 'user-' + userId);
  const pos = input.selectionStart != null ? input.selectionStart : input.value.length;
  let start = (typeof startIndex === 'number' && startIndex >= 0) ? startIndex : -1;
  if (start < 0 || input.value.charAt(start) !== '@') {
    const m = input.value.substring(0, pos).match(/@(\S*)$/);
    start = m ? m.index : pos;
  }
  const token = '@' + name + ' ';
  if (!window.mentionTokens) window.mentionTokens = {};
  window.mentionTokens['@' + name] = '<@' + userId + '>';
  input.value = input.value.substring(0, start) + token + input.value.substring(pos);
  const newPos = start + token.length;
  input.selectionStart = input.selectionEnd = newPos;
  hideMentionPopup();
  input.focus();
}

function insertRoleMention(roleId, startIndex) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const role = (AppState.serverData && AppState.serverData.roles || []).find(function (r) { return r.id === roleId; });
  const name = role ? role.name : 'role-' + roleId;
  const pos = input.selectionStart != null ? input.selectionStart : input.value.length;
  let start = (typeof startIndex === 'number' && startIndex >= 0) ? startIndex : -1;
  if (start < 0 || input.value.charAt(start) !== '@') {
    const m = input.value.substring(0, pos).match(/@(\S*)$/);
    start = m ? m.index : pos;
  }
  const token = '@' + name + ' ';
  if (!window.mentionTokens) window.mentionTokens = {};
  window.mentionTokens['@' + name] = '<@&' + roleId + '>';
  input.value = input.value.substring(0, start) + token + input.value.substring(pos);
  const newPos = start + token.length;
  input.selectionStart = input.selectionEnd = newPos;
  hideMentionPopup();
  input.focus();
}

let channelPopupVisible = false, channelSelectedIndex = -1, channelPopupItems = [];
let emojiAcPopupVisible = false, emojiAcSelectedIndex = -1, emojiAcPopupItems = [];
const EMOJI_SHORTCODES = {
  'grinning': '😀', 'smiley': '😃', 'smile': '😄', 'grin': '😁', 'laughing': '😆', 'sweat_smile': '😅', 'joy': '😂', 'rofl': '🤣', 'wink': '😉', 'blush': '😊', 'yum': '😋', 'heart_eyes': '😍', 'kissing_heart': '😘', 'thinking': '🤔', 'neutral_face': '😐', 'rolling_eyes': '🙄', 'hushed': '😯', 'surprised': '😮', 'frowning': '😦', 'pensive': '😔', 'worried': '😟', 'cry': '😢', 'sob': '😭', 'angry': '😠', 'rage': '😡', 'skull': '💀', 'poop': '💩', 'clown': '🤡', 'ghost': '👻', 'alien': '👽', 'robot': '🤖', 'heart': '❤️', 'broken_heart': '💔', 'fire': '🔥', 'star': '⭐', 'sparkles': '✨', '100': '💯', 'thumbsup': '👍', 'thumbsdown': '👎', 'clap': '👏', 'pray': '🙏', 'wave': '👋', 'ok_hand': '👌', 'v': '✌️', 'muscle': '💪', 'eyes': '👀'
};
function ensureExtraPopups() {
  ['channel-popup', 'emoji-popup'].forEach(function (id) {
    if (!document.getElementById(id)) {
      var p = document.createElement('div');
      p.id = id;
      p.style.cssText = 'position:fixed;display:none;background:var(--glass-bg,#12141f);backdrop-filter:blur(20px);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:10px;max-height:220px;overflow-y:auto;z-index:9999;';
      document.body.appendChild(p);
    }
  });
}
function positionPopupAboveInput(popup) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const rect = input.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.width = rect.width + 'px';
  popup.style.top = (rect.top - popup.offsetHeight - 8) + 'px';
}
function hideChannelPopup() { const p = document.getElementById('channel-popup'); if (p) p.style.display = 'none'; channelPopupVisible = false; channelSelectedIndex = -1; }
function hideEmojiAcPopup() { const p = document.getElementById('emoji-popup'); if (p) p.style.display = 'none'; emojiAcPopupVisible = false; emojiAcSelectedIndex = -1; }
function updateExtraPopupSelection(isChannel) {
  const popup = document.getElementById(isChannel ? 'channel-popup' : 'emoji-popup');
  if (!popup) return;
  const idx = isChannel ? channelSelectedIndex : emojiAcSelectedIndex;
  popup.querySelectorAll('.mention-popup-item').forEach(function (it, i) { it.classList.toggle('active', i === idx); });
}
function showChannelPopup(filterText) {
  ensureExtraPopups();
  const popup = document.getElementById('channel-popup');
  const input = document.getElementById('chat-input');
  if (!popup || !input || !AppState.serverData) return;
  const chans = (AppState.serverData.channels || []).filter(function (c) {
    return c.type !== 'voice' && c.name.toLowerCase().includes((filterText || '').toLowerCase());
  }).slice(0, 8);
  if (!chans.length) { hideChannelPopup(); return; }
  const before = input.value.substring(0, input.selectionStart);
  const m = before.match(/#([\w-]*)$/);
  popup.dataset.startIndex = m ? m.index : input.selectionStart;
  channelPopupItems = chans;
  channelSelectedIndex = 0;
  popup.innerHTML = chans.map(function (c, i) {
    return '<div class="mention-popup-item' + (i === 0 ? ' active' : '') + '" data-channel-id="' + c.id + '" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--text,#fff);"><span style="color:var(--primary,#454af8);font-weight:700;">#</span><span>' + esc(c.name) + '</span></div>';
  }).join('');
  popup.style.display = 'block';
  channelPopupVisible = true;
  positionPopupAboveInput(popup);
  popup.querySelectorAll('.mention-popup-item').forEach(function (item) {
    item.addEventListener('click', function () { insertChannelMention(this.dataset.channelId); });
  });
}
function insertChannelMention(id) {
  const input = document.getElementById('chat-input');
  const ch = AppState.serverData && AppState.serverData.channels.find(function (c) { return c.id === id; });
  if (!input || !ch) return;
  const pos = input.selectionStart != null ? input.selectionStart : input.value.length;
  const m = input.value.substring(0, pos).match(/#([\w-]*)$/);
  const start = m ? m.index : pos;
  const token = '#' + ch.name + ' ';
  if (!window.channelTokens) window.channelTokens = {};
  window.channelTokens['#' + ch.name] = '<#' + id + '>';
  input.value = input.value.substring(0, start) + token + input.value.substring(pos);
  const np = start + token.length;
  input.selectionStart = input.selectionEnd = np;
  hideChannelPopup();
  input.focus();
}
function showEmojiAcPopup(filterText) {
  ensureExtraPopups();
  const popup = document.getElementById('emoji-popup');
  const input = document.getElementById('chat-input');
  if (!popup || !input) return;
  if (!serverEmojis.length) socket.emit('run_command', { cmd: 'server_expression_list', params: { guild_id: AppState.currentGuild } });
  const q = (filterText || '').toLowerCase();
  const items = [];
  for (const name in EMOJI_SHORTCODES) {
    if (name.includes(q)) items.push({ type: 'native', name: name, char: EMOJI_SHORTCODES[name] });
  }
  (serverEmojis || []).forEach(function (e) {
    if (e.name.toLowerCase().includes(q)) items.push({ type: 'server', name: e.name, id: e.id, url: e.url });
  });
  const sliced = items.slice(0, 8);
  if (!sliced.length) { hideEmojiAcPopup(); return; }
  const before = input.value.substring(0, input.selectionStart);
  const m = before.match(/:([a-z0-9_+-]*)$/i);
  popup.dataset.startIndex = m ? m.index : input.selectionStart;
  emojiAcPopupItems = sliced;
  emojiAcSelectedIndex = 0;
  popup.innerHTML = sliced.map(function (it, i) {
    const icon = it.type === 'native'
      ? '<span style="font-size:18px;">' + it.char + '</span>'
      : '<img src="' + esc(it.url) + '" style="width:20px;height:20px;" draggable="false" loading="lazy">';
    return '<div class="mention-popup-item' + (i === 0 ? ' active' : '') + '" data-emoji-ac-index="' + i + '" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--text,#fff);">' + icon + '<span>:' + esc(it.name) + ':</span></div>';
  }).join('');
  popup.style.display = 'block';
  emojiAcPopupVisible = true;
  positionPopupAboveInput(popup);
  popup.querySelectorAll('.mention-popup-item').forEach(function (item, i) {
    item.addEventListener('click', function () { insertEmojiAutocomplete(sliced[i]); });
  });
}
function insertEmojiAutocomplete(it) {
  const input = document.getElementById('chat-input');
  if (!input || !it) return;
  const pos = input.selectionStart != null ? input.selectionStart : input.value.length;
  const m = input.value.substring(0, pos).match(/:([a-z0-9_+-]*)$/i);
  const start = m ? m.index : pos;
  const insert = it.type === 'native' ? it.char + ' ' : '<:' + it.name + ':' + it.id + '> ';
  input.value = input.value.substring(0, start) + insert + input.value.substring(pos);
  const np = start + insert.length;
  input.selectionStart = input.selectionEnd = np;
  hideEmojiAcPopup();
  input.focus();
}

function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  if (picker.style.display === 'block') { picker.style.display = 'none'; return; }
  if (serverEmojis.length === 0) socket.emit('run_command', { cmd: 'server_expression_list', params: { guild_id: AppState.currentGuild } });
  const inputRow = document.querySelector('.chat-input-row');
  if (inputRow) {
    const rect = inputRow.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = (rect.top - 310) + 'px';
    picker.style.width = Math.min(rect.width, 320) + 'px';
  }
  picker.style.display = 'block';
  renderEmojiGrid();
}
function switchEmojiTab(tab) {
  emojiTab = tab;
  document.getElementById('emoji-tab-native').classList.toggle('active', tab === 'native');
  document.getElementById('emoji-tab-server').classList.toggle('active', tab === 'server');
  document.getElementById('emoji-grid-native').style.display = tab === 'native' ? 'flex' : 'none';
  document.getElementById('emoji-grid-server').style.display = tab === 'server' ? 'flex' : 'none';
  renderEmojiGrid();
}
function renderEmojiGrid() {
  if (emojiTab === 'native') {
    const grid = document.getElementById('emoji-grid-native');
    if (!grid) return;
    const COMMON_EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','','😎','','🤩','','😏','😒','😞','😔','😟','😕','🙁','️','😣','😖','😫','😩','🥺','','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😶‍️','😱','😨','😰','😥','😓','','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','','🤮','','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','','☠️','','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];
    grid.innerHTML = COMMON_EMOJIS.map(function (e) { return '<span style="font-size:24px; cursor:pointer; padding:4px; border-radius:6px; width:36px; height:36px; display:flex; align-items:center; justify-content:center;" onclick="insertEmoji(\'' + e + '\')">' + e + '</span>'; }).join('');
  } else {
    const grid = document.getElementById('emoji-grid-server');
    if (!grid) return;
    if (serverEmojis.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-muted);padding:10px;">No server emojis</div>';
    } else {
      grid.innerHTML = serverEmojis.map(function(e) { return '<img src="'+esc(e.url)+'" title=":'+esc(e.name)+':" onclick="insertEmoji(\'<:'+esc(e.name)+':'+e.id+'>\')" style="width:32px;height:32px;cursor:pointer; padding:2px; border-radius:6px;" draggable="false" loading="lazy" onerror="this.style.display=\'none\'">'; }).join('');
    }
  }
}
function insertEmoji(emojiStr) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const start = input.selectionStart || 0, end = input.selectionEnd || 0;
  input.value = input.value.substring(0, start) + emojiStr + input.value.substring(end);
  const newPos = start + emojiStr.length;
  input.selectionStart = input.selectionEnd = newPos;
  input.focus();
}
function showMentionPopup(filterText) {
  const popup = document.getElementById('mention-popup');
  if (!popup || !AppState.serverData || !AppState.serverData.members) return;
  const input = document.getElementById('chat-input'); if (!input) return;
  const q = (filterText || '').toLowerCase();
  const members = (AppState.serverData.members || []).filter(function (m) {
    return m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
  }).slice(0, 10);
  const roles = (AppState.serverData.roles || []).filter(function (r) {
    return r.name !== '@everyone' && r.name.toLowerCase().includes(q);
  }).slice(0, 6);
  const items = [];
  members.forEach(function (m) { items.push({ type: 'user', id: m.id, name: m.name, avatar_url: m.avatar_url }); });
  roles.forEach(function (r) { items.push({ type: 'role', id: r.id, name: r.name, color: r.color }); });
  if (items.length === 0) { popup.style.display = 'none'; mentionPopupVisible = false; return; }
  const before = input.value.substring(0, input.selectionStart);
  const match = before.match(/@(\S*)$/);
  const startIndex = match ? match.index : input.selectionStart;
  popup.dataset.startIndex = startIndex;
  mentionSelectedIndex = 0;
  mentionPopupItems = items;
  popup.innerHTML = items.map(function (it, i) {
    if (it.type === 'role') {
      const col = it.color ? '#' + Number(it.color).toString(16).padStart(6, '0') : 'var(--primary)';
      return '<div class="mention-popup-item ' + (i === mentionSelectedIndex ? 'active' : '') + '" data-role-id="' + it.id + '" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; color:var(--text);"><span style="width:14px;height:14px;border-radius:50%;background:' + col + ';flex-shrink:0;"></span><span>@' + esc(it.name) + '</span><span style="margin-left:auto;font-size:0.65rem;color:var(--text-muted);">ROLE</span></div>';
    }
    return '<div class="mention-popup-item ' + (i === mentionSelectedIndex ? 'active' : '') + '" data-user-id="' + it.id + '" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; color:var(--text);">' + (it.avatar_url ? '<img src="' + esc(it.avatar_url) + '" style="width:24px;height:24px;border-radius:50%;" draggable="false" loading="lazy">' : '') + '<span>' + esc(it.name) + '</span></div>';
  }).join('');
  const rect = input.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.top - popup.offsetHeight - 8) + 'px';
  popup.style.width = rect.width + 'px';
  popup.style.display = 'block';
  mentionPopupVisible = true;
  popup.querySelectorAll('.mention-popup-item').forEach(function (item) {
    item.addEventListener('click', function () {
      const si = parseInt(popup.dataset.startIndex);
      if (this.dataset.roleId) insertRoleMention(this.dataset.roleId, si);
      else insertMention(this.dataset.userId, si);
    });
  });
}
function hideMentionPopup() {
  const p = document.getElementById('mention-popup');
  if (p) p.style.display = 'none';
  mentionPopupVisible = false;
  mentionSelectedIndex = -1;
  mentionFilter = '';
}
function updateMentionPopupSelection() {
  var items = document.querySelectorAll('#mention-popup .mention-popup-item');
  items.forEach(function (item, i) { item.classList.toggle('active', i === mentionSelectedIndex); });
}
document.addEventListener('input', function (e) {
  if (e.target.id !== 'chat-input') return;
  const before = e.target.value.substring(0, e.target.selectionStart);
  const mMention = before.match(/@(\S*)$/);
  const mChannel = before.match(/#([\w-]*)$/);
  const mEmoji = before.match(/:([a-z0-9_+-]{2,})$/i);
  if (mMention) {
    mentionFilter = mMention[1];
    showMentionPopup(mentionFilter);
    hideChannelPopup();
    hideEmojiAcPopup();
  } else if (mChannel) {
    showChannelPopup(mChannel[1]);
    hideMentionPopup();
    hideEmojiAcPopup();
  } else if (mEmoji) {
    showEmojiAcPopup(mEmoji[1]);
    hideMentionPopup();
    hideChannelPopup();
  } else {
    hideMentionPopup();
    hideChannelPopup();
    hideEmojiAcPopup();
  }
});
document.addEventListener('click', function (e) {
  if (!e.target.closest('#mention-popup') && !e.target.closest('#chat-input')) hideMentionPopup();
  const picker = document.getElementById('emoji-picker');
  if (picker && picker.style.display === 'block') {
    if (!e.target.closest('#emoji-picker') && e.target.id !== 'emoji-btn') picker.style.display = 'none';
  }
});
window.pendingAttachments = [];
socket.on('server_expression_data', function (data) { if (data && data.emojis) { serverEmojis = data.emojis; if (emojiTab === 'server') renderEmojiGrid(); } });
socket.on('chat_messages', function (data) {
  const channelId = data.channel_id;
  if (!channelId) return;
  
  const isHistory = window.isLoadingHistory && window.isLoadingHistory[channelId];
  if (isHistory) window.isLoadingHistory[channelId] = false;

  if (data.messages && data.messages.length > 0) {
    if (isHistory) {
      const existing = messageCache[channelId] || [];
      const existingIds = new Set(existing.map(m => m.id));
      const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
      messageCache[channelId] = newMsgs.concat(existing);
      
      if (channelId === AppState.activeChatChannel) {
        const container = document.getElementById('chat-messages-list');
        if (container) {
          const oldScrollHeight = container.scrollHeight;
          const oldScrollTop = container.scrollTop;
          window.nsLastSeen = localStorage.getItem('ns_lastseen' + channelId);
          container.innerHTML = renderMessagesGrouped(messageCache[channelId], window.nsLastSeen);
          container.scrollTop = oldScrollTop + (container.scrollHeight - oldScrollHeight);
        }
      }
    } else {
      messageCache[channelId] = data.messages.slice(-200);
      messageCacheLastId[channelId] = data.messages[data.messages.length - 1].id;
      messageCacheComplete[channelId] = true;
      if (channelId === AppState.activeChatChannel) {
        const container = document.getElementById('chat-messages-list');
        if (container) {
          window.nsLastSeen = localStorage.getItem('ns_lastseen' + channelId);
          container.innerHTML = renderMessagesGrouped(messageCache[channelId] || [], window.nsLastSeen);
          container.scrollTop = container.scrollHeight;
          localStorage.setItem('ns_lastseen' + channelId, (messageCache[channelId] || []).slice(-1)[0] ? messageCache[channelId][messageCache[channelId].length - 1].id : '');
        }
      }
    }
  } else {
    if (!isHistory) {
      messageCache[channelId] = [];
      messageCacheComplete[channelId] = true;
    }
  }
});
socket.on('new_chat_message', function (msg) {
  const channelId = msg.channel_id;
  if (!channelId) return;
  if (!messageCache[channelId]) messageCache[channelId] = [];
  var t2 = (msg.content_raw || (msg.segments && msg.segments.map(function (s) { return s.content; }).join('')) || '').trim();
  for (var ti = messageCache[channelId].length - 1; ti >= 0; ti--) {
    if (messageCache[channelId][ti].temp && (messageCache[channelId][ti].content_raw || '').trim() === t2) {
      messageCache[channelId].splice(ti, 1);
      break;
    }
  }
  messageCache[channelId].push(msg);
  if (messageCache[channelId].length > 200) messageCache[channelId].shift();
  messageCacheLastId[channelId] = msg.id;
  if (channelId === AppState.activeChatChannel) {
    const container = document.getElementById('chat-messages-list');
    if (!container) return;
    var existing = container.querySelector('.message-wrapper[data-temp="true"]');
    if (existing) {
      var t1 = existing.querySelector('.msg-text') ? existing.querySelector('.msg-text').textContent.trim() : '';
      if (t1 && t2 && t1 === t2) existing.remove();
    }
    var prevMsg = (messageCache[channelId] || []).slice(-2)[0] || null;
    container.insertAdjacentHTML('beforeend', renderMessage(msg, prevMsg));
    if (chatNearBottom) {
          container.scrollTop = container.scrollHeight;
        } else {
          unseenCount++;
          showJumpPill(unseenCount);
        }
      } else {
        if (!window.unreadChannels) window.unreadChannels = new Set();
        const botId = AppState.botInfo ? AppState.botInfo.id : null;
        if (!botId || msg.author_id !== botId) {
          window.unreadChannels.add(channelId);
          updateUnreadBadges();
        }
      }
      var botId = AppState.botInfo ? AppState.botInfo.id : null;
  if (!botId || msg.author_id === botId) return;
  var mentioned = false;
  if (msg.segments) mentioned = msg.segments.some(function (seg) { return seg.type === 'mention' && seg.user_id === botId; });
  else if (msg.content_raw) mentioned = msg.content_raw.indexOf('@' + botId) !== -1 || msg.content_raw.indexOf('<@' + botId + '>') !== -1;
  if (mentioned) { showNotif('mention', msg); return; }
  if (msg.reply_ref && msg.reply_ref.author_id && msg.reply_ref.author_id === botId) showNotif('reply', msg);
});
socket.on('message_edited', function (data) {
  const msgEl = document.querySelector('.message-wrapper[data-msg-id="' + data.message_id + '"]');
  if (msgEl) {
    const textEl = msgEl.querySelector('.msg-text');
    if (textEl) textEl.textContent = data.new_content;
  }
});
socket.on('message_deleted', function (data) {
  const msgEl = document.querySelector('.message-wrapper[data-msg-id="' + data.message_id + '"]');
  if (msgEl) msgEl.remove();
});
socket.on('dm_opened', function (data) {
  AppState.activeDmChannel = data.channel_id;
  AppState.activeChatChannel = null;
  AppState.dmRecipient = data;
  const title = document.getElementById('chat-channel-title');
  if (title) title.textContent = '@' + (data.display_name || data.username);
  const messagesContainer = document.getElementById('chat-messages-list');
  if (messagesContainer) {
    if (messageCache[data.channel_id] && messageCache[data.channel_id].length > 0) {
      window._nsLastSeen = localStorage.getItem('ns_lastseen_' + data.channel_id);
      messagesContainer.innerHTML = renderMessagesGrouped(messageCache[data.channel_id], window._nsLastSeen);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      localStorage.setItem('ns_lastseen_' + data.channel_id, messageCache[data.channel_id][messageCache[data.channel_id].length - 1].id);
    } else {
      messagesContainer.innerHTML = '<div class="empty-state"><div class="skeleton" style="width:60%; height:16px; margin-bottom:8px;"></div><div class="skeleton" style="width:80%; height:16px; margin-bottom:8px;"></div><div class="skeleton" style="width:50%; height:16px;"></div></div>';
      socket.emit('fetch_dm_messages', { channel_id: data.channel_id });
    }
  }
});
socket.on('dm_messages', function (data) {
  const channelId = data.channel_id;
  if (!channelId) return;
  if (data.messages && data.messages.length > 0) {
    messageCache[channelId] = data.messages;
    messageCacheLastId[channelId] = data.messages[data.messages.length - 1].id;
    messageCacheComplete[channelId] = true;
  } else {
    messageCache[channelId] = [];
    messageCacheComplete[channelId] = true;
  }
  if (channelId === AppState.activeDmChannel) {
    const container = document.getElementById('chat-messages-list');
    if (container) {
      window._nsLastSeen = localStorage.getItem('ns_lastseen_' + channelId);
      container.innerHTML = renderMessagesGrouped(messageCache[channelId] || [], window._nsLastSeen);
      container.scrollTop = container.scrollHeight;
      localStorage.setItem('ns_lastseen_' + channelId, (messageCache[channelId] || []).slice(-1)[0] ? messageCache[channelId][messageCache[channelId].length - 1].id : '');
    }
  }
});
socket.on('new_dm_message', function (msg) {
  const channelId = msg.channel_id;
  if (!channelId) return;
  if (!messageCache[channelId]) messageCache[channelId] = [];
  var td = (msg.content_raw || '').trim();
  for (var tj = messageCache[channelId].length - 1; tj >= 0; tj--) {
    if (messageCache[channelId][tj].temp && (messageCache[channelId][tj].content_raw || '').trim() === td) {
      messageCache[channelId].splice(tj, 1);
      break;
    }
  }
  messageCache[channelId].push(msg);
  if (messageCache[channelId].length > 200) messageCache[channelId].shift();
  messageCacheLastId[channelId] = msg.id;
  if (channelId === AppState.activeDmChannel) {
    const container = document.getElementById('chat-messages-list');
    if (container) {
      var prevMsg = messageCache[channelId].slice(-2)[0] || null;
      container.insertAdjacentHTML('beforeend', renderMessage(msg, prevMsg));
      container.scrollTop = container.scrollHeight;
    }
  }
  showNotif('dm', msg);
});
socket.on('vc_joined', function (data) {
  currentVoiceChannelId = data.channel_id || currentVoiceChannelId;
  voiceConnectedAt = Date.now();
  voiceSpeaking = {};
  micActive = false;
  showVoiceUI();
  updateMicButton();
  pushNotification('Voice connected — ' + (data.channel_name || voiceChannelName()), '', 'success', 2000);
});

socket.on('vc_left', function () {
  hideVoiceUI();
  stopMicBroadcast();
  micActive = false;
  currentVoiceChannelId = null;
  updateMicButton();
  pushNotification('Disconnected from VC', '', 'info', 2000);
});

socket.on('vc_speaking', function (data) {
  voiceSpeaking[data.user_id] = !!data.speaking;
  var panel = document.getElementById('vc-panel');
  if (panel && panel.style.display !== 'none') updateVoiceMemberList();
});

socket.on('vc_state', function (d) {
  if (!d) return;
  if (d.state === 'error') pushNotification('VC error: ' + (d.message || 'unknown'), '', 'error', 4000);
  else if (d.state === 'destroyed' || d.state === 'disconnected') pushNotification('VC link lost: ' + d.state, '', 'warning', 3000);
});

socket.on('typing_indicator', function (data) {
  if (data.channel_id !== (AppState.activeChatChannel || AppState.activeDmChannel)) return;
  const bar = document.getElementById('typing-indicator-bar');
  if (!bar) return;
  bar.textContent = data.user_name + ' is typing…';
  bar.style.display = 'block';
  if (typingIndicatorTimeout) clearTimeout(typingIndicatorTimeout);
  typingIndicatorTimeout = setTimeout(function () { bar.style.display = 'none'; }, 2500);
});
document.addEventListener('touchstart', function (e) {
  const wrapper = e.target.closest('.message-wrapper');
  if (!wrapper) return;
  if (e.target.closest('.inline-code')) return;
  const t = e.touches[0];
  touchState.startX = t.clientX; touchState.startY = t.clientY;
  touchState.wrapper = wrapper; touchState.msgId = wrapper.dataset.msgId;
  touchState.swiping = false;
  clearTimeout(touchState.timer);
  touchState.timer = setTimeout(() => { if (!touchState.swiping) { e.preventDefault(); showMsgPopup(touchState.wrapper, t.clientX, t.clientY); } }, isMobileDevice ? 600 : 500);
}, { passive: false });
document.addEventListener('touchmove', function (e) {
  if (!touchState.wrapper) return;
  const dx = e.touches[0].clientX - touchState.startX, dy = e.touches[0].clientY - touchState.startY;
  if (Math.abs(dy) > 20) { clearTimeout(touchState.timer); return; }
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
    clearTimeout(touchState.timer);
    touchState.swiping = true;
    if (dx > 0) {
      e.preventDefault();
      const translate = Math.min(dx, 250);
      touchState.wrapper.style.transform = `translateX(${translate}px)`;
      const indicator = touchState.wrapper.querySelector('.swipe-indicator');
      if (indicator) indicator.style.width = translate + 'px';
    }
  }
}, { passive: false });
document.addEventListener('touchend', function (e) {
  clearTimeout(touchState.timer);
  if (!touchState.wrapper) return;
  const wrapper = touchState.wrapper;
  const dx = (e.changedTouches[0]?.clientX || touchState.startX) - touchState.startX;
  const isOwn = AppState.botInfo && wrapper.dataset.authorId === AppState.botInfo.id;
  const threshold = CHAT_IS_MOBILE ? 180 : 200;
  if (dx > threshold && isOwn) editMessage(touchState.msgId);
  else if (dx > (CHAT_IS_MOBILE ? 100 : 120)) setReplyTarget(touchState.msgId);
  wrapper.style.transform = '';
  const indicator = wrapper.querySelector('.swipe-indicator');
  if (indicator) indicator.style.width = '0';
  touchState.wrapper = null; touchState.swiping = false;
});
document.addEventListener('contextmenu', function (e) {
  if (touchState.swiping) { e.preventDefault(); return; }
  const wrapper = e.target.closest('.message-wrapper');
  if (!wrapper) return;
  e.preventDefault();
  showMsgPopup(wrapper, e.clientX, e.clientY);
});

function ensureQuickStyles() {
  if (document.getElementById('ns-quick-styles')) return;
  var st = document.createElement('style');
  st.id = 'ns-quick-styles';
  st.textContent =
    '.quick-reacts{display:flex;justify-content:space-around;align-items:center;gap:4px;padding:10px 8px;margin-bottom:4px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));font-size:22px}' +
    '.quick-reacts span{cursor:pointer;transition:transform .12s;padding:4px 6px;border-radius:8px;line-height:1}' +
    '.quick-reacts span:hover{transform:scale(1.3);background:rgba(255,255,255,.08)}';
  document.head.appendChild(st);
}

function showMsgPopup(wrapper, clientX, clientY) {
  const popup = document.getElementById('msg-popup');
  const isOwn = AppState.botInfo && wrapper.dataset.authorId === AppState.botInfo.id;
  let items = [
    ' <div class="msg-popup-item" onclick="openReactionPicker(\'' + wrapper.dataset.msgId + '\');hidePopup()">' + arkIcon('react', 16) + ' React</div>',
    '<div class="msg-popup-item" onclick="setReplyTarget(\'' + wrapper.dataset.msgId + '\');hidePopup()">Reply</div>',
    '<div class="msg-popup-item" onclick="copyText(\'' + wrapper.dataset.msgId + '\');hidePopup()">Copy Text</div>',
    '<div class="msg-popup-item" onclick="copyMessageId(\'' + wrapper.dataset.msgId + '\');hidePopup()">Copy Message ID</div>',
    '<div class="msg-popup-item" onclick="pinMessage(\'' + wrapper.dataset.msgId + '\');hidePopup()">Pin Message</div>',
    '<div class="msg-popup-item" onclick="copyMessageLink(\'' + wrapper.dataset.msgId + '\');hidePopup()">Copy Message Link</div>'
  ];
  if (isOwn) {
    items.push('<div class="msg-popup-item" onclick="editMessage(\'' + wrapper.dataset.msgId + '\');hidePopup()">Edit</div>');
    items.push('<div class="msg-popup-item" onclick="deleteMessage(\'' + wrapper.dataset.msgId + '\');hidePopup()">Delete</div>');
  }
  var QUICK = ['🖕', '❤️', '😆', '💀', '😢', ''];
  var quickHtml = '<div class="quick-reacts">' + QUICK.map(function (e) {
    return '<span onclick="event.stopPropagation();quickReact(\'' + wrapper.dataset.msgId + '\',\'' + e + '\')">' + e + '</span>';
  }).join('') + '</div>';
  ensureQuickStyles();
  popup.innerHTML = quickHtml + items.join('');
  if (popup.parentElement && popup.parentElement !== document.body) {
    popup.parentElement.classList.remove('popup-open');
    document.body.appendChild(popup);
  }
  const rect = wrapper.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  popup.style.position = 'absolute';
  popup.style.left = Math.min(relX, rect.width - 180) + 'px';
  popup.style.top = Math.min(relY, rect.height - 200) + 'px';
  popup.style.display = 'block';
  wrapper.appendChild(popup);
  wrapper.classList.add('popup-open');
  setTimeout(() => { document.addEventListener('click', hidePopup, { once: true }); }, 50);
}

function quickReact(msgId, emoji) {
  var channelId = AppState.activeChatChannel || AppState.activeDmChannel;
  if (!channelId) return;
  socket.emit('run_command', { cmd: 'react_message', params: { channel_id: channelId, message_id: msgId, emoji: emoji } });
  hidePopup();
  pushNotification('Reaction sent', '', 'success', 1500);
}

let reactionTargetMsgId = null;
function openReactionPicker(msgId) {
  reactionTargetMsgId = msgId;
  window._reactionMode = true;
  hidePopup();
  requestAnimationFrame(() => { toggleEmojiPicker(); });
}
const originalInsertEmoji = insertEmoji;
insertEmoji = function (emojiStr) {
  if (window._reactionMode) {
    const channelId = AppState.activeChatChannel || AppState.activeDmChannel;
    if (!channelId || !reactionTargetMsgId) {
      window._reactionMode = false;
      document.getElementById('emoji-picker').style.display = 'none';
      pushNotification('Cannot react - missing channel/message', '', 'warning', 2000);
      return;
    }
    socket.emit('run_command', { cmd: 'react_message', params: { channel_id: channelId, message_id: reactionTargetMsgId, emoji: emojiStr } });
    window._reactionMode = false;
    document.getElementById('emoji-picker').style.display = 'none';
    pushNotification('Reaction sent', '', 'success', 2000);
    return;
  }
  originalInsertEmoji(emojiStr);
};
document.addEventListener('keydown', function (e) {
  if (!mentionPopupVisible) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    mentionSelectedIndex = Math.min(mentionSelectedIndex + 1, mentionPopupItems.length - 1);
    updateMentionPopupSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    mentionSelectedIndex = Math.max(mentionSelectedIndex - 1, 0);
    updateMentionPopupSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = mentionPopupItems[mentionSelectedIndex];
    if (item) {
      const si = parseInt(document.getElementById('mention-popup').dataset.startIndex);
      if (item.type === 'role') insertRoleMention(item.id, si);
      else insertMention(item.id, si);
    }
  } else if (e.key === 'Escape') hideMentionPopup();
});

document.addEventListener('keydown', function (e) {
  if (!channelPopupVisible && !emojiAcPopupVisible) return;
  const isChannel = channelPopupVisible;
  const items = isChannel ? channelPopupItems : emojiAcPopupItems;
  let idx = isChannel ? channelSelectedIndex : emojiAcSelectedIndex;
  if (e.key === 'ArrowDown') {
    e.preventDefault(); e.stopPropagation();
    idx = Math.min(idx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); e.stopPropagation();
    idx = Math.max(idx - 1, 0);
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault(); e.stopPropagation();
    if (items[idx]) {
      if (isChannel) insertChannelMention(items[idx].id);
      else insertEmojiAutocomplete(items[idx]);
    }
    return;
  } else if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation();
    hideChannelPopup();
    hideEmojiAcPopup();
    return;
  } else return;
  if (isChannel) channelSelectedIndex = idx; else emojiAcSelectedIndex = idx;
  updateExtraPopupSelection(isChannel);
}, true);
document.addEventListener('click', function (e) {
  if (!e.target.closest('#channel-popup') && !e.target.closest('#chat-input')) hideChannelPopup();
  if (!e.target.closest('#emoji-popup') && !e.target.closest('#chat-input')) hideEmojiAcPopup();
});

function renderAttachments(attachments) {
  if (!attachments || !attachments.length) return '';
    const visual = attachments.filter(a => a.type === 'image' || a.type === 'video');
    const other = attachments.filter(a => a.type !== 'image' && a.type !== 'video');
    let html = '';
    if (visual.length) {
      const count = visual.length;
      let gridStyle = 'display:grid; gap:6px; margin-top:6px; max-width:600px;';
      if (count === 1) gridStyle += 'grid-template-columns:1fr;';
      else if (count === 2) gridStyle += 'grid-template-columns:1fr 1fr;';
      else if (count === 3) gridStyle += 'grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr;';
      else gridStyle += 'grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));';
      html += '<div class="attachment-grid" style="' + gridStyle + '">';
      visual.forEach((item, i) => {
        const url = esc(item.url);
        const filename = esc(item.filename);
        let cellStyle = 'border-radius:10px; overflow:hidden; cursor:pointer; width:100%; position:relative; transition: transform 0.2s, box-shadow 0.2s;';
        if (count === 1) cellStyle += 'max-height:400px;';
        else if (count === 2) cellStyle += 'aspect-ratio:1; max-height:300px;';
        else if (count === 3) {
          if (i === 0) cellStyle += 'grid-row:span 2;';
          else cellStyle += 'aspect-ratio:1; max-height:200px;';
        }
        if (item.type === 'image') {
          html += ambientGlowImage(url, cellStyle, `openMediaLightbox('${url}','${filename}','image')`, 'contain');
        } else {
          if (count === 1) cellStyle += 'height:420px;';
          html += '<div class="video-grid-item interactive" style="' + cellStyle + '" onclick="openMediaLightbox(\'' + url + '\',\'' + filename + '\',\'video\')">' +
            '<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:rgba(0,0,0,.35);">' +
            '<div style="width:50px; height:50px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px var(--primary-glow);">' + arkIcon('play', 26) + '</div>' +
            '</div>' +
            '</div>';
        }
      });
      html += '</div>';
    }
    if (other.length) {
      html += '<div class="attachment-other" style="margin-top:6px;">';
      other.forEach(att => {
        const ext = (att.filename || '').split('.').pop().toLowerCase();
        const isText = TEXT_EXTENSIONS.includes(ext);
        const sizeStr = att.size ? formatFileSize(att.size) : '';
        const isAudio = att.type === 'audio' || ['mp3','wav','ogg','flac','aac','m4a','opus'].includes(ext);
        const url = esc(att.url);
        const filename = esc(att.filename);
        html += '<div class="file-card interactive" style="background: var(--glass-bg); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 10px; margin-top:6px; display:flex; align-items:center; gap:10px;">' +
          '<span style="font-size:1.8rem;">' + (isAudio ? arkIcon('music', 26) : arkIcon('file', 26)) + '</span>' +
          '<div style="flex:1; min-width:0;"><div style="font-weight:600; font-size:.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + filename + '</div>' +
          '<small style="color:var(--text-muted);">' + ext.toUpperCase() + (sizeStr ? ' · ' + sizeStr : '') + '</small></div>' +
          (isText ? '<button class="secondary-btn" onclick="previewFileContent(\'' + url + '\',\'' + filename + '\')">Preview</button>' : '') +
          '<a class="secondary-btn" href="' + url + '" download="' + filename + '" style="text-decoration:none;">Download</a>' +
          '</div>';
      });
      html += '</div>';
  }
  return html;
}
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
function langFromFilename(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const map = { js: 'js', jsx: 'js', ts: 'js', tsx: 'js', py: 'py', rb: 'rb', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'cs', php: 'php', go: 'go', rs: 'rs', kt: 'kt', swift: 'swift', sh: 'sh', bash: 'sh', bat: 'bat', ps1: 'ps1', sql: 'sql', json: 'json', yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', cfg: 'ini', r: 'r', html: 'html', htm: 'html', xml: 'html', css: 'css', md: 'md' };
  return map[ext] || '';
}
function previewFileContent(url, filename) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:10060; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6);';
  modal.innerHTML = '<div class="glass-card" style="max-width:700px; width:90%; max-height:80vh; display:flex; flex-direction:column;">' +
    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
    '<h3 style="margin:0;">' + esc(filename) + '</h3>' +
    '<span id="file-lang-badge" style="font:600 9px monospace;letter-spacing:1px;color:#8b90a8;text-transform:uppercase;border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:2px 8px;">text</span>' +
    '<span id="file-line-badge" style="font:600 9px monospace;color:#8b90a8;"></span>' +
    '<button class="secondary-btn" onclick="this.closest(\'.modal\').remove()">' + arkIcon('close', 14) + '</button></div>' +
    '<div style="flex:1; overflow:auto; background:#1e1e1e; color:#d4d4d4; padding:12px; border-radius:8px; font-family:monospace; white-space:pre-wrap;" id="file-content-display">Loading...</div>' +
    '<div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">' +
    '<button class="secondary-btn" id="file-copy-btn" onclick="copyCodeBlock(document.getElementById(\'file-content-display\'))">Copy</button>' +
    '<a class="primary-btn" href="' + esc(url) + '" download="' + esc(filename) + '" style="text-decoration:none;">Download</a></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
  socket.emit('run_command', { cmd: 'fetch_file_content', params: { url: url } });
  socket.once('file_content', function (data) {
    const display = document.getElementById('file-content-display');
    if (!display) return;
    const lang = langFromFilename(filename);
    const langBadge = document.getElementById('file-lang-badge');
    if (langBadge) langBadge.textContent = lang || 'text';
    const lineBadge = document.getElementById('file-line-badge');
    if (lineBadge) lineBadge.textContent = (data.content || '').split('\n').length + ' lines';
    if (lang && typeof highlightCode === 'function') display.innerHTML = highlightCode(data.content, lang);
    else display.textContent = data.content;
  });
  socket.once('error', function (data) {
    const display = document.getElementById('file-content-display');
    if (display) display.textContent = 'Error loading file: ' + (data.message || 'Unknown error');
  });
}
function openMediaLightbox(url, filename, type) {
  const existing = document.getElementById('media-lightbox');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'media-lightbox';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); z-index:10050; display:flex; align-items:center; justify-content:center; flex-direction:column;';
  let mediaHtml = '';
  if (type === 'image') mediaHtml = ambientGlowImage(url, 'max-width:90%; max-height:80vh; border-radius:12px; box-shadow:0 0 30px rgba(0,0,0,0.8);', null, 'contain');
  else mediaHtml = '<video id="lb-video" controls playsinline src="' + esc(url) + '" style="max-width:90vw; max-height:80vh; min-width:260px; min-height:260px; border-radius:12px; box-shadow:0 0 30px rgba(0,0,0,0.8); background:#000;"></video>';
  overlay.innerHTML =
    '<button style="position:absolute; top:20px; right:20px; background:var(--danger); border:none; color:#fff; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:1rem;" onclick="this.parentElement.remove()">' + arkIcon('close', 14) + ' Close</button>' +
    mediaHtml +
    '<div style="margin-top:12px; display:flex; gap:10px;">' +
    '<a href="' + esc(url) + '" download="' + esc(filename) + '" style="background:var(--primary); color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-weight:600;">Download</a>' +
    '<button onclick="copyToClipboard(\'' + esc(url) + '\')" style="background:var(--secondary); color:#fff; padding:8px 16px; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Copy Link</button></div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  var lbv = document.getElementById('lb-video');
  if (lbv) {
    lbv.addEventListener('loadedmetadata', function () {
      var r = lbv.videoWidth / lbv.videoHeight;
      var mw = window.innerWidth * 0.9, mh = window.innerHeight * 0.8;
      var w, h;
      if (r >= mw / mh) { w = mw; h = mw / r; } else { h = mh; w = mh * r; }
      lbv.style.width = w + 'px';
      lbv.style.height = h + 'px';
    });
  }
}
function copyCodeInline(el) {
  const text = el.textContent || '';
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast('Code copied'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Code copied'); } catch (e) {}
    document.body.removeChild(ta);
  }
}
function copyCodeBlock(preEl) {
  const code = preEl.querySelector('code');
  const text = code ? code.textContent : preEl.textContent;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast('Code block copied'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Code block copied'); } catch (e) {}
    document.body.removeChild(ta);
  }
}
function hidePopup() {
  const popup = document.getElementById('msg-popup');
  if (!popup) return;
  popup.style.display = 'none';
  if (popup.parentElement) {
    popup.parentElement.classList.remove('popup-open');
    document.body.appendChild(popup);
  }
}