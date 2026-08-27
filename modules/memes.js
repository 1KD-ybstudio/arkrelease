// modules/memes.js
const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');
const PImage = require('pureimage');
const opentype = require('opentype.js');
const { logger, getBot, getBotDataDir } = require('../bot');

const SCRIPT_DIR = path.join('data', 'memes');

const CONFIG = {
  'hell':   { file: 'hell.png',   size: [270, 270], xy: [600, 490], mask: 'rect' },
  'kms':    { file: 'kms.png',    size: [470, 490], xy: [520, 208], mask: 'rect' },
  'choke':  { file: 'choke.png',  size: [185, 220], xy: [650, 310], mask: 'rect' },
  'heaven': { file: 'heaven.png', size: [999, 999], xy: [310, 146], mask: 'rect' },
  'wanted': { file: 'wanted.png', size: [700, 500], xy: [260, 250], mask: 'rect', font_size: 100 },
  'quote':  { file: 'quote.png',  size: [512, 512], xy: [0, 0],     mask: 'fade' }
};

function loadMemeConfig() {
  const configPath = path.join(getBotDataDir(), 'meme_config.json');
  if (!fs.existsSync(configPath)) return { enabled: true, prefix: '$' };
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { enabled: true, prefix: '$' };
  }
}

function loadFont(size) {
  const fontPaths = [
    '/system/fonts/Roboto-Regular.ttf',
    '/system/fonts/DroidSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ];
  for (const fontPath of fontPaths) {
    if (!fs.existsSync(fontPath)) continue;
    try {
      const buffer = fs.readFileSync(fontPath);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return { font: opentype.parse(ab), size };
    } catch {}
  }
  return null;
}

function measureText(fontObj, text) {
  if (!fontObj) return text.length * 10;
  return fontObj.font.getAdvanceWidth(text, fontObj.size);
}

function getTextLines(text, fontObj, maxWidth) {
  const lines = [];
  const words = text.split(/\s+/);
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (measureText(fontObj, test) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      let part = '';
      for (const ch of word) {
        if (measureText(fontObj, part + ch) <= maxWidth) part += ch;
        else break;
      }
      if (!part) part = word.charAt(0);
      lines.push(part);
      current = word.slice(part.length);
    }
  }
  if (current) lines.push(current);
  return lines;
}

function encodePng(bitmap) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });
    writable.on('finish', () => resolve(Buffer.concat(chunks)));
    writable.on('error', reject);
    PImage.encodePNGToStream(bitmap, writable);
  });
}

async function decodeImage(buffer) {
  try {
    return await PImage.decodePNGFromStream(Readable.from([buffer]));
  } catch {
    return await PImage.decodeJPEGFromStream(Readable.from([buffer]));
  }
}

function avatarURLFor(user) {
    const options = { size: 512, format: 'png', extension: 'png', forceStatic: true };
    try {
        return user.displayAvatarURL(options);
    } catch {
        return user.defaultAvatarURL;
    }
}

async function fetchAvatar(url) {
    const candidates = [url];
    const staticUrl = url.replace(/\.(webp|gif|jpe?g)(?=\?|$)/i, '.png');
    if (staticUrl !== url) candidates.push(staticUrl);

    let lastErr;
    for (const candidate of candidates) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(candidate, { signal: controller.signal });
            if (!res.ok) throw new Error('Avatar fetch failed: ' + res.status);
            return await decodeImage(Buffer.from(await res.arrayBuffer()));
        } catch (e) {
            lastErr = e;
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr || new Error('Avatar fetch failed');
}

function resizeBitmap(bitmap, width, height) {
  const out = PImage.make(width, height);
  out.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  return out;
}

function pasteWithMask(dest, src, x, y, maskType) {
  const destData = dest.data;
  const srcData = src.data;
  const sw = src.width, sh = src.height;
  const dw = dest.width, dh = dest.height;
  for (let sy = 0; sy < sh; sy++) {
    for (let sx = 0; sx < sw; sx++) {
      const dx = x + sx, dy = y + sy;
      if (dx < 0 || dx >= dw || dy < 0 || dy >= dh) continue;
      const srcIdx = (sy * sw + sx) * 4;
      const destIdx = (dy * dw + dx) * 4;
      let maskAlpha = srcData[srcIdx + 3];
      if (maskType === 'circle' || maskType === 'face') {
        const nx = (sx - sw / 2) / (sw / 2);
        const ny = (sy - sh / 2) / (sh / 2);
        if (nx * nx + ny * ny > 1) maskAlpha = 0;
      } else if (maskType === 'fade') {
        maskAlpha = Math.round(maskAlpha * (1 - sx / sw));
      }
      const srcA = maskAlpha / 255;
      if (srcA === 0) continue;
      const destA = destData[destIdx + 3] / 255;
      const outA = srcA + destA * (1 - srcA);
      if (outA === 0) continue;
      for (let c = 0; c < 3; c++) {
        const srcC = srcData[srcIdx + c];
        const destC = destData[destIdx + c];
        destData[destIdx + c] = Math.round((srcC * srcA + destC * destA * (1 - srcA)) / outA);
      }
      destData[destIdx + 3] = Math.round(outA * 255);
    }
  }
}

