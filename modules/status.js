const fs = require('fs');
const path = require('path');
const { ActivityType } = require('discord.js');
const { io, registerCommand, commandHandlers, logger, getBot, getBotDataDir } = require('../bot');

const STATUS_CONFIG_FILENAME = 'status_config.json';
const DEFAULT_CONFIG = {
  interval: 10,
  texts: []
};

function getStatusConfigPath() {
  return path.join(getBotDataDir(), STATUS_CONFIG_FILENAME);
}

function loadStatusConfig() {
  const configPath = getStatusConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      for (const key of Object.keys(DEFAULT_CONFIG)) {
        if (!(key in cfg)) cfg[key] = DEFAULT_CONFIG[key];
      }
      return cfg;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveStatusConfig(cfg) {
  const configPath = getStatusConfigPath();
  try {
    fs.writeFileSync(configPath + '.tmp', JSON.stringify(cfg));
    fs.renameSync(configPath + '.tmp', configPath);
  } catch {}
}

let statusLoopGeneration = 0;

async function statusLoop(gen) {
  while (gen === statusLoopGeneration) {
    const b = getBot();
    if (b && b.isReady()) {
      const config = loadStatusConfig();
      const texts = config.texts || [];
      const interval = Math.max(config.interval || 10, 5);
      if (texts.length > 0) {
        let idx = 0;
        while (gen === statusLoopGeneration && b && !b.isDestroyed) {
          if (!texts.length) break;
          try {
            const activity = {
              name: texts[idx % texts.length],
              type: ActivityType.Custom
            };
            await b.user.setPresence({ activities: [activity] });
          } catch {}
          idx++;
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

function startStatusLoop() {
  statusLoopGeneration++;
  const gen = statusLoopGeneration;
  statusLoop(gen).catch(() => {});
}

registerCommand('status_set_presence')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('notification', 'Bot not ready');
    return;
  }

  const statusMap = {
    online: 'online',
    idle: 'idle',
    dnd: 'dnd',
    invisible: 'invisible'
  };

  const statusVal = statusMap[params.status];
  if (!statusVal) {
    socket.emit('notification', `Unknown status: ${params.status}`);
    return;
  }

  try {
    await b.user.setPresence({ status: statusVal });
    socket.emit('notification', `Status set to ${params.status}`);
  } catch (e) {
    logger.error(`Set presence error: ${e.message}`);
    socket.emit('notification', `Error: ${e.message}`);
  }
});

registerCommand('status_list_texts')(async (params, { socket }) => {
  const cfg = loadStatusConfig();
  socket.emit('status_texts', {
    texts: cfg.texts || [],
    interval: cfg.interval || 10
  });
});

registerCommand('status_add_text')(async (params, { socket }) => {
  const text = (params.text || '').trim();
  if (!text) {
    socket.emit('error', { message: 'Text cannot be empty' });
    return;
  }
  const cfg = loadStatusConfig();
  if (!cfg.texts) cfg.texts = [];
  cfg.texts.push(text);
  saveStatusConfig(cfg);
  startStatusLoop();
  socket.emit('notification', `Added: ${text}`);
  await commandHandlers['status_list_texts']({}, { socket });
});

registerCommand('status_remove_text')(async (params, { socket }) => {
  const idx = parseInt(params.index, 10);
  const cfg = loadStatusConfig();
  const texts = cfg.texts || [];
  if (!isNaN(idx) && idx >= 0 && idx < texts.length) {
    const removed = texts.splice(idx, 1)[0];
    cfg.texts = texts;
    saveStatusConfig(cfg);
    startStatusLoop();
        socket.emit('notification', `Removed: ${removed}`);
    } else {
      socket.emit('error', { message: 'Invalid index' });
    }
    await commandHandlers['status_list_texts']({}, { socket });
});

registerCommand('status_set_interval')(async (params, { socket }) => {
  let seconds = parseInt(params.interval, 10);
  if (isNaN(seconds)) seconds = 10;
  if (seconds < 5) seconds = 5;
  const cfg = loadStatusConfig();
  cfg.interval = seconds;
  saveStatusConfig(cfg);
  startStatusLoop();
  socket.emit('notification', `Interval set to ${seconds} seconds`);
});

registerCommand('status_set_rich_presence')(async (params, { socket }) => {
  const b = getBot();
  if (!b || !b.isReady()) {
    socket.emit('notification', 'Bot not ready');
    return;
  }

  statusLoopGeneration++;

  const activityType = params.type || 'playing';
  let name = params.name || '';
  let state = params.state || '';
  let details = params.details || '';

  const guild = b.guilds.cache.first() || null;

  function resolve(text) {
    if (!guild) {
      return text
        .replace('{server}', 'Unknown Server')
        .replace('{server_count}', String(b.guilds.cache.size))
        .replace('{users}', String(b.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)))
        .replace('{members}', '0')
        .replace('{channels}', '0')
        .replace('{online}', '0')
        .replace('{bot_name}', b.user.tag);
    }
    return text
      .replace('{server}', guild.name)
      .replace('{server_count}', String(b.guilds.cache.size))
      .replace('{users}', String(b.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)))
      .replace('{members}', String(guild.memberCount))
      .replace('{channels}', String(guild.channels.cache.size))
      .replace('{online}', String(guild.members.cache.filter(m => m.presence && m.presence.status === 'online').size))
      .replace('{bot_name}', b.user.tag);
  }

  name = resolve(name);
  if (state) state = resolve(state);
  if (details) details = resolve(details);

  try {
    const typeMap = {
      playing: ActivityType.Playing,
      streaming: ActivityType.Streaming,
      listening: ActivityType.Listening,
      watching: ActivityType.Watching,
      competing: ActivityType.Competing
    };

    const activity = {
      type: typeMap[activityType] || ActivityType.Playing,
      name
    };
    if (state) activity.state = state;
    if (details) activity.details = details;

    const largeImage = params.large_image || '';
    const largeText = params.large_text || '';
    const smallImage = params.small_image || '';
    const smallText = params.small_text || '';

    if (largeImage || largeText || smallImage || smallText) {
      activity.assets = {};
      if (largeImage) activity.assets.largeImage = largeImage;
      if (largeText) activity.assets.largeText = largeText;
      if (smallImage) activity.assets.smallImage = smallImage;
      if (smallText) activity.assets.smallText = smallText;
    }

    const start = params.start || '';
    const end = params.end || '';
    if (start || end) {
      activity.timestamps = {};
      if (start) activity.timestamps.start = parseInt(start, 10);
      if (end) activity.timestamps.end = parseInt(end, 10);
    }

    const partySize = params.party_size || '';
    if (partySize) {
      const parts = partySize.split(',');
      if (parts.length === 2) {
        const current = parseInt(parts[0].trim(), 10);
        const max = parseInt(parts[1].trim(), 10);
        activity.party = { size: [current, max] };
      }
    }

    await b.user.setPresence({ activities: [activity] });
    socket.emit('notification', 'Rich presence set');
  } catch (e) {
    logger.error(`Rich presence error: ${e.message}`);
    socket.emit('notification', `Error: ${e.message}`);
  }
});

module.exports = {
  startStatusLoop
};