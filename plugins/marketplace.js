const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { io, logger, registerCommand, getCurrentBotTokenIndex, config } = require('../bot');
const { PLUGIN_REGISTRY, PLUGINS_DIR, load_plugins_for_token, loadAssignments, saveAssignments, teardown_plugin } = require('./loader');

const CATALOG_URL = 'https://raw.githubusercontent.com/NEW4ONEDK/arklum-plugins/main/catalog.json';
const TMP_DIR = path.join('.arklum_sys', 'tmp');

function getGithubToken() { return config && config.github_token ? config.github_token : null; }
function coreVersion() { try { return require('../package.json').version; } catch (e) { return '0.0.0'; } }
function major(v) { const n = parseInt(String(v).split('.')[0], 10); return isNaN(n) ? 0 : n; }
function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}
function headers() {
  const h = { Accept: 'application/json' };
  const t = getGithubToken();
  if (t) h.Authorization = `token ${t}`;
  return h;
}
function buildLists() {
  return Object.values(PLUGIN_REGISTRY).filter(p => p.loaded).map(p => ({
    key: (p.sidebar && p.sidebar.key) || '', icon: (p.sidebar && p.sidebar.icon) || '⚡',
    title: (p.sidebar && p.sidebar.title) || '', name: p.name || '',
    version: p.version || '', author: p.author || '', description: p.description || ''
  }));
}
function emitUpdates() {
  const list = buildLists();
  io.emit('plugin_sidebar_update', list);
  io.emit('plugin_installed_list', list);
}

registerCommand('plugin_fetch_catalog')(async (params, { socket }) => {
  try {
    const res = await fetchWithTimeout(CATALOG_URL, { headers: headers() }, 10000);
    if (!res.ok) { socket.emit('error', { message: 'Failed to load catalog' }); return; }
    const catalog = JSON.parse(await res.text());
    for (const p of catalog) p.installed = p.id in PLUGIN_REGISTRY;
    socket.emit('plugin_catalog', catalog);
  } catch (e) {
    logger.error(`Catalog fetch error: ${e.message}`);
    socket.emit('error', { message: `Catalog error: ${e.message}` });
  }
});

registerCommand('plugin_install_remote')(async (params, { socket }) => {
  const pluginId = params.id;
  if (!pluginId) { socket.emit('error', { message: 'No plugin ID' }); return; }
  const progress = (step, message, percent, detail) => socket.emit('plugin_install_progress', { plugin_id: pluginId, step, message, percent, detail: detail || '' });
  progress('preparing', 'Preparing installation…', 5);
  let plugin;
  try {
    const res = await fetchWithTimeout(CATALOG_URL, { headers: headers() }, 10000);
    if (!res.ok) { socket.emit('error', { message: 'Failed to load catalog for install' }); return; }
    plugin = (JSON.parse(await res.text())).find(p => p.id === pluginId);
    if (!plugin) { socket.emit('error', { message: `Plugin ${pluginId} not found in catalog` }); return; }
    if (!plugin.download_url) { socket.emit('error', { message: 'No download URL for this plugin' }); return; }
  } catch (e) { socket.emit('error', { message: `Catalog error: ${e.message}` }); return; }
  if (plugin.min_core_version && major(plugin.min_core_version) > major(coreVersion())) {
    socket.emit('error', { message: `Plugin requires core v${plugin.min_core_version}+ (you have v${coreVersion()})` });
    return;
  }
  progress('downloading', 'Downloading plugin…', 20);
  let zipBuffer;
  try {
    const res = await fetchWithTimeout(plugin.download_url, { headers: headers() }, 60000);
    if (!res.ok) { socket.emit('error', { message: 'Download failed' }); return; }
    zipBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) { socket.emit('error', { message: `Download error: ${e.message}` }); return; }
  if (plugin.checksum) {
    const sum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    if (sum !== plugin.checksum) { socket.emit('error', { message: 'Checksum mismatch — aborting install' }); return; }
  }
  progress('extracting', 'Extracting files…', 50, `${Math.floor(zipBuffer.length / 1024)} KB downloaded`);
  const destDir = path.join(PLUGINS_DIR, pluginId);
  const bakDir = destDir + '.bak';
  const tmpDir = path.join(TMP_DIR, pluginId + '_' + Date.now());
  try {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    let pluginDirEntry = null;
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parts = entry.entryName.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[parts.length - 1] === 'plugin.json') { pluginDirEntry = parts.slice(0, -1).join('/'); break; }
    }
    if (!pluginDirEntry) { socket.emit('error', { message: 'Invalid plugin structure (missing plugin.json)' }); return; }
    const prefix = pluginDirEntry + '/';
    fs.mkdirSync(tmpDir, { recursive: true });
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (!entry.entryName.startsWith(prefix)) continue;
      const relPath = entry.entryName.substring(prefix.length);
      const destPath = path.join(tmpDir, relPath);
      if (!path.resolve(destPath).startsWith(path.resolve(tmpDir) + path.sep)) continue;
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
    }
    if (!fs.existsSync(path.join(tmpDir, 'plugin.json'))) { socket.emit('error', { message: 'Invalid plugin structure after extraction' }); return; }
  } catch (e) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e2) {}
    socket.emit('error', { message: `Extraction failed: ${e.message}` });
    return;
  }
  progress('loading', 'Loading plugin…', 80, 'Swapping files safely');
  try {
    teardown_plugin(pluginId);
    try { fs.rmSync(bakDir, { recursive: true, force: true }); } catch (e) {}
    if (fs.existsSync(destDir)) fs.renameSync(destDir, bakDir);
    fs.renameSync(tmpDir, destDir);
    try { fs.rmSync(bakDir, { recursive: true, force: true }); } catch (e) {}
  } catch (e) {
    try { if (fs.existsSync(bakDir) && !fs.existsSync(destDir)) fs.renameSync(bakDir, destDir); } catch (e2) {}
    socket.emit('error', { message: `Swap failed: ${e.message}` });
    return;
  }
  try { load_plugins_for_token(getCurrentBotTokenIndex()); } catch (e) {
    socket.emit('error', { message: `Plugin loading error: ${e.message}` });
    return;
  }
  progress('done', 'Installation complete!', 100);
  emitUpdates();
  socket.emit('notification', `${pluginId} installed successfully!`);
});

registerCommand('plugin_set_enabled')(async (params, { socket }) => {
  const pluginId = params.id;
  const enable = !!params.enable;
  if (!pluginId) { socket.emit('error', { message: 'No plugin ID' }); return; }
  const data = loadAssignments();
  data.disabled = Array.isArray(data.disabled) ? data.disabled : [];
  if (enable) data.disabled = data.disabled.filter(x => x !== pluginId);
  else if (!data.disabled.includes(pluginId)) data.disabled.push(pluginId);
  saveAssignments(data);
  load_plugins_for_token(getCurrentBotTokenIndex());
  emitUpdates();
  socket.emit('notification', `${pluginId} ${enable ? 'enabled' : 'disabled'}.`);
});

registerCommand('plugin_list_local')(async (params, { socket }) => {
  const data = loadAssignments();
  socket.emit('plugin_installed_list', Object.entries(PLUGIN_REGISTRY).map(([key, p]) => ({
    key, name: p.name, version: p.version, author: p.author, description: p.description,
    loaded: !!p.loaded, disabled: (data.disabled || []).includes(key)
  })));
});