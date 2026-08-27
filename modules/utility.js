// modules/utility.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ChannelType, Events, PermissionFlagsBits } = require('discord.js');
const { io, registerCommand, commandHandlers, logger, getBot, getBotDataDir } = require('../bot');

const DEFAULT_AUTH = { users: {} };
const DEFAULT_AR = { users: {} };
const DEFAULT_IMP = { entries: [] };
const DEFAULT_HUSH = { users: [] };
const dmTasks = new Map();

function getUtilityConfigPath(filename) {
  const botDir = getBotDataDir();
  const utilDir = path.join(botDir, 'utility');
  fs.mkdirSync(utilDir, { recursive: true });
  return path.join(utilDir, filename);
}

function loadJson(configPath, defaultData) {
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      for (const key of Object.keys(defaultData)) {
        if (!(key in cfg)) cfg[key] = defaultData[key];
      }
      return cfg;
    } catch {
      return { ...defaultData };
    }
  }
  return { ...defaultData };
}

function saveJson(configPath, data) {
  try {
    fs.writeFileSync(configPath + '.tmp', JSON.stringify(data));
    fs.renameSync(configPath + '.tmp', configPath);
  } catch {}
}

function loadImpersonation() {
  return loadJson(getUtilityConfigPath('impersonation_config.json'), DEFAULT_IMP);
}

function saveImpersonation(data) {
  saveJson(getUtilityConfigPath('impersonation_config.json'), data);
}

async function emitAuthorizedList() {
  const cfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  io.emit('utility_authorized_list', { users: cfg.users || {} });
}

async function emitAutoreactList() {
  const cfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
  io.emit('utility_autoreact_list', { users: cfg.users || {} });
}

function findMember(guild, identifier) {
  try {
    const uid = identifier;
    const member = guild.members.cache.get(uid);
    if (member) return member;
  } catch {}
  const byName = guild.members.cache.find(m => m.user.username === identifier);
  if (byName) return byName;
  const byDisplay = guild.members.cache.find(m => m.displayName === identifier);
  if (byDisplay) return byDisplay;
  return guild.members.cache.find(m => m.nickname === identifier) || null;
}

function getSystemInfo() {
  const b = getBot();
  const info = {
    ping: b ? Math.round(b.ws.ping) : 0,
    uptime: 0,
    memory: 'N/A',
    guilds: b ? b.guilds.cache.size : 0,
    users: b ? b.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) : 0
  };
  if (b && b.startTime) {
    const now = new Date();
    info.uptime = Math.round((now - b.startTime) / 1000);
  }
  try {
    const total = os.totalmem();
    const used = total - os.freemem();
    info.memory = `${Math.round((used / total) * 100)}% used (${Math.floor(used / 1024**2)} MB / ${Math.floor(total / 1024**2)} MB)`;
  } catch {}
  return info;
}

async function getOrCreateWebhook(channel, name) {
  try {
    const webhooks = await channel.fetchWebhooks();
    for (const wh of webhooks.values()) {
      if (wh.name === name) {
        if (wh.token) return wh;
        await wh.delete();
        break;
      }
    }
  } catch {}
  try {
    return await channel.createWebhook({ name });
  } catch {
    return null;
  }
}

async function dmAnnounceTask(guildId, members, message, batchSize, speed, socket) {
  const total = members.length;
  let success = 0;
  let failed = 0;
  let index = 0;

  const emitProgress = () => {
    const task = dmTasks.get(guildId);
    socket.emit('dm_announce_progress', {
      guild_id: guildId,
      total,
      success,
      failed,
      running: task ? task.running : false,
      paused: task ? task.paused : false
    });
  };

  while (index < total) {
    const task = dmTasks.get(guildId);
    if (!task || !task.running) break;
    while (task.paused) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const batch = members.slice(index, index + batchSize);
    await Promise.all(batch.map(async member => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await member.send(message);
          success++;
          break;
        } catch (e) {
          if (e.status === 429 && attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, e.retryAfter || 1000));
            continue;
          }
          failed++;
          break;
        }
      }
    }));

    index += batchSize;
    if (index < total) await new Promise(resolve => setTimeout(resolve, speed * 1000));
    emitProgress();
  }

  const task = dmTasks.get(guildId);
  if (task) task.running = false;
  emitProgress();
}

registerCommand('utility_authorized_list')(async (params, { socket }) => {
  await emitAuthorizedList();
});

