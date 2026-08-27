const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

const files = ['bot.js',
  ...fs.readdirSync(path.join(root, 'modules')).filter(f => f.endsWith('.js')).map(f => 'modules/' + f)
];

const set = new Set();
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[1];
    if (s.startsWith('.') || s.startsWith('node:')) continue;
    set.add(s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0]);
  }
}

const missing = [...set].filter(p => {
  try { require.resolve(p, { paths: [root] }); return false; } catch (e) { return true; }
});

if (missing.length) {
  console.log('[ARKLUM] installing missing deps: ' + missing.join(', '));
  execSync('npm install --no-audit --no-fund ' + missing.join(' '), { cwd: root, stdio: 'inherit' });
} else {
  console.log('[ARKLUM] all dependencies present');
}