#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const note = process.argv.slice(2).join(' ').trim();
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const parts = String(pkg.version || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
parts[2] += 1;
pkg.version = parts.join('.');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
function run(cmd) { console.log('$ ' + cmd); execSync(cmd, { stdio: 'inherit' }); }
run('git add -A');
run('git commit -m "v' + pkg.version + (note ? ' — ' + note : '') + '"');
run('git push');
console.log('[SHIP] done → v' + pkg.version + ' is live');