registerCommand('utility_authorized_add')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const guildId = params.guild_id;
  const identifier = (params.identifier || '').trim();
  if (!guildId || !identifier) return;
  const guild = b.guilds.cache.get(guildId);
  if (!guild) {
    socket.emit('error', { message: 'Server not found' });
    return;
  }
  const member = findMember(guild, identifier);
  if (!member) {
    socket.emit('error', { message: 'User not found' });
    return;
  }
  const uid = String(member.id);
  const cfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  const users = cfg.users || {};
  if (uid in users) {
    socket.emit('error', { message: 'User already authorized' });
    return;
  }
  users[uid] = { name: member.displayName, prefix: '!', features: [] };
  cfg.users = users;
  saveJson(getUtilityConfigPath('authorized_config.json'), cfg);
  socket.emit('notification', `Authorized ${member.displayName}`);
  await emitAuthorizedList();
});

registerCommand('utility_authorized_remove')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const cfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  if (uid in (cfg.users || {})) {
    delete cfg.users[uid];
    saveJson(getUtilityConfigPath('authorized_config.json'), cfg);
    socket.emit('notification', 'User removed from authorized list');
  }
  await emitAuthorizedList();
});

registerCommand('utility_authorized_set_prefix')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const prefix = params.prefix || '!';
  const cfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  if (uid in (cfg.users || {})) {
    cfg.users[uid].prefix = prefix;
    saveJson(getUtilityConfigPath('authorized_config.json'), cfg);
    socket.emit('notification', `Prefix set to ${prefix}`);
  }
  await emitAuthorizedList();
});

registerCommand('utility_authorized_toggle_feature')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const feature = params.feature || '';
  const cfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  if (!(uid in (cfg.users || {}))) return;
  const users = cfg.users;
  const features = users[uid].features || [];
  if (features.includes(feature)) {
    users[uid].features = features.filter(f => f !== feature);
  } else {
    features.push(feature);
    users[uid].features = features;
  }
  saveJson(getUtilityConfigPath('authorized_config.json'), cfg);
  await emitAuthorizedList();
});

registerCommand('utility_impersonation_list')(async (params, { socket }) => {
  const cfg = loadImpersonation();
  socket.emit('utility_impersonation_list', { entries: cfg.entries || [] });
});

registerCommand('utility_impersonation_add')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const guildId = params.guild_id;
  const targetIdentifier = (params.target || '').trim();
  const controlIdentifier = (params.control || '').trim();
  const prefix = (params.prefix || '!').trim();
  const channelId = (params.channel_id || '').trim();
  if (!guildId || !targetIdentifier || !controlIdentifier || !prefix || !channelId) return;

  const guild = b.guilds.cache.get(guildId);
  if (!guild) return;

  const control = findMember(guild, controlIdentifier);
  if (!control) {
    socket.emit('error', { message: 'Control user not found' });
    return;
  }
  const channel = guild.channels.cache.get(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    socket.emit('error', { message: 'Channel not found' });
    return;
  }

  const wh = await getOrCreateWebhook(channel, 'Arklum Impersonator');
  if (!wh) {
    socket.emit('error', { message: 'Cannot create webhook – check bot permissions' });
    return;
  }

  let targetName = targetIdentifier;
  let targetAvatar = null;
  let targetId = targetIdentifier;
  const target = findMember(guild, targetIdentifier);
  if (target) {
    targetName = target.displayName;
    targetAvatar = target.displayAvatarURL({ format: 'png', size: 128 });
    targetId = String(target.id);
  } else {
    try {
      const user = await b.users.fetch(targetIdentifier);
      targetName = user.displayName;
      targetAvatar = user.displayAvatarURL({ format: 'png', size: 128 });
      targetId = String(user.id);
    } catch {
      socket.emit('error', { message: 'Target user not found' });
      return;
    }
  }

  const cfg = loadImpersonation();
  const entries = cfg.entries || [];
  entries.push({
    target_id: targetId,
    target_name: targetName,
    target_avatar_url: targetAvatar,
    control_id: String(control.id),
    control_name: control.displayName,
    prefix,
    channel_id: channelId,
    channel_name: `#${channel.name}`,
    enabled: true
  });
  cfg.entries = entries;
  saveImpersonation(cfg);

  socket.emit('notification', `Impersonation added for ${control.displayName} -> ${targetName}`);
  await commandHandlers['utility_impersonation_list']({}, { socket });
});

