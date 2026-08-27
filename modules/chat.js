const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { Buffer } = require('buffer');
const { ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, getVoiceConnection } = require('@discordjs/voice');
const {
  io,
  getBot,
  registerCommand,
  checkRateLimit,
  validateId,
  validateMessageContent,
  renderMessage,
  getAvatarUrl,
  embedToDict,
  classifyAttachment,
  logger
} = require('../bot');
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const sidChannelMap = new Map();
let micAudioSource = null;
let micRxPackets = 0;
let micRxLogTimer = null;
let typingListenerBot = null;
function ensureTypingListener() {
  const bot = getBot();
  if (!bot || typingListenerBot === bot) return;
  typingListenerBot = bot;
  bot.on('typingStart', (typing) => {
    try {
      if (!typing.user || typing.user.id === bot.user.id) return;
      const channelId = typing.channel ? String(typing.channel.id) : null;
      if (!channelId) return;
      const name = (typing.member && typing.member.displayName) || typing.user.displayName || typing.user.username || 'Someone';
      io.emit('typing_indicator', { user_name: name, channel_id: channelId });
    } catch (e) {}
  });
  console.log('[CHAT] typingStart listener attached');
}
class MicAudioStream extends Readable {
  constructor() {
    super();
    this.buffer = Buffer.alloc(0);
    this.bufferCap = 192000;
  }
  _read() {
    const needed = 3840;
    let chunk;
    if (this.buffer.length >= needed) {
      chunk = this.buffer.slice(0, needed);
      this.buffer = this.buffer.slice(needed);
    } else {
      chunk = Buffer.alloc(needed);
    }
    this.push(chunk);
  }
  pushData(pcmBytes) {
    const samples = Math.floor(pcmBytes.length / 2);
    const stereo = Buffer.alloc(samples * 4);
    for (let i = 0; i < samples; i++) {
      const mono = pcmBytes.readInt16LE(i * 2);
      stereo.writeInt16LE(mono, i * 4);
      stereo.writeInt16LE(mono, i * 4 + 2);
    }
    this.buffer = Buffer.concat([this.buffer, stereo]);
    if (this.buffer.length > this.bufferCap) {
      this.buffer = this.buffer.slice(this.buffer.length - this.bufferCap);
    }
  }
}
function createMicAudioResource() {
  micAudioSource = new MicAudioStream();
  return createAudioResource(micAudioSource, {
    inputType: StreamType.Raw,
    inlineVolume: true
  });
}
async function getOrCreateDM(user) {
  if (user.dmChannel) return user.dmChannel;
  return await user.createDM();
}
function fetchWithTimeout(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { signal: controller.signal })
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
io.on('connection', (socket) => {
  socket.on('fetch_chat', (data) => onFetchChat(socket, data));
  socket.on('send_chat_message', (data) => onSendChatMessage(socket, data));
  socket.on('send_dm_message', (data) => onSendDmMessage(socket, data));
  socket.on('open_dm', (data) => onOpenDm(socket, data));
  socket.on('fetch_dm_messages', (data) => onFetchDmMessages(socket, data));
  socket.on('join_vc', (data) => onJoinVc(socket, data));
  socket.on('leave_vc', () => onLeaveVc(socket));
  socket.on('edit_message', (data) => onEditMessage(socket, data));
  socket.on('delete_message', (data) => onDeleteMessage(socket, data));
  socket.on('pin_message', (data) => onPinMessage(socket, data));
  socket.on('mic_audio', (data) => onMicAudio(socket, data));
  socket.on('typing_start', (data) => onTypingStart(socket, data));
  socket.on('resolve_invite', (data) => onResolveInvite(socket, data));
  socket.on('upload_file', (data) => onUploadFile(socket, data));
  socket.on('disconnect', () => {
    sidChannelMap.delete(socket.id);
  });
});
async function onFetchChat(socket, data) {
  const bot = getBot();
  ensureTypingListener();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  if (!checkRateLimit(`fetch_chat:${socket.id}`, 3, 10)) {
    socket.emit('error', { message: 'Slow down – you are fetching messages too quickly.' });
    return;
  }
  const channelId = data.channel_id;
  sidChannelMap.set(socket.id, channelId);
  const beforeId = data.before_id;
  const limit = Math.min(data.limit || 50, 100);
  if (!validateId(channelId)) return;
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const options = { limit };
    if (beforeId && validateId(beforeId)) options.before = beforeId;
    const fetched = await channel.messages.fetch(options);
    const msgs = [];
    for (const msg of fetched.values()) {
      const rendered = await renderMessage(msg.content, msg.guild, bot);
      const attachments = msg.attachments.map(att => ({
        url: att.url,
        filename: att.filename,
        type: classifyAttachment(att)
      }));
      const reactions = msg.reactions.cache.map(r => ({
        emoji_name: String(r.emoji),
        count: r.count,
        emoji_id: r.emoji.id ? String(r.emoji.id) : null
      }));
      const stickers = (msg.stickers || []).map(sticker => {
        const url = sticker.url || null;
        if (url) return { url, filename: sticker.name };
        return null;
      }).filter(Boolean);
      const reply_to = msg.reference?.messageId ? String(msg.reference.messageId) : null;
      msgs.push({
        author_id: String(msg.author.id),
        author: msg.author.tag,
        display_name: msg.member?.displayName || msg.author.displayName,
        avatar_url: getAvatarUrl(msg.author),
        content_raw: msg.content,
        segments: rendered,
        timestamp: msg.createdAt.toTimeString().slice(0, 8),
        id: String(msg.id),
        attachments,
        embeds: msg.embeds.map(embedToDict),
        stickers,
        reactions,
        reply_to,
        edited: msg.editedAt !== null
      });
    }
    msgs.sort((a, b) => a.id.localeCompare(b.id));
    socket.emit('chat_messages', { channel_id: channelId, messages: msgs });
  } catch (e) {
    logger.error(`Fetch chat error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch messages' });
  }
}
async function onSendChatMessage(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  const content = data.content || '';
  const replyTo = data.reply_to;
  const attachments = data.attachments || [];
  if (!validateId(channelId) || !(validateMessageContent(content) || attachments.length > 0)) {
    socket.emit('error', { message: 'Invalid channel or content' });
    return;
  }
  if (!checkRateLimit(`send:${socket.id}`, 5, 5)) {
    socket.emit('error', { message: 'Rate limited. Slow down.' });
    return;
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const messagePayload = {};
    if (content) messagePayload.content = content;
    if (attachments.length > 0) {
      const files = attachments.map(att => {
        const fileData = Buffer.from(att.data, 'base64');
        return { attachment: fileData, name: att.filename };
      });
      messagePayload.files = files;
    }
    if (replyTo && validateId(replyTo)) {
      try {
        const referencedMessage = await channel.messages.fetch(replyTo);
        messagePayload.reply = { messageReference: referencedMessage };
      } catch {}
    }
    await channel.send(messagePayload);
  } catch (e) {
    if (e.code === 50013) {
      socket.emit('error', { message: 'Missing permission to send messages' });
    } else {
      logger.error(`Failed to send message: ${e.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }
}
async function onSendDmMessage(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  const content = data.content || '';
  const replyTo = data.reply_to;
  const attachments = data.attachments || [];
  if (!validateId(channelId) || !(validateMessageContent(content) || attachments.length > 0)) {
    socket.emit('error', { message: 'Invalid channel or content' });
    return;
  }
  if (!checkRateLimit(`send:${socket.id}`, 5, 5)) {
    socket.emit('error', { message: 'Rate limited. Slow down.' });
    return;
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const messagePayload = {};
    if (content) messagePayload.content = content;
    if (attachments.length > 0) {
      messagePayload.files = attachments.map(att => ({
        attachment: Buffer.from(att.data, 'base64'),
        name: att.filename
      }));
    }
    if (replyTo && validateId(replyTo)) {
      try {
        const referencedMessage = await channel.messages.fetch(replyTo);
        messagePayload.reply = { messageReference: referencedMessage };
      } catch {}
    }
    await channel.send(messagePayload);
  } catch (e) {
    if (e.code === 50013) {
      socket.emit('error', { message: 'Missing permission to send messages' });
    } else {
      logger.error(`Failed to send DM: ${e.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }
}
async function onOpenDm(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const userId = data.user_id;
  if (!validateId(userId)) return;
  try {
    const user = await bot.users.fetch(userId);
    const dm = await getOrCreateDM(user);
    socket.emit('dm_opened', {
      channel_id: String(dm.id),
      user_id: String(user.id),
      display_name: user.displayName,
      username: user.username,
      avatar_url: getAvatarUrl(user)
    });
  } catch (e) {
    logger.error(`Failed to open DM: ${e.message}`);
    socket.emit('error', { message: 'Failed to open DM' });
  }
}
async function onFetchDmMessages(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  if (!checkRateLimit(`fetch_dm:${socket.id}`, 3, 10)) {
    socket.emit('error', { message: 'Slow down – you are fetching messages too quickly.' });
    return;
  }
  const channelId = data.channel_id;
  const beforeId = data.before_id;
  const limit = Math.min(data.limit || 50, 100);
  if (!validateId(channelId)) return;
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const options = { limit };
    if (beforeId && validateId(beforeId)) options.before = beforeId;
    const fetched = await channel.messages.fetch(options);
    const msgs = [];
    for (const msg of fetched.values()) {
      const rendered = await renderMessage(msg.content, null, bot);
      const attachments = msg.attachments.map(att => ({
        url: att.url,
        filename: att.filename,
        type: classifyAttachment(att)
      }));
      const reactions = msg.reactions.cache.map(r => ({
        emoji_name: String(r.emoji),
        count: r.count,
        emoji_id: r.emoji.id ? String(r.emoji.id) : null
      }));
      const stickers = (msg.stickers || []).map(sticker => {
        const url = sticker.url || null;
        if (url) return { url, filename: sticker.name };
        return null;
      }).filter(Boolean);
      msgs.push({
        author_id: String(msg.author.id),
        author: msg.author.tag,
        display_name: msg.author.displayName,
        avatar_url: getAvatarUrl(msg.author),
        content_raw: msg.content,
        segments: rendered,
        timestamp: msg.createdAt.toTimeString().slice(0, 8),
        id: String(msg.id),
        attachments,
        embeds: msg.embeds.map(embedToDict),
        stickers,
        reactions
      });
    }
    msgs.sort((a, b) => a.id.localeCompare(b.id));
    socket.emit('dm_messages', { channel_id: channelId, messages: msgs });
  } catch (e) {
    logger.error(`Fetch DM error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch messages' });
  }
}
async function onJoinVc(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  if (!validateId(channelId)) return;
  for (const guild of bot.guilds.cache.values()) {
    const connection = getVoiceConnection(guild.id);
    if (connection) connection.destroy();
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  const perms = channel.permissionsFor(bot.user);
  if (!perms || !perms.has('Connect')) {
    socket.emit('error', { message: 'Bot lacks Connect permission in ' + channel.name });
    return;
  }
  if (!perms.has('Speak')) {
    socket.emit('error', { message: 'Bot lacks Speak permission in ' + channel.name + ' — it joins but sends silence. Grant Speak to fix mic.' });
    return;
  }
  try {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
      debug: true
    });
    const player = createAudioPlayer({ debug: true });
    const stream = new MicAudioStream();
    micAudioSource = stream;
    const resource = createAudioResource(stream, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });
    connection.on('stateChange', (o, n) => {
      logger.error('VC [' + channel.name + '] conn ' + o.status + ' -> ' + n.status);
      socket.emit('vc_state', { state: String(n.status) });
      if (n.status === 'ready' && player.state.status !== 'playing') {
        try { player.play(resource); } catch (e) { logger.error('VC play error: ' + e.message); }
      }
    });
    connection.on('debug', (msg) => { logger.error('VC [' + channel.name + '] dbg: ' + msg); });
    player.on('debug', (msg) => { logger.error('VC [' + channel.name + '] player dbg: ' + msg); });
    connection.on('error', (e) => {
      logger.error('VC conn error: ' + e.message);
      socket.emit('vc_state', { state: 'error', message: e.message });
    });
    player.on('stateChange', (o, n) => {
      logger.error('VC [' + channel.name + '] player ' + o.status + ' -> ' + n.status);
    });
    player.on('error', (e) => {
      logger.error('VC player error: ' + (e && e.message ? e.message : e));
      socket.emit('vc_state', { state: 'error', message: 'player: ' + (e && e.message ? e.message : e) });
    });
    connection.subscribe(player);
    if (connection.state.status === 'ready') player.play(resource);
    try {
      const receiver = connection.receiver;
      if (receiver && receiver.speaking) {
        receiver.speaking.on('start', (userId) => {
          io.emit('vc_speaking', { user_id: String(userId), speaking: true });
        });
        receiver.speaking.on('end', (userId) => {
          io.emit('vc_speaking', { user_id: String(userId), speaking: false });
        });
      }
    } catch (e) {
      logger.error('VC receiver: ' + e.message);
    }
    socket.emit('vc_joined', { channel_id: channelId, channel_name: channel.name });
  } catch (e) {
    if (e.code === 50013) {
      socket.emit('error', { message: 'Missing permission to join voice channel' });
    } else {
      logger.error(`Failed to join VC: ${e.message}`);
      socket.emit('error', { message: 'VC join failed: ' + (e.message || 'unknown') });
    }
  }
}
function onLeaveVc(socket) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  for (const guild of bot.guilds.cache.values()) {
    const connection = getVoiceConnection(guild.id);
    if (connection) connection.destroy();
  }
  micAudioSource = null;
  if (micRxLogTimer) { clearInterval(micRxLogTimer); micRxLogTimer = null; }
  micRxPackets = 0;
  socket.emit('vc_left', {});
}
async function onEditMessage(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  const messageId = data.message_id;
  const newContent = data.content || '';
  if (!validateId(channelId) || !validateId(messageId) || !validateMessageContent(newContent)) {
    socket.emit('error', { message: 'Invalid data' });
    return;
  }
  if (!checkRateLimit(`edit:${socket.id}`, 3, 10)) {
    socket.emit('error', { message: 'Rate limited' });
    return;
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(messageId);
    if (msg.author.id === bot.user.id) {
      await msg.edit({ content: newContent });
      socket.emit('message_edited', {
        channel_id: channelId,
        message_id: messageId,
        new_content: newContent
      });
    } else {
      socket.emit('error', { message: 'Can only edit own messages' });
    }
  } catch (e) {
    if (e.code === 50013) socket.emit('error', { message: 'Missing permission to edit message' });
    else {
      logger.error(`Failed to edit message: ${e.message}`);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }
}
async function onDeleteMessage(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  const messageId = data.message_id;
  if (!validateId(channelId) || !validateId(messageId)) {
    socket.emit('error', { message: 'Invalid data' });
    return;
  }
  if (!checkRateLimit(`delete:${socket.id}`, 3, 10)) {
    socket.emit('error', { message: 'Rate limited' });
    return;
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(messageId);
    if (msg.author.id === bot.user.id) {
      await msg.delete();
      socket.emit('message_deleted', {
        channel_id: channelId,
        message_id: messageId
      });
    } else {
      socket.emit('error', { message: 'Can only delete own messages' });
    }
  } catch (e) {
    if (e.code === 50013) socket.emit('error', { message: 'Missing permission to delete message' });
    else {
      logger.error(`Failed to delete message: ${e.message}`);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }
}
async function onPinMessage(socket, data) {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = data.channel_id;
  const messageId = data.message_id;
  if (!validateId(channelId) || !validateId(messageId)) return;
  const channel = bot.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(messageId);
    await msg.pin();
    socket.emit('notification', 'Message pinned');
  } catch (e) {
    if (e.code === 50013) socket.emit('error', { message: 'Missing permission to pin messages' });
    else {
      logger.error(`Failed to pin message: ${e.message}`);
      socket.emit('error', { message: 'Failed to pin message' });
    }
  }
}
function onMicAudio(socket, data) {
  if (!micAudioSource) {
    const bot = getBot();
    if (bot) {
      for (const guild of bot.guilds.cache.values()) {
        const connection = getVoiceConnection(guild.id);
        if (connection) {
          const stream = new MicAudioStream();
          micAudioSource = stream;
          const player = createAudioPlayer();
          const resource = createAudioResource(stream, { inputType: StreamType.Raw, inlineVolume: true });
          player.play(resource);
          connection.subscribe(player);
          logger.error('VC mic stream re-attached (was null)');
          break;
        }
      }
    }
    if (!micAudioSource) return;
  }
  let buffer;
  if (Buffer.isBuffer(data)) buffer = data;
  else if (data instanceof ArrayBuffer) buffer = Buffer.from(data);
  else if (Array.isArray(data)) buffer = Buffer.from(data);
  else return;
  micAudioSource.pushData(buffer);
  micRxPackets++;
  if (!micRxLogTimer) {
    micRxLogTimer = setInterval(() => {
      logger.error('VC mic rx packets/5s: ' + micRxPackets);
      micRxPackets = 0;
    }, 5000);
  }
}
function onTypingStart(socket, data) {
  ensureTypingListener();
  const channelId = data.channel_id || sidChannelMap.get(socket.id);
  const userName = data.user_name || 'Someone';
  if (!channelId) return;
  for (const [otherSid, otherCh] of sidChannelMap.entries()) {
    if (otherCh === channelId && otherSid !== socket.id) {
      io.to(otherSid).emit('typing_indicator', { user_name: userName, channel_id: channelId });
    }
  }
  const bot = getBot();
  if (bot && bot.isReady()) {
    const channel = bot.channels.cache.get(channelId);
    if (channel && channel.isTextBased && channel.isTextBased()) {
      channel.sendTyping().catch(() => {});
    }
  }
}
const inviteCache = new Map();
async function onResolveInvite(socket, data) {
  const code = (data.code || '').trim();
  if (!code) return;
  const now = Date.now();
  if (inviteCache.has(code)) {
    const cached = inviteCache.get(code);
    if (now - cached.time < 300000) {
      socket.emit('invite_resolved', cached.data);
      return;
    }
  }
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('invite_resolved', { code, error: 'Bot not connected' });
    return;
  }
  try {
    const invite = await bot.fetchInvite(code);
    const guild = invite.guild;
    const dataObj = {
      code,
      server_name: guild ? guild.name : 'Unknown Server',
      icon_url: guild && guild.icon ? guild.iconURL({ format: 'png', size: 128 }) : null,
      member_count: invite.approximateMemberCount || 0,
      presence_count: invite.approximatePresenceCount || 0
    };
    inviteCache.set(code, { data: dataObj, time: now });
    socket.emit('invite_resolved', dataObj);
  } catch (e) {
    const dataObj = { code, error: e.message };
    inviteCache.set(code, { data: dataObj, time: now });
    socket.emit('invite_resolved', dataObj);
  }
}
async function onUploadFile(socket, data) {
  const fileName = data.filename || 'file';
  const fileDataB64 = data.data || '';
  if (!fileDataB64) {
    socket.emit('error', { message: 'No file data' });
    return;
  }
  let raw;
  try {
    raw = Buffer.from(fileDataB64, 'base64');
  } catch {
    socket.emit('error', { message: 'Invalid file data' });
    return;
  }
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `arklum_upload_${Date.now()}_${fileName}`);
  const outputPath = path.join(tmpDir, `arklum_compressed_${Date.now()}_${fileName}`);
  fs.writeFileSync(inputPath, raw);
  const ffmpegArgs = [
    '-y', '-i', inputPath,
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
    '-c:v', 'libx264', '-crf', '28',
    '-c:a', 'aac', '-b:a', '64k',
    '-movflags', '+faststart',
    '-fs', String(MAX_FILE_SIZE),
    outputPath
  ];
  const runFfmpeg = () => new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: 'ignore' });
    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      resolve(false);
    }, 30000);
    ffmpeg.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
    ffmpeg.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  let compressed = null;
  try {
    const success = await runFfmpeg();
    if (success && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      compressed = fs.readFileSync(outputPath);
    }
  } catch {}
  try {
    if (compressed) {
      socket.emit('file_compressed', {
        filename: fileName,
        data: compressed.toString('base64')
      });
    } else {
      socket.emit('file_compressed', {
        filename: fileName,
        data: raw.toString('base64')
      });
    }
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}
registerCommand('fetch_file_content')(async (params, { socket }) => {
  const url = params.url;
  if (!url) {
    socket.emit('error', { message: 'No URL provided' });
    return;
  }
  if (!url.startsWith('https://cdn.discordapp.com/') && !url.startsWith('https://media.discordapp.net/')) {
    socket.emit('error', { message: 'Invalid URL' });
    return;
  }
  try {
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) {
      socket.emit('error', { message: `Failed to fetch file: ${res.status}` });
      return;
    }
    let text = await res.text();
    if (text.length > 500000) {
      text = text.slice(0, 500000) + '\n... (truncated)';
    }
    socket.emit('file_content', { url, content: text });
  } catch (e) {
    logger.error(`Fetch file content error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch file content' });
  }
});
registerCommand('react_message')(async (params, { socket }) => {
  const bot = getBot();
  if (!bot || !bot.isReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const channelId = params.channel_id;
  const messageId = params.message_id;
  const emoji = params.emoji;
  if (!validateId(channelId) || !validateId(messageId) || !emoji) {
    socket.emit('error', { message: 'Missing channel/message/emoji' });
    return;
  }
  const channel = bot.channels.cache.get(channelId);
  if (!channel) {
    socket.emit('error', { message: 'Channel not found' });
    return;
  }
  try {
    const msg = await channel.messages.fetch(messageId);
    await msg.react(emoji);
  } catch (e) {
    if (e.code === 50013) socket.emit('error', { message: 'Missing permission to add reactions' });
    else if (e.code === 10008) socket.emit('error', { message: 'Message not found' });
    else {
      logger.error(`React error: ${e.message}`);
      socket.emit('error', { message: 'Failed to react' });
    }
  }
});