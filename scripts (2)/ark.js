#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();

const UPDATE_SOURCE = {
  owner: '1KD-ybstudio',
  repo: 'arkrelease',
  branch: 'main'
};

const SYS_DIR = path.join(ROOT, '.arklum_sys');
const CLONE_DIR = path.join(SYS_DIR, 'update-clone');
const BACKUP_DIR = path.join(SYS_DIR, 'backups');
const UPDATE_ENC = path.join(SYS_DIR, 'update', 'update.enc');

const CORE_PLUGIN_FILE = /^plugins\/[^/]+\.js$/;

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const JSON_MODE = args.includes('--json');
const FORCE = args.includes('--force');
const YES = args.includes('--yes');

function out(msg) {
  if (!JSON_MODE) console.log('[ARK]', msg);
}

function json(obj) {
  console.log(JSON.stringify(obj));
}

function fail(message, code = 1) {
  if (JSON_MODE) json({ ok: false, error: message });
  else console.error('[ARK] ERROR:', message);
  process.exit(code);
}

function ensureProjectRoot() {
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    fail('Run this command from the Arklum project root.');
  }
}

function ensureSystemDirs() {
  fs.mkdirSync(SYS_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

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

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd || ROOT,
      shell: false,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());

    child.on('error', reject);

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error((stderr || stdout || `${command} exited ${code}`).slice(0, 1000)));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function ensureGit() {
  try {
    await run('git', ['--version']);
  } catch (e) {
    fail('git is not installed. Termux: pkg install git -y | Windows: install Git for Windows.');
  }
}

function localVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

async function remoteVersion(src) {
  const url = `https://raw.githubusercontent.com/${src.owner}/${src.repo}/${src.branch}/package.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Arklum-Updater' } });

  if (!res.ok) {
    throw new Error(`Remote version check failed: ${res.status}. Is the repo public?`);
  }

  const pkg = JSON.parse(await res.text());
  return pkg.version || '0.0.0';
}

function cleanClone() {
  try {
    fs.rmSync(CLONE_DIR, { recursive: true, force: true });
  } catch (e) {}
}

function relPath(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function isProtected(rel) {
  rel = rel.replace(/\\/g, '/');

  if (!rel) return true;

  if (rel === '.git' || rel.startsWith('.git/')) return true;
  if (rel === 'node_modules' || rel.startsWith('node_modules/')) return true;
  if (rel === '.arklum_sys/key.bin') return true;
  if (rel === '.arklum_sys/tokens.enc') return true;
  if (rel.startsWith('.arklum_sys/backups/')) return true;
  if (rel.startsWith('.arklum_sys/staging/')) return true;
  if (rel.startsWith('.arklum_sys/update-clone/')) return true;
  if (rel === 'static/themes' || rel.startsWith('static/themes/')) return true;
  if ((rel === 'plugins' || rel.startsWith('plugins/')) && !CORE_PLUGIN_FILE.test(rel)) {
    return true;
  }

  return false;
}

function walkFiles(dir, base, list) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      walkFiles(full, rel, list);
    } else if (entry.isFile()) {
      list.push({ full, rel });
    }
  }
}

function atomicCopy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.arktmp';
  fs.copyFileSync(src, tmp);
  fs.renameSync(tmp, dest);
}

function createBackup(files, fromVersion, toVersion) {
  const id = `${Date.now()}-v${fromVersion}`;
  const dir = path.join(BACKUP_DIR, id);
  const filesDir = path.join(dir, 'files');

  fs.mkdirSync(filesDir, { recursive: true });

  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    fromVersion,
    toVersion,
    files: []
  };

  for (const item of files) {
    const dest = path.join(ROOT, item.rel);
    const backupDest = path.join(filesDir, item.rel);

    const existed = fs.existsSync(dest);

    manifest.files.push({
      rel: item.rel,
      existed
    });

    if (existed) {
      fs.mkdirSync(path.dirname(backupDest), { recursive: true });
      fs.copyFileSync(dest, backupDest);
    }
  }

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}

function latestBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) return null;

  const dirs = fs.readdirSync(BACKUP_DIR)
    .map(name => path.join(BACKUP_DIR, name))
    .filter(p => fs.statSync(p).isDirectory())
    .sort();

  return dirs.length ? dirs[dirs.length - 1] : null;
}

async function cloneLatest(src) {
  cleanClone();
  fs.mkdirSync(SYS_DIR, { recursive: true });

  const repoUrl = `https://github.com/${src.owner}/${src.repo}.git`;

  out(`cloning ${repoUrl}#${src.branch}`);
  await run('git', [
    'clone',
    '--depth', '1',
    '--single-branch',
    '--branch', src.branch,
    repoUrl,
    CLONE_DIR
  ]);

  if (!fs.existsSync(path.join(CLONE_DIR, 'bot.js'))) {
    throw new Error('Clone missing bot.js. Repo is not a full Arklum tree.');
  }

  if (!fs.existsSync(path.join(CLONE_DIR, 'package.json'))) {
    throw new Error('Clone missing package.json. Repo is not a full Arklum tree.');
  }
}