registerCommand('utility_impersonation_remove')(async (params, { socket }) => {
  const idx = parseInt(params.index, 10);
  const cfg = loadImpersonation();
  const entries = cfg.entries || [];
  if (!isNaN(idx) && idx >= 0 && idx < entries.length) {
    entries.splice(idx, 1);
    cfg.entries = entries;
    saveImpersonation(cfg);
    socket.emit('notification', 'Impersonation removed');
  }
  await commandHandlers['utility_impersonation_list']({}, { socket });
});

registerCommand('utility_impersonation_toggle')(async (params, { socket }) => {
  const idx = parseInt(params.index, 10);
  const cfg = loadImpersonation();
  const entries = cfg.entries || [];
  if (!isNaN(idx) && idx >= 0 && idx < entries.length) {
    entries[idx].enabled = !entries[idx].enabled;
    cfg.entries = entries;
    saveImpersonation(cfg);
  }
  await commandHandlers['utility_impersonation_list']({}, { socket });
});

registerCommand('utility_impersonation_set_channel')(async (params, { socket }) => {
  const b = getBot();
  const idx = parseInt(params.index, 10);
  const channelId = (params.channel_id || '').trim();
  const cfg = loadImpersonation();
  const entries = cfg.entries || [];
  if (!isNaN(idx) && idx >= 0 && idx < entries.length && b) {
    const channel = b.channels.cache.get(channelId);
    if (channel && channel.type === ChannelType.GuildText) {
      entries[idx].channel_id = channelId;
      entries[idx].channel_name = `#${channel.name}`;
      cfg.entries = entries;
      saveImpersonation(cfg);
      socket.emit('notification', 'Channel updated');
    }
  }
  await commandHandlers['utility_impersonation_list']({}, { socket });
});

registerCommand('dm_announce_start')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const guildId = params.guild_id;
  const message = params.message || '';
  const roleId = params.role_id;
  const batchSize = parseInt(params.batch_size, 10) || 3;
  const speed = parseFloat(params.speed) || 0.5;
  if (!guildId || !message) return;

  const guild = b.guilds.cache.get(guildId);
  if (!guild) return;

  if (dmTasks.has(guildId) && dmTasks.get(guildId).running) {
    socket.emit('error', { message: 'A DM Announce is already running in this server' });
    return;
  }

  let members = guild.members.cache.filter(m => !m.user.bot).map(m => m);
  if (roleId && roleId.trim()) {
    const role = guild.roles.cache.get(roleId);
    if (role) members = members.filter(m => m.roles.cache.has(role.id));
  }

  const total = members.length;
  if (total === 0) {
    socket.emit('notification', 'No members to DM');
    return;
  }

  const task = {
    running: true,
    paused: false,
    total,
    success: 0,
    failed: 0
  };
  dmTasks.set(guildId, task);
  dmAnnounceTask(guildId, members, message, batchSize, speed, socket);
  socket.emit('dm_announce_progress', {
    guild_id: guildId,
    total,
    success: 0,
    failed: 0,
    running: true,
    paused: false
  });
});

registerCommand('dm_announce_stop')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (dmTasks.has(guildId)) {
    dmTasks.get(guildId).running = false;
    socket.emit('dm_announce_progress', { guild_id: guildId, running: false });
  }
});

registerCommand('dm_announce_pause')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (dmTasks.has(guildId) && dmTasks.get(guildId).running) {
    dmTasks.get(guildId).paused = true;
    socket.emit('dm_announce_progress', { guild_id: guildId, paused: true });
  }
});

registerCommand('dm_announce_resume')(async (params, { socket }) => {
  const guildId = params.guild_id;
  if (dmTasks.has(guildId) && dmTasks.get(guildId).running) {
    dmTasks.get(guildId).paused = false;
    socket.emit('dm_announce_progress', { guild_id: guildId, paused: false });
  }
});

registerCommand('utility_autoreact_list')(async (params, { socket }) => {
  await emitAutoreactList();
});

registerCommand('utility_autoreact_add')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const emoji = (params.emoji || '').trim();
  if (!uid || !emoji) return;
  const cfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
  const users = cfg.users || {};
  if (!users[uid]) users[uid] = { name: uid, emojis: [] };
  if (!users[uid].emojis.includes(emoji)) users[uid].emojis.push(emoji);
  cfg.users = users;
  saveJson(getUtilityConfigPath('autoreact_config.json'), cfg);
  await emitAutoreactList();
});