function drawTextOnBitmap(bitmap, fontObj, text, x, y, fillColor) {
  if (!fontObj) return;
  const ctx = bitmap.getContext('2d');
  const p = fontObj.font.getPath(text, x, y, fontObj.size);
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  for (const cmd of p.commands) {
    if (cmd.type === 'M') ctx.moveTo(cmd.x, cmd.y);
    else if (cmd.type === 'L') ctx.lineTo(cmd.x, cmd.y);
    else if (cmd.type === 'C') ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
    else if (cmd.type === 'Q') ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
    else if (cmd.type === 'Z') ctx.closePath();
  }
  ctx.fill();
}

async function makeCanvasSync(avatarUrl, name, text, mode) {
  const config = CONFIG[mode];
  const templatePath = path.join(SCRIPT_DIR, path.basename(config.file));
  if (!fs.existsSync(templatePath)) {
    return { data: null, error: 'Missing template: ' + path.basename(config.file) };
  }
  let template;
  try {
    template = await decodeImage(fs.readFileSync(templatePath));
  } catch {
    return { data: null, error: 'Failed to decode template: ' + path.basename(config.file) };
  }
  let avatar;
  try {
    avatar = await fetchAvatar(avatarUrl);
  } catch {
    return { data: null, error: 'Failed to download avatar for ' + name };
  }

  if (mode === 'quote') {
    if (!text) {
      return { data: null, error: 'No text to quote. Reply to a message or add text after the command.' };
    }
    const final = resizeBitmap(template, 1024, 512);
    const av = resizeBitmap(avatar, 512, 512);
    pasteWithMask(final, av, 0, 0, 'fade');
    const font = loadFont(65);
    let full = '"' + text + '"';
    if (full.length > 600) full = full.slice(0, 600) + '…';
    const lines = getTextLines(full, font, 420);
    const lineHeight = 77;
    let y = (final.height - lines.length * lineHeight) / 2 - 30;
    for (const line of lines) {
      drawTextOnBitmap(final, font, line, 560, y, 'rgb(240,240,240)');
      y += lineHeight;
    }
    drawTextOnBitmap(final, loadFont(40), '— ' + name, 560, y + 10, 'rgb(160,160,160)');
    return { data: await encodePng(final), error: null };
  }

  const final = PImage.make(template.width, template.height);
  pasteWithMask(final, resizeBitmap(avatar, config.size[0], config.size[1]), config.xy[0], config.xy[1], config.mask);
  pasteWithMask(final, template, 0, 0, 'rect');

  if (mode === 'wanted') {
    const font = loadFont(config.font_size || 100);
    if (font) {
      const width = measureText(font, name);
      drawTextOnBitmap(final, font, name, (final.width - width) / 2, 860, 'rgb(80,59,30)');
    }
  }

  return { data: await encodePng(final), error: null };
}

async function handleMemesMessage(message) {
  const bot = getBot();
  if (!bot || !bot.isReady() || message.author.bot) return;
  const cfg = loadMemeConfig();
  if (!cfg.enabled) return;
  const prefix = cfg.prefix || '$';
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  if (!args.length) return;
  const cmd = args[0].toLowerCase();
  if (!Object.keys(CONFIG).includes(cmd)) return;

  let target = message.author;
  let text = '';
  let member = null;
  if (message.mentions.members && message.mentions.members.size > 0) {
    member = message.mentions.members.first();
  }
  if (message.reference && message.reference.messageId) {
    try {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId);
      target = refMsg.author;
      text = refMsg.content || '';
    } catch {}
  } else if (member) {
    target = member.user;
    if (args.length > 2) text = args.slice(2).join(' ');
  }

  try {
    const result = await makeCanvasSync(
      avatarURLFor(target),
      target.displayName,
      text,
      cmd
    );
    if (result.error) {
      await message.channel.send(result.error);
    } else if (result.data) {
      await message.channel.send({ files: [{ attachment: result.data, name: cmd + '.png' }] });
    }
  } catch (e) {
    logger.error('Memes generation error: ' + e.message);
    await message.channel.send('Something went wrong generating that image.');
  }
}

function attachListener(botInstance) {
  botInstance.on('messageCreate', handleMemesMessage);
  console.log('[MEMES] Meme generator listener registered');
}

module.exports = { attachListener };
