#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
function run() {
  const bot = spawn(process.execPath, [path.join(__dirname, '..', 'bot.js')], { stdio: 'inherit' });
  bot.on('exit', (code) => {
    if (code === 42) {
      console.log('[ARKLUM] Restart requested — relaunching…');
      setTimeout(run, 600);
    } else {
      process.exit(code == null ? 0 : code);
    }
  });
}
run();