registerCommand('utility_autoreact_remove')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const emoji = params.emoji || '';
  const cfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
  const users = cfg.users || {};
  if (uid in users && users[uid].emojis.includes(emoji)) {
    users[uid].emojis = users[uid].emojis.filter(e => e !== emoji);
    if (users[uid].emojis.length === 0) delete users[uid];
    cfg.users = users;
    saveJson(getUtilityConfigPath('autoreact_config.json'), cfg);
  }
  await emitAutoreactList();
});

registerCommand('utility_send_webhook')(async (params, { socket }) => {
  const url = (params.url || '').trim();
  const channelId = (params.channel_id || '').trim();
  const content = (params.content || '').trim();
  const username = (params.username || '').trim();
  const avatarUrl = (params.avatar_url || '').trim();
  const tts = params.tts || false;
  const embedData = params.embed;
  const threadName = (params.thread_name || '').trim();
  const files = params.files || [];

  let webhookUrl = url;

  if (!webhookUrl && channelId) {
    const b = getBot();
    if (!b || !b.isReady()) {
      socket.emit('error', { message: 'Bot not connected' });
      return;
    }
    const channel = b.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      socket.emit('error', { message: 'Channel not found' });
      return;
    }
    try {
      const webhooks = await channel.fetchWebhooks();
      if (webhooks.size > 0) {
        webhookUrl = webhooks.first().url;
      } else {
        try {
          const wh = await channel.createWebhook({ name: 'Arklum Studio' });
          webhookUrl = wh.url;
        } catch (e) {
          if (e.code === 50013) {
            if (username || avatarUrl) {
              socket.emit('notification', 'No webhook available. Sending as bot – custom identity ignored.');
            }
            const msgPayload = {};
            if (content) msgPayload.content = content;
            if (tts) msgPayload.tts = true;
            if (embedData && typeof embedData === 'object') {
              const embed = buildEmbedFromData(embedData);
              if (embed) msgPayload.embeds = [embed];
            }
            if (files.length > 0) {
              const discordFiles = files.map(f => ({
                attachment: Buffer.from(f.data, 'base64'),
                name: f.filename
              }));
              msgPayload.files = discordFiles;
            }
            await channel.send(msgPayload);
            socket.emit('notification', 'Message sent as bot');
            return;
          } else {
            logger.error(`Webhook creation error: ${e.message}`);
            socket.emit('error', { message: 'Could not create webhook' });
            return;
          }
        }
      }
    } catch (e) {
      logger.error(`Webhook channel error: ${e.message}`);
      socket.emit('error', { message: 'Failed to resolve channel' });
      return;
    }
  }

  if (!webhookUrl) {
    socket.emit('error', { message: 'No webhook URL or channel selected' });
    return;
  }

  const payload = {};
  if (content) payload.content = content;
  if (username) payload.username = username;
  if (avatarUrl) payload.avatar_url = avatarUrl;
  if (tts) payload.tts = true;
  if (threadName) payload.thread_name = threadName;

  if (embedData && typeof embedData === 'object') {
    const embed = buildEmbedFromData(embedData);
    if (embed) payload.embeds = [embed];
  }

  try {
    if (files.length > 0) {
      const form = new FormData();
      form.append('payload_json', JSON.stringify(payload));
      for (const f of files) {
        const fileBuffer = Buffer.from(f.data, 'base64');
        form.append('file', new Blob([fileBuffer]), f.filename);
      }
      const res = await fetch(webhookUrl, { method: 'POST', body: form });
      if (res.ok) {
        socket.emit('notification', 'Webhook sent');
      } else {
        const text = await res.text();
        socket.emit('error', { message: `Webhook failed (${res.status}): ${text.slice(0, 200)}` });
      }
    } else {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        socket.emit('notification', 'Webhook sent');
      } else {
        const text = await res.text();
        socket.emit('error', { message: `Webhook failed (${res.status}): ${text.slice(0, 200)}` });
      }
    }
  } catch (e) {
    logger.error(`Webhook send error: ${e.message}`);
    socket.emit('error', { message: `Failed to send webhook: ${e.message.slice(0, 200)}` });
  }
});

