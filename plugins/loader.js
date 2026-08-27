const fs = require('fs');
const path = require('path');
const http = require('http');
const { io, logger, getBot, commandHandlers, registerCommand } = require('../bot');
const api = require('./api');

const PLUGINS_DIR = 'plugins';
const ASSIGNMENTS_FILE = path.join('.arklum_sys', 'config', 'plugin_assignments.json');
const PLUGIN_REGISTRY = {};
const OVERRIDE_REGISTRY = {};
const THEME_REGISTRY = {};
const MAX_PLUGIN_FAILURES = 5;

function loadAssignments() {
  if (fs.existsSync(ASSIGNMENTS_FILE)) {
    try { return JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf8')); } catch (e) {}
  }
  return { global: [], disabled: [] };
}
function saveAssignments(data) {
  fs.mkdirSync(path.dirname(ASSIGNMENTS_FILE), { recursive: true });
  fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(data, null, 2));
}
function getAssignedPlugins(tokenIndex) {
  const data = loadAssignments();
  const disabled = Array.isArray(data.disabled) ? data.disabled : [];
  const all = Array.from(new Set([...(data.global || []), ...(data[String(tokenIndex)] || [])]));
  return all.filter(k => !disabled.includes(k));
}
function apiCompatible(range) {
  if (!range) return true;
  try {
    const s = String(range).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10) === api.API_MAJOR;
    if (/^\d+\.x/.test(s)) return parseInt(s, 10) === api.API_MAJOR;
    if (s.includes('<')) { const lt = parseInt(s.split('<')[1].trim(), 10); if (!isNaN(lt) && api.API_MAJOR >= lt) return false; }
    if (s.includes('>=')) { const gte = parseInt(s.split('>=')[1].trim().split(/\s/)[0], 10); if (!isNaN(gte) && api.API_MAJOR < gte) return false; }
    return true;
  } catch (e) { return true; }
}

class PluginState {
  constructor(name, pluginPath, arklum) {
    this.name = name; this.path = pluginPath; this.arklum = arklum;
    this.tasks = []; this.commandNames = []; this.commandMeta = {};
    this.botOffs = []; this.sioOffs = []; this.intervals = []; this.timeouts = [];
    this.httpServers = [];
    this.sidebarKey = null; this.settingsTabs = []; this.settingsSections = [];
    this.cssInjections = []; this.jsInjections = []; this.uiSlots = [];
    this.overrides = []; this.themes = [];
    this.failures = 0;
  }
}

