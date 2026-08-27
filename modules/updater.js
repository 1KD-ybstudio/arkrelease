// modules/updater.js — git-based self-update (raw tree repo, no zips)
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { logger, registerCommand } = require('../bot');

const UPDATE_SOURCE = { owner: '1KD-ybstudio', repo: 'arkrelease', branch: 'main' };
const EXCLUDE_DIRS = ['.arklum_sys', 'static/themes', 'plugins'];
const CORE_PLUGIN_FILE = /^plugins\/[^/]+\.js$/;
const SKIP_COPY = ['.git', 'node_modules', '.arklum_sys'];
const SYS_DIR = '.arklum_sys';
const CLONE_DIR = path.join(SYS_DIR, 'update-clone');
const BACKUP_DIR = path.join(SYS_DIR, 'backups');
const UPDATE_ENC = path.join(SYS_DIR, 'update', 'update.enc');
const ARKV_MD = path.join(SYS_DIR, 'arkv.md');

function getSource() {
  try {
    const keyPath = path.join(SYS_DIR, 'key.bin');
    if (fs.existsSync(keyPath) && fs.existsSync(UPDATE_ENC)) {
      const key = fs.readFileSync(keyPath);
      const data = fs.readFileSync(UPDATE_ENC);
      const dec = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i++) dec[i] = data[i] ^ key[i % key.length];
      return Object.assign({}, UPDATE_SOURCE, JSON.parse(dec.toString('utf8')));
    }
  } catch (e) {}
  return Object.assign({}, UPDATE_SOURCE);
}
function run(cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs || 180000, maxBuffer: 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).slice(0, 300)));
      else resolve(stdout);
    });
  });
}
function localVersion() {
  try { return JSON.parse(fs.readFileSync('package.json', 'utf8')).version; } catch (e) {}
  try {
    const first = fs.readFileSync(ARKV_MD, 'utf8').split('\n')[0].trim();
    return first.split(/\s+/).pop().replace(/^v/, '');
  } catch (e) { return '0.0.0'; }
}
async function remoteVersion(src) {
  const url = 'https://raw.githubusercontent.com/' + src.owner + '/' + src.repo + '/' + src.branch + '/package.json';
  const res = await fetch(url, { headers: { 'User-Agent': 'Arklum-Updater' } });
  if (!res.ok) throw new Error('Version check failed: ' + res.status + ' (is the repo public?)');
  return JSON.parse(await res.text()).version;
}
function cleanClone() { try { fs.rmSync(CLONE_DIR, { recursive: true, force: true }); } catch (e) {} }

registerCommand('check_for_update')(async (params, { socket }) => {
  try {
    const src = getSource();
    const current = localVersion();
    logger.info('[UPDATER] checking ' + src.owner + '/' + src.repo + '@' + src.branch + ' (local v' + current + ')');
    const latest = await remoteVersion(src);
    logger.info('[UPDATER] remote v' + latest);
    if (latest !== current) {
      socket.emit('update_available', { current: current, latest: latest, zip_url: '', notes: '' });
    } else {
      logger.info('[UPDATER] up to date — nothing to do');
      socket.emit('update_not_available', { message: 'Up to date (v' + current + ').' });
    }
  } catch (e) {
    logger.error('Update check error: ' + e.message);
    socket.emit('update_error', { message: e.message });
  }
});

registerCommand('perform_update')(async (params, { socket }) => {
  const src = getSource();
  try {
    socket.emit('update_progress', { step: 'Checking git...', percent: 5 });
    try { await run('git --version', 15000); }
    catch (e) { throw new Error('git not installed — Termux: pkg install git · Windows: git-scm.com'); }

    socket.emit('update_progress', { step: 'Cloning latest (shallow)...', percent: 15 });
    cleanClone();
    await run('git clone --depth 1 --single-branch --branch ' + src.branch + ' https://github.com/' + src.owner + '/' + src.repo + '.git "' + CLONE_DIR + '"');

    if (!fs.existsSync(path.join(CLONE_DIR, 'bot.js')) || !fs.existsSync(path.join(CLONE_DIR, 'package.json'))) {
      throw new Error('Clone is not the full project (anti-brick abort)');
    }
    const latest = JSON.parse(fs.readFileSync(path.join(CLONE_DIR, 'package.json'), 'utf8')).version;
    const oldVer = localVersion();

    socket.emit('update_progress', { step: 'Backing up v' + oldVer + '...', percent: 55 });
    const backupDir = path.join(BACKUP_DIR, oldVer);
    fs.mkdirSync(backupDir, { recursive: true });

    socket.emit('update_progress', { step: 'Merging into your copy...', percent: 70 });
    let written = 0;
    const installed = [];
    (function walk(dir, relBase) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = relBase ? relBase + '/' + entry.name : entry.name;
        if (!relBase && SKIP_COPY.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, rel); }
        else if (entry.isFile()) {
          if (!CORE_PLUGIN_FILE.test(rel) && EXCLUDE_DIRS.some(d => rel === d || rel.startsWith(d + '/'))) continue;
          const dest = path.join('.', rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          if (fs.existsSync(dest)) {
            const bp = path.join(backupDir, rel);
            fs.mkdirSync(path.dirname(bp), { recursive: true });
            try { fs.copyFileSync(dest, bp); } catch (e) {}
          }
          fs.copyFileSync(full, dest);
          installed.push(rel);
          written++;
        }
      }
    })(CLONE_DIR, '');

    try {
      if (fs.existsSync(ARKV_MD)) {
        const lines = fs.readFileSync(ARKV_MD, 'utf8').split('\n');
        if (lines.length && lines[0].startsWith('# Arklum ')) lines[0] = '# Arklum v' + latest;
        fs.writeFileSync(ARKV_MD, lines.join('\n'));
      }
    } catch (e) {}

    logger.info('[UPDATER] merged ' + written + ' files: ' + installed.slice(0, 12).join(', ') + (installed.length > 12 ? ' ...' : ''));
    logger.info('[UPDATER] v' + oldVer + ' → v' + latest + ' — restart to apply');
    socket.emit('update_complete', { message: 'Update installed (' + written + ' files). Please restart.' });
  } catch (e) {
    logger.error('Update error: ' + e.message);
    socket.emit('update_error', { message: 'Update failed: ' + e.message });
  } finally {
    cleanClone();
  }
});

registerCommand('rollback_update')(async (params, { socket }) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) { socket.emit('update_error', { message: 'No backups found.' }); return; }
    const versions = fs.readdirSync(BACKUP_DIR).sort();
    if (!versions.length) { socket.emit('update_error', { message: 'No backups found.' }); return; }
    const dir = path.join(BACKUP_DIR, versions[versions.length - 1]);
    let written = 0;
    (function walk(d, relBase) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const rel = relBase ? relBase + '/' + entry.name : entry.name;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) { walk(full, rel); }
        else {
          if (!CORE_PLUGIN_FILE.test(rel) && EXCLUDE_DIRS.some(x => rel === x || rel.startsWith(x + '/'))) continue;
          const dest = path.join('.', rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(full, dest);
          written++;
        }
      }
    })(dir, '');
    logger.info('[UPDATER] rollback restored ' + written + ' files from v' + versions[versions.length - 1]);
    socket.emit('update_complete', { message: 'Rollback complete. Please restart.' });
  } catch (e) {
    socket.emit('update_error', { message: 'Rollback failed: ' + e.message });
  }
});