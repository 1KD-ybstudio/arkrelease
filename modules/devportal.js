const { io, registerCommand, logger, getBot, tokenVault, saveEncryptedTokens } = require('../bot');

const APPLICATION_BASE = 'https://discord.com/api/v10/applications/@me';

function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { ...options, signal: controller.signal })
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

async function apiRequest(method, url, botToken, jsonData = null) {
  const headers = { Authorization: `Bot ${botToken}` };
  const options = { method, headers };
  if (jsonData !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(jsonData);
  }
  const res = await fetchWithTimeout(url, options, 10000);
  if (res.status === 200 || res.status === 201 || res.status === 204) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  } else {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

function botReady() {
  const b = getBot();
  return b && !b.isDestroyed && b.isReady();
}

function botToken() {
  const b = getBot();
  return b ? b._loginToken : null;
}

registerCommand('developer_portal_info')(async (params, { socket }) => {
  const token = botToken();
  if (!token) {
    socket.emit('error', { message: 'No bot token available. Please log in again.' });
    return;
  }
  try {
    const app = await apiRequest('GET', APPLICATION_BASE, token);
    const clientId = app.id;
    const data = {
      id: clientId,
      name: app.name || '',
      description: app.description || '',
      icon: app.icon ?? null,
      icon_url: app.icon ? `https://cdn.discordapp.com/app-icons/${clientId}/${app.icon}.png` : null,
      bot_public: app.bot_public !== undefined ? app.bot_public : true,
      bot_require_code_grant: app.bot_require_code_grant !== undefined ? app.bot_require_code_grant : false,
      owner: app.owner ? JSON.stringify(app.owner) : '',
      team: app.team ?? null,
      public_key: app.verify_key || '',
      interactions_endpoint_url: app.interactions_endpoint_url || '',
      linked_roles_verification_url: app.linked_roles_verification_url || '',
      terms_of_service_url: app.terms_of_service_url || '',
      privacy_policy_url: app.privacy_policy_url || ''
    };
    socket.emit('developer_portal_data', data);
  } catch (e) {
    logger.error(`Failed to fetch application: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch application info' });
  }
});

registerCommand('developer_portal_save')(async (params, { socket }) => {
  if (!botReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const token = botToken();
  const payload = {};
  if ('name' in params) payload.name = params.name;
  if ('description' in params) payload.description = params.description;
  if (params.icon_b64) payload.icon = `data:image/png;base64,${params.icon_b64}`;
  if ('bot_public' in params) payload.bot_public = params.bot_public;
  if ('bot_require_code_grant' in params) payload.bot_require_code_grant = params.bot_require_code_grant;
  if ('interactions_endpoint_url' in params) payload.interactions_endpoint_url = params.interactions_endpoint_url;
  if ('linked_roles_verification_url' in params) payload.linked_roles_verification_url = params.linked_roles_verification_url;
  if ('terms_of_service_url' in params) payload.terms_of_service_url = params.terms_of_service_url;
  if ('privacy_policy_url' in params) payload.privacy_policy_url = params.privacy_policy_url;
  if (Object.keys(payload).length > 0) {
    try {
      await apiRequest('PATCH', APPLICATION_BASE, token, payload);
      socket.emit('notification', 'Application settings saved');
    } catch (e) {
      logger.error(`Save app error: ${e.message}`);
      socket.emit('error', { message: 'Failed to save settings' });
    }
  }
});

registerCommand('developer_portal_token_info')(async (params, { socket }) => {
  const token = botToken();
  if (!token) {
    socket.emit('error', { message: 'Bot not logged in yet' });
    return;
  }
  socket.emit('developer_portal_token_data', {
    masked: token.slice(0, 4) + '...' + token.slice(-4),
    full: token
  });
});

registerCommand('developer_portal_reset_token')(async (params, { socket }) => {
  if (!botReady()) {
    socket.emit('error', { message: 'Bot not connected' });
    return;
  }
  const oldToken = botToken();
  try {
    const newApp = await apiRequest('POST', `${APPLICATION_BASE}/bot/reset`, oldToken);
    const newToken = newApp.token;
    for (const t of tokenVault) {
      if (t.token === oldToken) {
        t.token = newToken;
        break;
      }
    }
    saveEncryptedTokens(tokenVault);
    const b = getBot();
    if (b) b._loginToken = newToken;
    socket.emit('notification', `Token reset successfully. New token: ${newToken}`);
  } catch (e) {
    logger.error(`Failed to reset token: ${e.message}`);
    socket.emit('error', { message: 'Failed to reset token' });
  }
});

registerCommand('developer_portal_install_info')(async (params, { socket }) => {
  if (!botReady()) return;
  try {
    const app = await apiRequest('GET', APPLICATION_BASE, botToken());
    const clientId = app.id;
    socket.emit('developer_portal_install_data', {
      client_id: clientId,
      invite_url_base: `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot`
    });
  } catch (e) {
    logger.error(`Developer install info error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch install info' });
  }
});

registerCommand('developer_app_emojis_list')(async (params, { socket }) => {
  if (!botReady()) return;
  try {
    const app = await apiRequest('GET', APPLICATION_BASE, botToken());
    const emojis = app.emojis || [];
    socket.emit('developer_app_emojis', { emojis });
  } catch (e) {
    logger.error(`Fetch app emojis error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch app emojis' });
  }
});

registerCommand('developer_app_emoji_upload')(async (params, { socket }) => {
  if (!botReady()) return;
  const name = params.name;
  const imageB64 = params.image;
  if (!name || !imageB64) return;
  try {
    await apiRequest('POST', `${APPLICATION_BASE}/emojis`, botToken(), {
      name,
      image: `data:image/png;base64,${imageB64}`
    });
    socket.emit('notification', `App emoji ${name} created`);
  } catch (e) {
    logger.error(`Upload app emoji error: ${e.message}`);
    socket.emit('error', { message: 'Failed to upload app emoji' });
  }
});

registerCommand('developer_app_emoji_delete')(async (params, { socket }) => {
  if (!botReady()) return;
  const emojiId = params.emoji_id;
  if (!emojiId) return;
  try {
    await apiRequest('DELETE', `${APPLICATION_BASE}/emojis/${emojiId}`, botToken());
    socket.emit('notification', 'App emoji deleted');
  } catch (e) {
    logger.error(`Delete app emoji error: ${e.message}`);
    socket.emit('error', { message: 'Failed to delete app emoji' });
  }
});

registerCommand('developer_webhooks_list')(async (params, { socket }) => {
  if (!botReady()) return;
  const b = getBot();
  const webhooks = [];
  for (const guild of b.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== 0) continue;
      try {
        const channelWebhooks = await channel.fetchWebhooks();
        for (const wh of channelWebhooks.values()) {
          if (wh.applicationId === b.user.id) {
            webhooks.push({
              id: String(wh.id),
              name: wh.name,
              channel: `#${channel.name} (${guild.name})`,
              url: wh.url
            });
          }
        }
      } catch {}
    }
  }
  socket.emit('developer_webhooks', { webhooks });
});

