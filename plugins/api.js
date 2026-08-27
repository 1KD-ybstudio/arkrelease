const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { io, logger, getBot, renderMessage, getAvatarUrl, embedToDict } = require('../bot');

const API_VERSION = '1.0.0';
const API_MAJOR = 1;
const REST_PORT = 8001;
const KEY_FILE = path.join('.arklum_sys', 'config', 'api_key.json');
const KV_DIR = path.join('.arklum_sys', 'config', 'kv');

class ArklumError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status || 500; }
}
const err = {
  val: (m) => new ArklumError('VALIDATION', m, 400),
  nf: (m) => new ArklumError('NOT_FOUND', m, 404),
  perm: (m) => new ArklumError('PERMISSION', m, 403),
  core: (m) => new ArklumError('CORE', m, 500)
};

const METHODS = {};
function def(ns, name, opts, handler) {
  METHODS[ns + '.' + name] = Object.assign(
    { ns, name, scope: 'read', stability: 'stable', since: API_VERSION, desc: '', params: [] },
    opts, { handler }
  );
}
const isSnow = (v) => typeof v === 'string' && /^\d{5,25}$/.test(v);
function botReady() {
  const bot = getBot();
  if (!bot || !bot.isReady()) throw err.core('Bot not connected');
  return bot;
}
function getChannel(bot, id) {
  if (!isSnow(id)) throw err.val('Invalid channel id');
  const ch = bot.channels.cache.get(id);
  if (!ch) throw err.nf('Channel not found');
  return ch;
}
function firstGuild(bot, guildId) {
  if (guildId && isSnow(guildId)) {
    const g = bot.guilds.cache.get(guildId);
    if (!g) throw err.nf('Guild not found');
    return g;
  }
  const g = bot.guilds.cache.first();
  if (!g) throw err.nf('No guild');
  return g;
}
async function msgDict(bot, msg) {
  const rendered = await renderMessage(msg.content, msg.guild, bot);
  return {
    id: String(msg.id), channel_id: String(msg.channel.id),
    author_id: String(msg.author.id), author: msg.author.tag,
    display_name: msg.member ? msg.member.displayName : msg.author.displayName,
    avatar_url: getAvatarUrl(msg.author), content_raw: msg.content, segments: rendered,
    embeds: msg.embeds.map(embedToDict),
    attachments: msg.attachments.map(a => ({ url: a.url, filename: a.filename })),
    timestamp: msg.createdAt.toISOString(), edited: msg.editedAt !== null,
    reply_to: msg.reference ? String(msg.reference.messageId) : null
  };
}