class ArklumAPI {
  constructor(bot, sio, pluginName, scopes) {
    this.bot = bot; this.sio = sio;
    this._pluginName = pluginName;
    this._scopes = scopes || ['read', 'write', 'ui'];
    this._state = null;
    this.version = api.API_VERSION;
    const base = logger;
    const warn = base.warn ? base.warn.bind(base) : base.error.bind(base);
    this.logger = {
      info: (m) => base.info('[' + pluginName + '] ' + m),
      warn: (m) => warn('[' + pluginName + '] ' + m),
      error: (m) => base.error('[' + pluginName + '] ' + m)
    };
  }
  _guard(fn, label) {
    const self = this;
    return function (...args) {
      try { return fn(...args); } catch (e) { self._fail(label, e); }
    };
  }
  _guardAsync(fn, label) {
    const self = this;
    return async function (...args) {
      try { return await fn(...args); } catch (e) { self._fail(label, e); }
    };
  }
  _fail(label, e) {
    logger.error(`Plugin '${this._pluginName}' error in ${label}: ${e && e.stack ? e.stack : e}`);
    const st = this._state;
    if (!st) return;
    st.failures++;
    if (st.failures >= MAX_PLUGIN_FAILURES) {
      logger.error(`Plugin '${this._pluginName}' disabled after ${st.failures} failures.`);
      try { io.emit('notification', `Plugin '${this._pluginName}' was disabled (too many errors).`); } catch (e2) {}
      teardownPlugin(this._pluginName);
    }
  }
  call(key, params) { return api.run({ scopes: this._scopes, plugin: this._pluginName }, key, params); }
  registerCommand(name, handler, meta) {
    const fullName = name.startsWith(this._pluginName + '_') ? name : this._pluginName + '_' + name;
    const wrapped = this._guardAsync(handler, 'command ' + fullName);
    commandHandlers[fullName] = wrapped;
    if (this._state) {
      this._state.commandNames.push(fullName);
      this._state.commandMeta[fullName] = Object.assign({ plugin: this._pluginName }, meta || {});
    }
  }
  onBot(event, fn) {
    const bot = this.bot;
    if (!bot) return () => {};
    const wrapped = this._guard(fn, 'bot:' + event);
    bot.on(event, wrapped);
    const off = () => { try { bot.off(event, wrapped); } catch (e) {} };
    if (this._state) this._state.botOffs.push(off);
    return off;
  }
  onSocket(event, fn) {
    const wrapped = this._guard(fn, 'socket:' + event);
    this.sio.on(event, wrapped);
    const off = () => { try { this.sio.off(event, wrapped); } catch (e) {} };
    if (this._state) this._state.sioOffs.push(off);
    return off;
  }
  setInterval(fn, ms) {
    const id = setInterval(this._guard(fn, 'interval'), ms);
    if (this._state) this._state.intervals.push(id);
    return id;
  }
  setTimeout(fn, ms) {
    const id = setTimeout(this._guard(fn, 'timeout'), ms);
    if (this._state) this._state.timeouts.push(id);
    return id;
  }
  createTask(coro) {
    const t = Promise.resolve().then(() => coro);
    t.catch(() => {});
    if (this._state) this._state.tasks.push(t);
    return t;
  }
  async emitToSid(sid, event, data) { await this.sio.to(sid).emit(event, data); }
  broadcast(event, data) { this.sio.emit(event, data); }
  injectCss(css) { if (this._state) this._state.cssInjections.push(css); }
  injectJs(js) { if (this._state) this._state.jsInjections.push(js); }
  getPluginDataDir() {
    const dir = path.join('.arklum_sys', 'config', 'plugins', this._pluginName);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  _kvFile() { return path.join(this.getPluginDataDir(), 'kv.json'); }
  kvGet(key, fallback) {
    try {
      const j = JSON.parse(fs.readFileSync(this._kvFile(), 'utf8'));
      return (key in j) ? j[key] : fallback;
    } catch (e) { return fallback; }
  }
  kvSet(key, value) {
    let j = {};
    try { j = JSON.parse(fs.readFileSync(this._kvFile(), 'utf8')); } catch (e) {}
    j[key] = value;
    fs.writeFileSync(this._kvFile(), JSON.stringify(j, null, 2));
  }
  addSidebarItem(key, icon, title, getHtmlFunc) {
    if (key !== this._pluginName) throw new Error('Sidebar key must match plugin folder name');
    if (this._state) this._state.sidebarKey = key;
    PLUGIN_REGISTRY[this._pluginName].sidebar = { key, icon, title };
    PLUGIN_REGISTRY[this._pluginName].content_provider = this._guard(getHtmlFunc, 'sidebar');
  }
  addSettingsTab(key, title, getHtmlFunc) {
    if (this._state) this._state.settingsTabs.push([key, title, this._guard(getHtmlFunc, 'settings:' + key)]);
  }
  addSettingsSection(existingTab, title, getHtmlFunc) {
    if (this._state) this._state.settingsSections.push([existingTab, title, this._guard(getHtmlFunc, 'section:' + title)]);
  }
  registerUiSlot(slotId, generator, priority) {
    if (this._state) this._state.uiSlots.push([slotId, priority || 0, this._guard(generator, 'uislot:' + slotId)]);
  }
  override(componentId, generator, priority) {
    if (this._state) this._state.overrides.push(componentId);
    const list = OVERRIDE_REGISTRY[componentId] || (OVERRIDE_REGISTRY[componentId] = []);
    list.push({ plugin: this._pluginName, priority: priority || 0, generator: this._guard(generator, 'override:' + componentId) });
  }
  registerTheme(name, vars) {
    THEME_REGISTRY[name] = { plugin: this._pluginName, vars };
    if (this._state) this._state.themes.push(name);
  }
  serveHttp(port, requestHandler) {
    const server = http.createServer(this._guard(requestHandler, 'http:' + port));
    server.listen(port, () => { this.logger.info(`Standalone HTTP server listening on :${port}`); });
    if (this._state) this._state.httpServers.push(server);
    return server;
  }
}

function unloadAllPlugins() {
  for (const key of Object.keys(PLUGIN_REGISTRY)) {
    if (PLUGIN_REGISTRY[key].loaded) teardownPlugin(key);
  }
}
function teardownPlugin(key) {
  const info = PLUGIN_REGISTRY[key];
  if (!info || !info.loaded) return;
  const st = info._state;
  if (st) {
    st.intervals.forEach(id => { try { clearInterval(id); } catch (e) {} });
    st.timeouts.forEach(id => { try { clearTimeout(id); } catch (e) {} });
    st.httpServers.forEach(s => { try { s.close(); } catch (e) {} });
    st.botOffs.forEach(off => off());
    st.sioOffs.forEach(off => off());
    st.commandNames.forEach(n => { delete commandHandlers[n]; });
    st.overrides.forEach(id => {
      const list = OVERRIDE_REGISTRY[id];
      if (list) OVERRIDE_REGISTRY[id] = list.filter(x => x.plugin !== key);
    });
    st.themes.forEach(name => { if (THEME_REGISTRY[name] && THEME_REGISTRY[name].plugin === key) delete THEME_REGISTRY[name]; });
    st.tasks.length = 0;
  }
  info.loaded = false;
  info._state = null;
  logger.info(`Plugin '${key}' torn down.`);
}

function loadPluginsForToken(tokenIndex) {
  unloadAllPlugins();
  const data = loadAssignments();
  const globalList = data.global || [];
  if (fs.existsSync(PLUGINS_DIR)) {
    for (const folder of fs.readdirSync(PLUGINS_DIR)) {
      const pluginPath = path.join(PLUGINS_DIR, folder);
      if (!fs.statSync(pluginPath).isDirectory()) continue;
      const alreadyAssigned = globalList.includes(folder) || Object.keys(data).some(k => k !== 'global' && k !== 'disabled' && Array.isArray(data[k]) && data[k].includes(folder));
      if (!alreadyAssigned) globalList.push(folder);
    }
    data.global = globalList;
    saveAssignments(data);
  }
  const assigned = getAssignedPlugins(tokenIndex);
  logger.info(`Loading plugins for token index ${tokenIndex}: ${assigned.join(', ') || '(none)'}`);
  for (const folder of assigned) {
    const pluginPath = path.join(PLUGINS_DIR, folder);
    if (!fs.existsSync(pluginPath) || !fs.statSync(pluginPath).isDirectory()) continue;
    const jsonPath = path.join(pluginPath, 'plugin.json');
    let meta = {};
    if (fs.existsSync(jsonPath)) {
      try { meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) { meta = {}; }
    }
    const name = meta.name || folder;
    const key = (meta.sidebar && meta.sidebar.key) || folder;
    if (key !== folder) { logger.warn(`Plugin ${folder}: sidebar key must match folder name. Skipping.`); continue; }
    if (!apiCompatible(meta.api)) { logger.warn(`Plugin ${folder}: requires api '${meta.api}', core is v${api.API_VERSION}. Skipping.`); continue; }
    if (!PLUGIN_REGISTRY[key]) {
      PLUGIN_REGISTRY[key] = {
        name, path: pluginPath, loaded: false,
        sidebar: meta.sidebar || {}, version: meta.version || '0.0.0',
        author: meta.author || '', description: meta.description || '',
        scopes: meta.scopes || ['read', 'write', 'ui'],
        content_provider: null, _state: null
      };
    }
    try {
      const modulePath = path.resolve(pluginPath, 'plugin.js');
      if (!fs.existsSync(modulePath)) continue;
      delete require.cache[require.resolve(modulePath)];
      const pluginModule = require(modulePath);
      if (typeof pluginModule.setup === 'function') {
        const botInstance = getBot();
        const arklum = new ArklumAPI(botInstance, io, key, PLUGIN_REGISTRY[key].scopes);
        const state = new PluginState(key, pluginPath, arklum);
        arklum._state = state;
        pluginModule.setup(arklum);
        PLUGIN_REGISTRY[key].loaded = true;
        PLUGIN_REGISTRY[key]._state = state;
        logger.info(`Plugin '${key}' loaded.`);
      }
    } catch (e) {
      logger.error(`Failed to load plugin '${key}': ${e.stack}`);
    }
  }
}

function resolveOverride(componentId, context, fallback) {
  const list = OVERRIDE_REGISTRY[componentId];
  if (!list || !list.length) return fallback;
  const best = list.slice().sort((a, b) => b.priority - a.priority)[0];
  try {
    const out = best.generator(context);
    return (out === undefined || out === null) ? fallback : out;
  } catch (e) {
    logger.error(`Override ${componentId} error: ${e.message}`);
    return fallback;
  }
}
function resolveUiSlot(slotId, context) {
  let bestPriority = -2;
  let bestGenerator = null;
  for (const info of Object.values(PLUGIN_REGISTRY)) {
    if (info._state) {
      for (const [sid, prio, gen] of info._state.uiSlots) {
        if (sid === slotId && prio > bestPriority) { bestPriority = prio; bestGenerator = gen; }
      }
    }
  }
  if (bestGenerator) {
    try { return bestGenerator(context) || ''; } catch (e) { logger.error(`UI slot ${slotId} generator error: ${e.message}`); return ''; }
  }
  return null;
}
function getAllInjections() {
  const css = []; const js = [];
  for (const info of Object.values(PLUGIN_REGISTRY)) {
    if (info._state) {
      css.push(...info._state.cssInjections);
      js.push(...info._state.jsInjections);
    }
  }
  return { cssList: css, jsList: js };
}
function getAllSettingsRegistry() {
  const tabs = []; const sections = [];
  for (const [key, info] of Object.entries(PLUGIN_REGISTRY)) {
    if (info._state) {
      for (const [tabKey, title, func] of info._state.settingsTabs) {
        let html = '';
        try { html = func() || ''; } catch (e) { logger.error(`Settings tab ${tabKey} error: ${e.message}`); }
        tabs.push({ plugin: key, key: tabKey, title, html });
      }
      for (const [existingTab, title, func] of info._state.settingsSections) {
        let html = '';
        try { html = func() || ''; } catch (e) { logger.error(`Settings section ${title} error: ${e.message}`); }
        sections.push({ plugin: key, tab: existingTab, title, html });
      }
    }
  }
  return { tabs, sections };
}
function getThemes() { return THEME_REGISTRY; }
function getClientAssets() {
  const assets = { js: [], css: [] };
  if (!fs.existsSync(PLUGINS_DIR)) return assets;
  for (const folder of fs.readdirSync(PLUGINS_DIR)) {
    const dir = path.join(PLUGINS_DIR, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    const candidates = ['client.js', 'client.css'];
    const webDir = path.join(dir, 'web');
    if (fs.existsSync(webDir)) {
      for (const f of fs.readdirSync(webDir)) candidates.push('web/' + f);
    }
    for (const rel of candidates) {
      const full = path.join(dir, rel);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
      if (rel.endsWith('.js')) assets.js.push('/plugins/' + folder + '/' + rel);
      else if (rel.endsWith('.css')) assets.css.push('/plugins/' + folder + '/' + rel);
    }
  }
  return assets;
}

registerCommand('fetch_plugin_assets')(async (params, { socket }) => {
  socket.emit('plugin_assets', getClientAssets());
});
registerCommand('fetch_plugin_injections')(async (params, { socket }) => {
  socket.emit('plugin_injections', getAllInjections());
});
registerCommand('fetch_plugin_themes')(async (params, { socket }) => {
  socket.emit('plugin_themes', getThemes());
});

module.exports = {
  PLUGIN_REGISTRY, PLUGINS_DIR, OVERRIDE_REGISTRY, THEME_REGISTRY, API_MAJOR: api.API_MAJOR,
  load_assignments: loadAssignments, save_assignments: saveAssignments,
  get_assigned_plugins: getAssignedPlugins, unload_all_plugins: unloadAllPlugins,
  teardown_plugin: teardownPlugin, load_plugins_for_token: loadPluginsForToken,
  get_all_injections: getAllInjections, get_all_settings_registry: getAllSettingsRegistry,
  resolve_ui_slot: resolveUiSlot, resolve_override: resolveOverride,
  get_client_assets: getClientAssets, get_themes: getThemes,
  loadAssignments, saveAssignments, getAssignedPlugins, unloadAllPlugins,
  teardownPlugin, loadPluginsForToken, getAllInjections, getAllSettingsRegistry,
  resolveUiSlot, resolveOverride, getClientAssets, getThemes, ArklumAPI, PluginState
};