async function doCheck() {
  ensureProjectRoot();

  const src = getSource();
  const current = localVersion();
  const latest = await remoteVersion(src);

  const available = latest !== current;

  if (JSON_MODE) {
    json({
      ok: true,
      current,
      latest,
      updateAvailable: available,
      source: src
    });
    return;
  }

  out(`local  v${current}`);
  out(`remote v${latest}`);
  out(available ? 'update available' : 'already up to date');
}

async function doUpdate(options = {}) {
  ensureProjectRoot();
  ensureSystemDirs();
  await ensureGit();

  const src = getSource();
  const current = localVersion();
  const latest = await remoteVersion(src);

  if (!options.force && latest === current) {
    if (JSON_MODE) {
      json({ ok: true, changed: false, current, latest, message: 'Already up to date.' });
    } else {
      out(`already up to date (v${current})`);
    }
    return;
  }

  await cloneLatest(src);

  const clonedVersion = JSON.parse(fs.readFileSync(path.join(CLONE_DIR, 'package.json'), 'utf8')).version || latest;

  const allFiles = [];
  walkFiles(CLONE_DIR, '', allFiles);

  const allowed = allFiles.filter(item => !isProtected(item.rel));

  out(`backing up ${allowed.length} target files`);
  const backupDir = createBackup(allowed, current, clonedVersion);

  let written = 0;
  const installed = [];

  for (const item of allowed) {
    const dest = path.join(ROOT, item.rel);
    atomicCopy(item.full, dest);
    written++;
    installed.push(item.rel);
  }
  try {
    const arkv = path.join(SYS_DIR, 'arkv.md');
    if (fs.existsSync(arkv)) {
      const lines = fs.readFileSync(arkv, 'utf8').split('\n');
      if (lines[0] && lines[0].startsWith('# Arklum ')) {
        lines[0] = `# Arklum v${clonedVersion}`;
      }
      fs.writeFileSync(arkv, lines.join('\n'));
    }
  } catch (e) {}

  cleanClone();

  if (JSON_MODE) {
    json({
      ok: true,
      changed: true,
      from: current,
      to: clonedVersion,
      written,
      backup: relPath(backupDir),
      installed: installed.slice(0, 25)
    });
    return;
  }

  out(`installed ${written} files`);
  out(`backup saved: ${relPath(backupDir)}`);
  out(`v${current} → v${clonedVersion}`);
  out(installed.slice(0, 12).join(', ') + (installed.length > 12 ? ' ...' : ''));
}

async function doRepair() {
  out('repair mode: forcing reclone and overlay');
  await doUpdate({ force: true });
}

async function doRollback() {
  ensureProjectRoot();

  const dir = latestBackupDir();
  if (!dir) fail('No backup found.');

  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail('Backup manifest missing. Cannot safely rollback.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const filesDir = path.join(dir, 'files');

  let restored = 0;
  let removed = 0;

  for (const file of manifest.files) {
    const dest = path.join(ROOT, file.rel);
    const backupFile = path.join(filesDir, file.rel);

    if (file.existed) {
      if (fs.existsSync(backupFile)) {
        atomicCopy(backupFile, dest);
        restored++;
      }
    } else {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        removed++;
      }
    }
  }

  if (JSON_MODE) {
    json({
      ok: true,
      backup: path.basename(dir),
      restored,
      removed,
      from: manifest.toVersion,
      to: manifest.fromVersion
    });
    return;
  }

  out(`rollback complete`);
  out(`restored ${restored}, removed ${removed}`);
  out(`backup: ${path.basename(dir)}`);
}

function doResetSystem() {
  ensureProjectRoot();

  if (!YES) {
    fail('Refusing reset without --yes. This deletes local system state like tokens.enc.');
  }

  const targets = [
    path.join(SYS_DIR, 'tokens.enc'),
    path.join(SYS_DIR, 'backups'),
    path.join(SYS_DIR, 'staging'),
    path.join(SYS_DIR, 'update-clone')
  ];

  for (const t of targets) {
    fs.rmSync(t, { recursive: true, force: true });
  }

  if (JSON_MODE) json({ ok: true, message: 'System state reset.' });
  else out('system state reset complete');
}

function help() {
  console.log(`
Arklum command tool

Usage:
  node scripts/ark.js check
  node scripts/ark.js update
  node scripts/ark.js repair
  node scripts/ark.js rollback
  node scripts/ark.js reset-system --yes

npm shortcuts:
  npm run upd
  npm run repair
  npm run rollback

Optional:
  npm link
  ark check
  ark update
  ark repair
  ark rollback
`);
}

(async () => {
  try {
    if (cmd === 'check') await doCheck();
    else if (cmd === 'update') await doUpdate({ force: FORCE });
    else if (cmd === 'repair') await doRepair();
    else if (cmd === 'rollback') await doRollback();
    else if (cmd === 'reset-system') doResetSystem();
    else help();
  } catch (e) {
    cleanClone();
    fail(e.message);
  }
})();