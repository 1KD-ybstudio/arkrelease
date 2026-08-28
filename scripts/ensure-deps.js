#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.arklum_sys', '.git', 'data'];
const BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto',
  'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'module',
  'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty',
  'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib', 'inspector', 'diagnostics_channel'
]);

function scanDir(dir, base) {
  const reqs = new Set();
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = base ? base + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        for (const r of scanDir(full, rel)) reqs.add(r);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          const code = fs.readFileSync(full, 'utf8');
          const matches = code.matchAll(/(?:require|import)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
          for (const m of matches) {
            const pkg = m[1];
            if (pkg.startsWith('.') || pkg.startsWith('/') || pkg.startsWith('#')) continue;
            const name = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
            reqs.add(name);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  return reqs;
}

function getInstalled() {
  const installed = new Set();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    for (const k of Object.keys(pkg.dependencies || {})) installed.add(k);
    for (const k of Object.keys(pkg.devDependencies || {})) installed.add(k);
  } catch (e) {}
  try {
    for (const d of fs.readdirSync(path.join(ROOT, 'node_modules'))) {
      if (d.startsWith('.')) continue;
      if (d.startsWith('@')) {
        for (const sub of fs.readdirSync(path.join(ROOT, 'node_modules', d))) {
          installed.add(d + '/' + sub);
        }
      } else {
        installed.add(d);
      }
    }
  } catch (e) {}
  return installed;
}

const required = scanDir(ROOT, '');
const installed = getInstalled();
const missing = [];
for (const r of required) {
  if (BUILTINS.has(r)) continue;
  if (installed.has(r)) continue;
  missing.push(r);
}

if (missing.length > 0) {
  console.log('[ARKLUM] auto-installing missing dependencies:', missing.join(', '));
  try {
    execSync('npm install ' + missing.join(' ') + ' --no-audit --no-fund --silent', { stdio: 'inherit' });
  } catch (e) {
    console.error('[ARKLUM] failed to install some dependencies:', e.message);
  }
}