function buildEmbedFromData(embedData) {
  if (!embedData || typeof embedData !== 'object') return null;
  const embed = {};
  if (embedData.author_name) {
    embed.author = { name: embedData.author_name };
    if (embedData.author_url) embed.author.url = embedData.author_url;
    if (embedData.author_icon) embed.author.icon_url = embedData.author_icon;
  }
  if (embedData.title) {
    embed.title = embedData.title;
    if (embedData.title_url) embed.url = embedData.title_url;
  }
  if (embedData.description) embed.description = embedData.description;
  if (embedData.color) {
    try {
      embed.color = parseInt(embedData.color.replace('#', ''), 16);
    } catch {}
  }
  if (embedData.fields && Array.isArray(embedData.fields)) {
    embed.fields = embedData.fields
      .filter(f => f.name && f.value)
      .map(f => ({ name: f.name, value: f.value, inline: f.inline || false }));
  }
  if (embedData.image_url) embed.image = { url: embedData.image_url };
  if (embedData.thumbnail_url) embed.thumbnail = { url: embedData.thumbnail_url };
  if (embedData.footer_text) {
    embed.footer = { text: embedData.footer_text };
    if (embedData.footer_icon) embed.footer.icon_url = embedData.footer_icon;
  }
  if (embedData.timestamp) {
    embed.timestamp = new Date().toISOString();
  }
  return Object.keys(embed).length ? embed : null;
}

registerCommand('utility_upload_asset')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const filename = params.filename || 'image.png';
  const dataB64 = params.data || '';
  if (!dataB64) {
    socket.emit('error', { message: 'No file data' });
    return;
  }
  let fileData;
  try {
    fileData = Buffer.from(dataB64, 'base64');
  } catch {
    socket.emit('error', { message: 'Invalid file data' });
    return;
  }

  let assetChannel = null;
  for (const guild of b.guilds.cache.values()) {
    const ch = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === 'arklum-assets');
    if (ch) {
      assetChannel = ch;
      break;
    }
  }

  if (!assetChannel) {
    if (b.guilds.cache.size > 0) {
      try {
        const firstGuild = b.guilds.cache.first();
        assetChannel = await firstGuild.channels.create({
          name: 'arklum-assets',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: firstGuild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: firstGuild.members.me.id, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        });
      } catch {
        socket.emit('error', { message: 'Could not create asset channel' });
        return;
      }
    } else {
      socket.emit('error', { message: 'No servers available to store assets' });
      return;
    }
  }

  try {
    const msg = await assetChannel.send({
      files: [{ attachment: fileData, name: filename }]
    });
    const attachmentUrl = msg.attachments.first().url;
    socket.emit('asset_uploaded', { url: attachmentUrl });
  } catch (e) {
    logger.error(`Asset upload error: ${e.message}`);
    socket.emit('error', { message: 'Failed to upload asset' });
  }
});

registerCommand('utility_hush_list')(async (params, { socket }) => {
  const cfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
  const users = cfg.users || [];
  const detailed = [];
  const b = getBot();
  if (b && b.isReady()) {
    for (const uid of users) {
      let member = null;
      for (const guild of b.guilds.cache.values()) {
        member = guild.members.cache.get(uid);
        if (member) break;
      }
      if (member) {
        detailed.push({ id: uid, name: member.displayName, username: member.user.tag });
      } else {
        try {
          const user = await b.users.fetch(uid);
          detailed.push({ id: uid, name: user.displayName, username: user.tag });
        } catch {
          detailed.push({ id: uid, name: uid, username: uid });
        }
      }
    }
  } else {
    for (const uid of users) detailed.push({ id: uid, name: uid, username: uid });
  }
  socket.emit('utility_hush_list', { users: detailed });
});

registerCommand('utility_hush_add')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const guildId = params.guild_id;
  const identifier = (params.identifier || '').trim();
  if (!guildId || !identifier) return;
  const guild = b.guilds.cache.get(guildId);
  if (!guild) {
    socket.emit('error', { message: 'Server not found' });
    return;
  }
  const member = findMember(guild, identifier);
  if (!member) {
    socket.emit('error', { message: 'User not found' });
    return;
  }
  const uid = String(member.id);
  const cfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
  const users = cfg.users || [];
  if (users.includes(uid)) {
    socket.emit('error', { message: 'User is already hushed' });
    return;
  }
  users.push(uid);
  cfg.users = users;
  saveJson(getUtilityConfigPath('hush_config.json'), cfg);
  socket.emit('notification', `Hushed ${member.displayName}`);
  await commandHandlers['utility_hush_list']({}, { socket });
});

