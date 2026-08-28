#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.arklum_sys', '.git', 'data'];
const SCAN_EXT = ['.js', '.cjs', '.mjs'];
const BUILTINS = new Set(require('module').builtinModules);
const EXTRA_DEPS = [];

const RE_REQUIRE = /(?:require|import)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
const RE_IMPORT_FROM = /(?:^|\s)(?:import|export)[^'"`\n]*?\bfrom\s*['"`]([^'"`]+)['"`]/g;
const RE_IMPORT_BARE = /(?:^|\s)import\s*['"`]([^'"`]+)['"`]/g;

function pkgName(spec) {
  if (!spec || spec.startsWith('node:')) return null;
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('#')) return null;
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

function scanDir(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    if (IGNORE_DIRS.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { scanDir(full, out); continue; }
    if (SCAN_EXT.includes(path.extname(e.name))) {
      let code; try { code = fs.readFileSync(full, 'utf8'); } catch (err) { continue; }
      for (const re of [RE_REQUIRE, RE_IMPORT_FROM, RE_IMPORT_BARE]) {
        for (const m of code.matchAll(re)) { const n = pkgName(m[1]); if (n) out.add(n); }
      }
    } else if (e.name === 'package.json' || e.name === 'plugin.json') {
      try {
        const j = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (e.name === 'package.json') {
          Object.keys(j.dependencies || {}).forEach(k => { const n = pkgName(k); if (n) out.add(n); });
        } else {
          (j.dependencies || j.deps || []).forEach(k => { const n = pkgName(String(k)); if (n) out.add(n); });
        }
      } catch (err) {}
    }
  }
}

function installedSet() {
  const s = new Set();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    Object.keys(pkg.dependencies || {}).forEach(k => s.add(k));
    Object.keys(pkg.devDependencies || {}).forEach(k => s.add(k));
  } catch (e) {}
  try {
    for (const d of fs.readdirSync(path.join(ROOT, 'node_modules'))) {
      if (d.startsWith('.')) continue;
      if (d.startsWith('@')) {
        try { for (const sub of fs.readdirSync(path.join(ROOT, 'node_modules', d))) s.add(d + '/' + sub); } catch (e) {}
      } else s.add(d);
    }
  } catch (e) {}
  return s;
}

const required = new Set(EXTRA_DEPS);
scanDir(ROOT, required);
const installed = installedSet();
const external = [...required].filter(n => !BUILTINS.has(n)).sort();
const missing = external.filter(n => !installed.has(n));

console.log('[ARKLUM] deps scan found: ' + external.join(', '));
if (missing.length) {
  console.log('[ARKLUM] auto-installing: ' + missing.join(', '));
  try {
    execSync('npm install ' + missing.map(m => '"' + m + '"').join(' ') + ' --no-audit --no-fund', { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    console.error('[ARKLUM] install failed: ' + e.message);
  }
}