def('messages', 'send', { scope: 'write', params: ['channel_id', 'content', 'reply_to'] }, async (p) => {
  const bot = botReady();
  const ch = getChannel(bot, p.channel_id);
  const payload = {};
  if (p.content) payload.content = String(p.content);
  if (!payload.content) throw err.val('content required');
  if (p.reply_to && isSnow(p.reply_to)) {
    try { payload.reply = { messageReference: await ch.messages.fetch(p.reply_to) }; } catch (e) {}
  }
  const msg = await ch.send(payload);
  return { id: String(msg.id) };
});
def('messages', 'edit', { scope: 'write', params: ['channel_id', 'message_id', 'content'] }, async (p) => {
  const bot = botReady();
  const msg = await getChannel(bot, p.channel_id).messages.fetch(p.message_id);
  if (msg.author.id !== bot.user.id) throw err.perm('Can only edit own messages');
  await msg.edit({ content: String(p.content || '') });
  return { ok: true };
});
def('messages', 'delete', { scope: 'moderate', params: ['channel_id', 'message_id'] }, async (p) => {
  const bot = botReady();
  const msg = await getChannel(bot, p.channel_id).messages.fetch(p.message_id);
  if (msg.author.id !== bot.user.id) throw err.perm('Can only delete own messages');
  await msg.delete();
  return { ok: true };
});
def('messages', 'pin', { scope: 'write', params: ['channel_id', 'message_id'] }, async (p) => {
  const bot = botReady();
  await (await getChannel(bot, p.channel_id).messages.fetch(p.message_id)).pin();
  return { ok: true };
});
def('messages', 'react', { scope: 'write', params: ['channel_id', 'message_id', 'emoji'] }, async (p) => {
  const bot = botReady();
  if (!p.emoji) throw err.val('emoji required');
  await (await getChannel(bot, p.channel_id).messages.fetch(p.message_id)).react(p.emoji);
  return { ok: true };
});
def('messages', 'fetch', { scope: 'read', params: ['channel_id', 'limit', 'before'] }, async (p) => {
  const bot = botReady();
  const opts = { limit: Math.min(parseInt(p.limit, 10) || 50, 100) };
  if (p.before && isSnow(p.before)) opts.before = p.before;
  const fetched = await getChannel(bot, p.channel_id).messages.fetch(opts);
  const out = [];
  for (const m of fetched.values()) out.push(await msgDict(bot, m));
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
});
def('messages', 'search', { scope: 'read', params: ['channel_id', 'query'] }, async (p) => {
  const bot = botReady();
  if (!p.query) throw err.val('query required');
  const fetched = await getChannel(bot, p.channel_id).messages.fetch({ limit: 100 });
  const q = String(p.query).toLowerCase();
  const out = [];
  for (const m of fetched.values()) if (m.content.toLowerCase().includes(q)) out.push(await msgDict(bot, m));
  return out.slice(0, 25);
});
def('messages', 'typing', { scope: 'write', params: ['channel_id'] }, async (p) => {
  const bot = botReady();
  await getChannel(bot, p.channel_id).sendTyping();
  return { ok: true };
});
def('channels', 'list', { scope: 'read', params: ['guild_id'] }, async (p) => {
  const bot = botReady();
  return firstGuild(bot, p.guild_id).channels.cache.map(c => ({ id: String(c.id), name: c.name, type: c.type, category_id: c.parentId ? String(c.parentId) : null }));
});
def('channels', 'get', { scope: 'read', params: ['channel_id'] }, async (p) => {
  const bot = botReady();
  const c = getChannel(bot, p.channel_id);
  return { id: String(c.id), name: c.name, type: c.type, topic: c.topic || null };
});
def('channels', 'create', { scope: 'manage', params: ['name', 'type', 'category_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  if (!p.name) throw err.val('name required');
  const c = await firstGuild(bot, p.guild_id).channels.create({ name: p.name, type: p.type === 'voice' ? 2 : 0, parent: p.category_id || null });
  return { id: String(c.id) };
});
def('channels', 'edit', { scope: 'manage', params: ['channel_id', 'name', 'topic'] }, async (p) => {
  const bot = botReady();
  const patch = {};
  if (p.name) patch.name = p.name;
  if (p.topic !== undefined) patch.topic = p.topic;
  await getChannel(bot, p.channel_id).edit(patch);
  return { ok: true };
});
def('channels', 'delete', { scope: 'manage', params: ['channel_id'] }, async (p) => {
  const bot = botReady();
  await getChannel(bot, p.channel_id).delete();
  return { ok: true };
});
def('dms', 'open', { scope: 'write', params: ['user_id'] }, async (p) => {
  const bot = botReady();
  if (!isSnow(p.user_id)) throw err.val('Invalid user id');
  const user = await bot.users.fetch(p.user_id);
  const dm = user.dmChannel || await user.createDM();
  return { channel_id: String(dm.id) };
});
def('dms', 'send', { scope: 'write', params: ['user_id', 'content'] }, async (p) => {
  const bot = botReady();
  const user = await bot.users.fetch(p.user_id);
  const dm = user.dmChannel || await user.createDM();
  const msg = await dm.send({ content: String(p.content || '') });
  return { id: String(msg.id) };
});
def('guilds', 'current', { scope: 'read', params: ['guild_id'] }, async (p) => {
  const bot = botReady();
  const g = firstGuild(bot, p.guild_id);
  return { id: String(g.id), name: g.name, member_count: g.memberCount, description: g.description || null };
});
def('guilds', 'stats', { scope: 'read', params: ['guild_id'] }, async (p) => {
  const bot = botReady();
  const g = firstGuild(bot, p.guild_id);
  const chans = [...g.channels.cache.values()];
  return { members: g.memberCount, text: chans.filter(c => c.type === 0).length, voice: chans.filter(c => c.type === 2).length, roles: g.roles.cache.size };
});
def('guilds', 'edit', { scope: 'manage', params: ['guild_id', 'name', 'description'] }, async (p) => {
  const bot = botReady();
  const patch = {};
  if (p.name) patch.name = p.name;
  if (p.description !== undefined) patch.description = p.description;
  await firstGuild(bot, p.guild_id).edit(patch);
  return { ok: true };
});
def('guilds', 'audit', { scope: 'moderate', params: ['guild_id', 'limit'] }, async (p) => {
  const bot = botReady();
  const logs = await firstGuild(bot, p.guild_id).fetchAuditLogs({ limit: Math.min(parseInt(p.limit, 10) || 50, 100) });
  return logs.entries.map(e => ({ action: e.action, executor: e.executor ? e.executor.tag : null, target: e.target ? String(e.target.id) : null, reason: e.reason || null }));
});
def('members', 'list', { scope: 'read', params: ['guild_id', 'limit'] }, async (p) => {
  const bot = botReady();
  const cap = Math.min(parseInt(p.limit, 10) || 200, 500);
  return [...firstGuild(bot, p.guild_id).members.cache.values()].slice(0, cap).map(m => ({ id: String(m.id), name: m.displayName, username: m.user.username, status: m.presence ? m.presence.status : 'offline' }));
});
def('members', 'get', { scope: 'read', params: ['user_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  return { id: String(m.id), name: m.displayName, username: m.user.username, nick: m.nickname, roles: m.roles.cache.map(r => r.name) };
});
def('members', 'search', { scope: 'read', params: ['query', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const q = String(p.query || '').toLowerCase();
  return [...firstGuild(bot, p.guild_id).members.cache.values()].filter(m => m.displayName.toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q)).slice(0, 50).map(m => ({ id: String(m.id), name: m.displayName, username: m.user.username }));
});
def('members', 'kick', { scope: 'moderate', params: ['user_id', 'guild_id', 'reason'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  await m.kick(p.reason || null);
  return { ok: true };
});
def('members', 'ban', { scope: 'moderate', params: ['user_id', 'guild_id', 'reason'] }, async (p) => {
  const bot = botReady();
  await firstGuild(bot, p.guild_id).members.ban(p.user_id, { reason: p.reason || null });
  return { ok: true };
});
def('members', 'unban', { scope: 'moderate', params: ['user_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  await firstGuild(bot, p.guild_id).members.unban(p.user_id);
  return { ok: true };
});
def('members', 'timeout', { scope: 'moderate', params: ['user_id', 'guild_id', 'seconds', 'reason'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  await m.timeout((parseInt(p.seconds, 10) || 60) * 1000, p.reason || null);
  return { ok: true };
});
def('members', 'nick', { scope: 'moderate', params: ['user_id', 'guild_id', 'nick'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  await m.setNickname(p.nick || null);
  return { ok: true };
});
def('members', 'roleAdd', { scope: 'moderate', params: ['user_id', 'role_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  await m.roles.add(p.role_id);
  return { ok: true };
});
def('members', 'roleRemove', { scope: 'moderate', params: ['user_id', 'role_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const m = await firstGuild(bot, p.guild_id).members.fetch(p.user_id);
  await m.roles.remove(p.role_id);
  return { ok: true };
});
def('roles', 'list', { scope: 'read', params: ['guild_id'] }, async (p) => {
  const bot = botReady();
  return [...firstGuild(bot, p.guild_id).roles.cache.values()].map(r => ({ id: String(r.id), name: r.name, color: r.color }));
});
def('roles', 'create', { scope: 'manage', params: ['name', 'color', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const r = await firstGuild(bot, p.guild_id).roles.create({ name: p.name || 'role', color: p.color || null });
  return { id: String(r.id) };
});
def('roles', 'delete', { scope: 'manage', params: ['role_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const r = firstGuild(bot, p.guild_id).roles.cache.get(p.role_id);
  if (!r) throw err.nf('Role not found');
  await r.delete();
  return { ok: true };
});
def('emojis', 'list', { scope: 'read', params: ['guild_id'] }, async (p) => {
  const bot = botReady();
  return [...firstGuild(bot, p.guild_id).emojis.cache.values()].map(e => ({ id: String(e.id), name: e.name, url: e.url }));
});
def('users', 'profile', { scope: 'read', params: ['user_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const user = await bot.users.fetch(p.user_id);
  const g = firstGuild(bot, p.guild_id);
  const member = g.members.cache.get(user.id);
  return { id: String(user.id), username: user.username, display_name: user.displayName, avatar_url: getAvatarUrl(user), bot: user.bot, member_since: member ? member.joinedAt : null };
});
def('users', 'presence', { scope: 'read', params: ['user_id', 'guild_id'] }, async (p) => {
  const bot = botReady();
  const m = firstGuild(bot, p.guild_id).members.cache.get(p.user_id);
  return { status: m && m.presence ? m.presence.status : 'offline' };
});
def('storage', 'get', { scope: 'read', params: ['key', 'scope'] }, async (p) => {
  try {
    fs.mkdirSync(KV_DIR, { recursive: true });
    const j = JSON.parse(fs.readFileSync(path.join(KV_DIR, (p.scope || 'global').replace(/[^a-z0-9_-]/gi, '') + '.json'), 'utf8'));
    return p.key in j ? j[p.key] : null;
  } catch (e) { return null; }
});
def('storage', 'set', { scope: 'write', params: ['key', 'value', 'scope'] }, async (p) => {
  if (!p.key) throw err.val('key required');
  fs.mkdirSync(KV_DIR, { recursive: true });
  const f = path.join(KV_DIR, (p.scope || 'global').replace(/[^a-z0-9_-]/gi, '') + '.json');
  let j = {};
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  j[p.key] = p.value;
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
  return { ok: true };
});
def('commands', 'list', { scope: 'read', params: [] }, async () => {
  const { commandHandlers } = require('../bot');
  return Object.keys(commandHandlers);
});
def('plugins', 'list', { scope: 'read', params: [] }, async () => {
  const { PLUGIN_REGISTRY } = require('./loader');
  return Object.entries(PLUGIN_REGISTRY).map(([key, i]) => ({ key, name: i.name, version: i.version, author: i.author, loaded: !!i.loaded, description: i.description }));
});
def('system', 'version', { scope: 'read', params: [] }, async () => {
  let core = '0.0.0';
  try { core = require('../package.json').version; } catch (e) {}
  return { api: API_VERSION, core };
});
def('system', 'ping', { scope: 'read', params: [] }, async () => ({ pong: true, t: Date.now() }));
def('system', 'uptime', { scope: 'read', params: [] }, async () => ({ seconds: Math.round(process.uptime()) }));
def('system', 'docs', { scope: 'read', params: [] }, async () => {
  return Object.values(METHODS).map(m => ({ key: m.ns + '.' + m.name, scope: m.scope, stability: m.stability, since: m.since, desc: m.desc, params: m.params }));
});

async function run(ctx, key, params) {
  const m = METHODS[key];
  if (!m) throw err.nf('Unknown method: ' + key);
  const scopes = ctx && ctx.scopes ? ctx.scopes : ['*'];
  if (scopes !== '*' && !scopes.includes('*') && !scopes.includes(m.scope)) {
    throw err.perm('Missing scope: ' + m.scope);
  }
  return await m.handler(params || {}, ctx || {});
}

io.on('connection', (socket) => {
  socket.emit('arklum_hello', { version: API_VERSION, methods: Object.keys(METHODS) });
  socket.on('arklum_call', async (payload, cb) => {
    const ack = typeof cb === 'function' ? cb : () => {};
    try {
      const result = await run({ scopes: ['*'], socket }, payload && payload.key, payload && payload.params);
      ack({ ok: true, result });
    } catch (e) {
      ack({ ok: false, error: { code: e.code || 'CORE', message: e.message } });
    }
  });
});

let eventsWired = false;
function ensureEvents() {
  if (eventsWired) return;
  const bot = getBot();
  if (!bot || !bot.isReady()) return;
  eventsWired = true;
  const emit = (name, data) => io.emit('arklum_event', { name, data });
  bot.on('messageCreate', async (msg) => { try { emit('messages.create', await msgDict(bot, msg)); } catch (e) {} });
  bot.on('messageUpdate', (o, n) => emit('messages.update', { id: String(n.id), channel_id: String(n.channel.id), content: n.content }));
  bot.on('messageDelete', (msg) => emit('messages.delete', { id: String(msg.id), channel_id: String(msg.channel.id) }));
  bot.on('messageReactionAdd', (r, user) => emit('reactions.add', { message_id: String(r.message.id), channel_id: String(r.message.channel.id), emoji: String(r.emoji), user_id: user ? String(user.id) : null }));
  bot.on('guildMemberAdd', (m) => emit('members.join', { user_id: String(m.id), name: m.displayName }));
  bot.on('guildMemberRemove', (m) => emit('members.leave', { user_id: String(m.id), name: m.displayName }));
  bot.on('typingStart', (t) => emit('typing', { channel_id: t.channel ? String(t.channel.id) : null, user_id: t.user ? String(t.user.id) : null }));
  bot.on('voiceStateUpdate', (o, n) => emit('voice.state', { user_id: String(n.id), channel_id: n.channelId ? String(n.channelId) : null }));
  bot.on('presenceUpdate', (o, n) => emit('presence', { user_id: String(n.id), status: n.status }));
  logger.info('[API] event bridge wired');
}
setInterval(ensureEvents, 5000);

function ensureKey() {
  try {
    if (fs.existsSync(KEY_FILE)) return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')).key;
  } catch (e) {}
  const key = crypto.randomBytes(24).toString('hex');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, JSON.stringify({ key }, null, 2));
  return key;
}

const SYS_KEY = path.join('.arklum_sys', 'key.bin');
const DOCS_ENC = path.join('.arklum_sys', 'docs.enc');
const DOCS_PLAIN = path.join(__dirname, 'docs_site.html');
const DOCS_REPO = 'https://raw.githubusercontent.com/NEW4ONEDK/arklum-plugins/main/docs.html';
let docsCache = null;
function xorBuf(data, key) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}
function getDocsHtml() {
  if (docsCache) return docsCache;
  try {
    if (fs.existsSync(DOCS_ENC) && fs.existsSync(SYS_KEY)) {
      const dec = xorBuf(fs.readFileSync(DOCS_ENC), fs.readFileSync(SYS_KEY)).toString('utf8');
      if (dec.includes('<')) { docsCache = dec; return dec; }
    }
  } catch (e) {}
  return null;
}
function initDocs() {
  try {
    if (fs.existsSync(DOCS_PLAIN) && fs.existsSync(SYS_KEY)) {
      fs.mkdirSync(path.dirname(DOCS_ENC), { recursive: true });
      fs.writeFileSync(DOCS_ENC, xorBuf(fs.readFileSync(DOCS_PLAIN), fs.readFileSync(SYS_KEY)));
      fs.unlinkSync(DOCS_PLAIN);
    }
  } catch (e) { logger.error('[API] docs encrypt failed: ' + e.message); }
  if (!fs.existsSync(DOCS_ENC)) {
    fetch(DOCS_REPO).then(r => (r.ok ? r.text() : null)).then(t => {
      if (t && t.includes('<') && fs.existsSync(SYS_KEY)) {
        fs.mkdirSync(path.dirname(DOCS_ENC), { recursive: true });
        fs.writeFileSync(DOCS_ENC, xorBuf(Buffer.from(t, 'utf8'), fs.readFileSync(SYS_KEY)));
        logger.info('[API] docs pulled from repo & encrypted');
      }
    }).catch(() => {});
  }
}

function startRest() {
  initDocs();
  const apiKey = ensureKey();
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
      res.end(JSON.stringify(obj));
    };
    if (req.method === 'OPTIONS') return send(200, { ok: true });
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const html = getDocsHtml();
      if (html) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Docs not available yet — drop plugins/docs_site.html once and restart, or push docs.html to the repo.');
      }
      return;
    }
    if (u.pathname === '/api/v1/health') return send(200, { ok: true, version: API_VERSION });
    if (u.pathname === '/api/v1/docs') {
      return send(200, { version: API_VERSION, methods: Object.values(METHODS).map(m => ({ key: m.ns + '.' + m.name, scope: m.scope, stability: m.stability, desc: m.desc, params: m.params })) });
    }
    if (req.headers['x-arkulum-key'] !== apiKey) return send(401, { error: { code: 'AUTH', message: 'Bad API key' } });
    const mm = u.pathname.match(/^\/api\/v1\/([a-zA-Z]+)\/([a-zA-Z]+)$/);
    if (!mm) return send(404, { error: { code: 'NOT_FOUND', message: 'Unknown route' } });
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', async () => {
      let params = {};
      try { if (body) params = JSON.parse(body); } catch (e) { return send(400, { error: { code: 'VALIDATION', message: 'Bad JSON' } }); }
      for (const [k, v] of u.searchParams) params[k] = v;
      try {
        const result = await run({ scopes: ['*'], rest: true }, mm[1] + '.' + mm[2], params);
        send(200, { ok: true, result });
      } catch (e) {
        send(e.status || 500, { error: { code: e.code || 'CORE', message: e.message } });
      }
    });
  }).listen(REST_PORT, '127.0.0.1', () => {
  });
}
try { startRest(); } catch (e) { logger.error('[API] REST failed to start: ' + e.message); }

module.exports = { API_VERSION, API_MAJOR, METHODS, run, ArklumError };