registerCommand('utility_hush_remove')(async (params, { socket }) => {
  const uid = params.user_id || '';
  const cfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
  const users = cfg.users || [];
  if (users.includes(uid)) {
    cfg.users = users.filter(u => u !== uid);
    saveJson(getUtilityConfigPath('hush_config.json'), cfg);
    socket.emit('notification', 'User removed from hush list');
  }
  await commandHandlers['utility_hush_list']({}, { socket });
});

registerCommand('utility_hush_clear')(async (params, { socket }) => {
  const cfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
  cfg.users = [];
  saveJson(getUtilityConfigPath('hush_config.json'), cfg);
  socket.emit('notification', 'All hushed users cleared');
  await commandHandlers['utility_hush_list']({}, { socket });
});

async function handleUtilityMessage(message) {
  const b = getBot();
  if (!b || !b.isReady()) return;
  if (message.author.id === b.user.id) return;

  const uid = String(message.author.id);

  const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
  const hushUsers = hushCfg.users || [];
  if (hushUsers.includes(uid) && message.guild) {
    try {
      await message.delete();
    } catch {}
    return;
  }

  const arCfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
  const arUsers = arCfg.users || {};
  if (uid in arUsers) {
    const emojis = arUsers[uid].emojis || [];
    for (const emoji of emojis) {
      try {
        await message.react(emoji);
      } catch (e) {
        if (e.status === 429) {
          await new Promise(resolve => setTimeout(resolve, e.retryAfter || 1000));
          try {
            await message.react(emoji);
          } catch {}
        }
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  const authCfg = loadJson(getUtilityConfigPath('authorized_config.json'), DEFAULT_AUTH);
  const authUsers = authCfg.users || {};
  const userData = authUsers[uid];
  const features = userData?.features || [];
  const prefix = userData?.prefix || '!';
  const content = message.content;

  const impCfg = loadImpersonation();
  for (const entry of impCfg.entries || []) {
    if (!entry.enabled) continue;
    if (uid !== entry.control_id) continue;
    if (!content.startsWith(entry.prefix)) continue;

    await message.delete();
    const text = content.slice(entry.prefix.length).trim();
    if (!text) return;

    let channel = null;
    for (const g of b.guilds.cache.values()) {
      const ch = g.channels.cache.get(entry.channel_id);
      if (ch) {
        channel = ch;
        break;
      }
    }
    if (!channel) return;

    const wh = await getOrCreateWebhook(channel, 'Arklum Impersonator');
    if (!wh) return;

    try {
      await wh.send({
        content: text,
        username: entry.target_name,
        avatarURL: entry.target_avatar_url || undefined
      });
    } catch (e) {
      logger.error(`Impersonation webhook error: ${e.message}`);
    }
    return;
  }

  if (!userData) return;
  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/\s+/);
  if (!args.length) return;
  const cmd = args[0].toLowerCase();
  const guild = message.guild;

  if (cmd === 'status') {
    await message.delete();
    const info = getSystemInfo();
    const embed = {
      title: 'Bot Status',
      color: 0x00d4aa,
      fields: [
        { name: 'Ping', value: `${info.ping}ms`, inline: false },
        { name: 'Uptime', value: `${info.uptime}s`, inline: false },
        { name: 'Memory', value: info.memory, inline: false },
        { name: 'Servers', value: String(info.guilds), inline: false },
        { name: 'Users', value: String(info.users), inline: false }
      ]
    };
    await message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === 'whois') {
    await message.delete();
    let target = null;
    if (message.mentions.members?.size) target = message.mentions.members.first();
    else if (args.length > 1 && guild) target = findMember(guild, args[1]);
    if (!target) {
      await message.channel.send('User not found.');
      return;
    }

    const embed = {
      title: `Whois: ${target.displayName}`,
      color: target.displayColor || 0x00d4aa,
      thumbnail: target.displayAvatarURL({ format: 'png', size: 128 }),
      fields: [
        { name: 'Display Name', value: target.displayName, inline: true },
        { name: 'Username', value: target.user.tag, inline: true },
        { name: 'ID', value: String(target.id), inline: true },
        { name: 'Nickname', value: target.nickname || 'None', inline: true },
        { name: 'Joined Server', value: target.joinedAt ? target.joinedAt.toISOString().slice(0, 19).replace('T', ' ') : 'Unknown', inline: true },
        { name: 'Account Created', value: target.user.createdAt.toISOString().slice(0, 19).replace('T', ' '), inline: true },
        { name: 'Bot', value: target.user.bot ? 'Yes' : 'No', inline: true }
      ]
    };
    const roles = target.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`);
    embed.fields.push({ name: 'Roles', value: roles.length ? roles.join(' ') : 'None', inline: false });
    const keyPerms = [];
    if (target.permissions.has(PermissionFlagsBits.Administrator)) keyPerms.push('Administrator');
    if (target.permissions.has(PermissionFlagsBits.ManageGuild)) keyPerms.push('Manage Server');
    if (target.permissions.has(PermissionFlagsBits.BanMembers)) keyPerms.push('Ban Members');
    if (target.permissions.has(PermissionFlagsBits.KickMembers)) keyPerms.push('Kick Members');
    if (target.permissions.has(PermissionFlagsBits.ManageMessages)) keyPerms.push('Manage Messages');
    if (keyPerms.length) embed.fields.push({ name: 'Key Permissions', value: keyPerms.join(', '), inline: false });
    embed.footer = { text: `Requested by ${message.author.displayName}`, icon_url: message.author.displayAvatarURL({ format: 'png', size: 128 }) };
    await message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === 'ar' && features.includes('ar')) {
    if (args.length < 2) return;
    const sub = args[1].toLowerCase();
    if (sub === 'add' && args.length >= 4) {
      await message.delete();
      let targetIdentifier = args[2];
      const mentionMatch = targetIdentifier.match(/^<@!?(\d+)>$/);
      if (mentionMatch) targetIdentifier = mentionMatch[1];
      const emojis = args.slice(3);
      const member = guild ? findMember(guild, targetIdentifier) : null;
      if (member) {
        const targetUid = String(member.id);
        const arCfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
        const users = arCfg.users || {};
        if (!users[targetUid]) users[targetUid] = { name: member.displayName, emojis: [] };
        for (const e of emojis) {
          if (!users[targetUid].emojis.includes(e)) users[targetUid].emojis.push(e);
        }
        arCfg.users = users;
        saveJson(getUtilityConfigPath('autoreact_config.json'), arCfg);
        await emitAutoreactList();
      }
    } else if (sub === 'clear' && args.length >= 3) {
      await message.delete();
      let targetIdentifier = args[2];
      const mentionMatch = targetIdentifier.match(/^<@!?(\d+)>$/);
      if (mentionMatch) targetIdentifier = mentionMatch[1];
      const member = guild ? findMember(guild, targetIdentifier) : null;
      if (member) {
        const targetUid = String(member.id);
        const arCfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
        if (targetUid in (arCfg.users || {})) {
          delete arCfg.users[targetUid];
          saveJson(getUtilityConfigPath('autoreact_config.json'), arCfg);
          await emitAutoreactList();
        }
      }
    } else if (sub === 'list') {
      await message.delete();
      const arCfg = loadJson(getUtilityConfigPath('autoreact_config.json'), DEFAULT_AR);
      const users = arCfg.users || {};
      if (Object.keys(users).length === 0) {
        await message.channel.send('No auto‑react users configured.');
      } else {
        const lines = [];
        for (const [uidStr, data] of Object.entries(users)) {
          lines.push(`**${data.name || 'Unknown'}**: ${(data.emojis || []).join(' ')}`);
        }
        await message.channel.send(lines.join('\n'));
      }
      await emitAutoreactList();
    }
    return;
  }

  if (cmd === 'hush' && features.includes('hush')) {
    if (args.length < 2) return;
    const sub = args[1].toLowerCase();
    if (sub === 'add' && args.length >= 3) {
      await message.delete();
      let targetIdentifier = args[2];
      const mentionMatch = targetIdentifier.match(/^<@!?(\d+)>$/);
      if (mentionMatch) targetIdentifier = mentionMatch[1];
      const member = guild ? findMember(guild, targetIdentifier) : null;
      if (member) {
        const uidStr = String(member.id);
        const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
        const users = hushCfg.users || [];
        if (!users.includes(uidStr)) {
          users.push(uidStr);
          hushCfg.users = users;
          saveJson(getUtilityConfigPath('hush_config.json'), hushCfg);
          await message.channel.send(`Hushed ${member.displayName}.`);
        } else {
          await message.channel.send(`${member.displayName} is already hushed.`);
        }
      }
    } else if (sub === 'remove' && args.length >= 3) {
      await message.delete();
      let targetIdentifier = args[2];
      const mentionMatch = targetIdentifier.match(/^<@!?(\d+)>$/);
      if (mentionMatch) targetIdentifier = mentionMatch[1];
      const member = guild ? findMember(guild, targetIdentifier) : null;
      if (member) {
        const uidStr = String(member.id);
        const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
        const users = hushCfg.users || [];
        if (users.includes(uidStr)) {
          hushCfg.users = users.filter(u => u !== uidStr);
          saveJson(getUtilityConfigPath('hush_config.json'), hushCfg);
          await message.channel.send(`Removed hush from ${member.displayName}.`);
        } else {
          await message.channel.send(`${member.displayName} is not hushed.`);
        }
      }
    } else if (sub === 'list') {
      await message.delete();
      const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
      const users = hushCfg.users || [];
      if (users.length === 0) {
        await message.channel.send('No hushed users.');
      } else {
        const lines = [];
        for (const uid of users) {
          const member = guild ? guild.members.cache.get(uid) : null;
          const name = member ? member.displayName : uid;
          lines.push(`- ${name} (${uid})`);
        }
        await message.channel.send(lines.join('\n'));
      }
    } else if (sub === 'clear') {
      await message.delete();
      const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
      hushCfg.users = [];
      saveJson(getUtilityConfigPath('hush_config.json'), hushCfg);
      await message.channel.send('All hushed users cleared.');
    }
    return;
  }
}

async function handleVoiceStateUpdate(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const hushCfg = loadJson(getUtilityConfigPath('hush_config.json'), DEFAULT_HUSH);
    const hushed = hushCfg.users || [];

    if (hushed.includes(String(member.id)) && newState.channelId) {
        try {
            await member.voice.disconnect();
        } catch {}
    }
}

function attachListener(botInstance) {
  try {
    botInstance.removeListener(Events.MessageCreate, handleUtilityMessage);
  } catch {}
  botInstance.on(Events.MessageCreate, handleUtilityMessage);

  try {
    botInstance.removeListener(Events.VoiceStateUpdate, handleVoiceStateUpdate);
  } catch {}
  botInstance.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);

  console.log('[UTILITY] Listener registered');
}

registerCommand('fetch_user_profile_full')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const userId = params.user_id;
  const guildId = params.guild_id;
  if (!userId) return;
  try {
    const user = await b.users.fetch(userId, { force: true });
    let decorationUrl = null;
    try { decorationUrl = user.avatarDecorationURL ? user.avatarDecorationURL() : null; } catch (e) {}
    let nameplate = null;
    try {
      if (user.collectibles && user.collectibles.nameplate) nameplate = user.collectibles.nameplate;
      else if (user.nameplate) nameplate = user.nameplate;
    } catch (e) {}
    let badges = [];
    try { badges = user.flags ? user.flags.toArray() : []; } catch (e) {}
    const out = {
      id: String(user.id),
      display_name: user.displayName || user.username,
      username: user.username,
      avatar_url: user.displayAvatarURL({ size: 128 }),
      banner_url: user.bannerURL ? (user.bannerURL({ size: 256 }) || null) : null,
      accent_color: user.accentColor || null,
      decoration_url: decorationUrl,
      nameplate: nameplate,
      badges: badges,
      bot: !!user.bot,
      created_at: user.createdAt ? user.createdAt.toISOString() : null,
      member: null
    };
    if (guildId) {
      const guild = b.guilds.cache.get(guildId);
      const member = guild ? guild.members.cache.get(userId) : null;
      if (member) {
        let serverAvatar = null;
        try { serverAvatar = member.avatarURL ? member.avatarURL({ size: 128 }) : null; } catch (e) {}
        out.member = {
          nick: member.nickname,
          joined_at: member.joinedAt ? member.joinedAt.toISOString() : null,
          boost_since: member.premiumSince ? member.premiumSince.toISOString() : null,
          server_avatar_url: serverAvatar,
          roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: r.color }))
        };
      }
    }
    const animatedAvatar = !!user.avatar && String(user.avatar).startsWith('a_');
      const animatedBanner = !!user.banner && String(user.banner).startsWith('a_');
      const hasDecoration = !!(decorationUrl || user.avatarDecorationData);
      out.nitro = animatedAvatar || animatedBanner || hasDecoration;
      out.nitro_signals = {
        animated_avatar: animatedAvatar,
        animated_banner: animatedBanner,
        decoration: hasDecoration,
        booster: !!(out.member && out.member.boost_since)
      };
    socket.emit('user_profile_full', out);
  } catch (e) {
    socket.emit('error', { message: 'Failed to fetch profile' });
  }
});

module.exports = {
  attachListener
};