registerCommand('developer_webhook_delete')(async (params, { socket }) => {
  if (!botReady()) return;
  const webhookId = params.webhook_id;
  if (!webhookId) return;
  try {
    const b = getBot();
    const wh = await b.fetchWebhook(webhookId);
    await wh.delete();
    socket.emit('notification', 'Webhook deleted');
  } catch (e) {
    logger.error(`Delete webhook error: ${e.message}`);
    socket.emit('error', { message: 'Failed to delete webhook' });
  }
});

registerCommand('developer_rich_presence_assets')(async (params, { socket }) => {
  if (!botReady()) return;
  try {
    const app = await apiRequest('GET', APPLICATION_BASE, botToken());
    const assets = app.rpc_assets || [];
    socket.emit('developer_rich_presence_assets', { assets });
  } catch (e) {
    logger.error(`Fetch RPC assets error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch assets' });
  }
});

registerCommand('developer_rich_presence_asset_upload')(async (params, { socket }) => {
  if (!botReady()) return;
  const name = params.name;
  const imageB64 = params.image;
  if (!name || !imageB64) return;
  try {
    await apiRequest('POST', `${APPLICATION_BASE}/rpc-assets`, botToken(), {
      name,
      image: `data:image/png;base64,${imageB64}`
    });
    socket.emit('notification', `RPC asset ${name} created`);
  } catch (e) {
    logger.error(`Upload RPC asset error: ${e.message}`);
    socket.emit('error', { message: 'Failed to upload asset' });
  }
});

registerCommand('developer_rich_presence_asset_delete')(async (params, { socket }) => {
  if (!botReady()) return;
  const assetId = params.asset_id;
  if (!assetId) return;
  try {
    await apiRequest('DELETE', `${APPLICATION_BASE}/rpc-assets/${assetId}`, botToken());
    socket.emit('notification', 'RPC asset deleted');
  } catch (e) {
    logger.error(`Delete RPC asset error: ${e.message}`);
    socket.emit('error', { message: 'Failed to delete asset' });
  }
});

registerCommand('developer_app_tester_info')(async (params, { socket }) => {
  if (!botReady()) return;
  try {
    const app = await apiRequest('GET', APPLICATION_BASE, botToken());
    socket.emit('developer_app_tester_data', {
      client_id: app.id,
      note: 'Enable App Test Mode in Discord client: Settings > Advanced > Enter Application ID.'
    });
  } catch (e) {
    logger.error(`Developer tester info error: ${e.message}`);
    socket.emit('error', { message: 'Failed to fetch tester info' });
  }
});