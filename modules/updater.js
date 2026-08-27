const path = require('path');
const { execFile } = require('child_process');
const { logger, registerCommand } = require('../bot');

const ARK_CLI = path.join(process.cwd(), 'scripts', '1kd.js');

function runArk(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [ARK_CLI].concat(args, ['--json']), {
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || err.message).slice(0, 1000)));
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error('Invalid updater response: ' + stdout.slice(0, 300)));
      }
    });
  });
}

registerCommand('check_for_update')(async (params, { socket }) => {
  try {
    const r = await runArk(['check'], 30000);

    if (!r.ok) {
      socket.emit('update_error', { message: r.error || 'Update check failed' });
      return;
    }

    if (r.updateAvailable) {
      logger.info('[UPDATER] update available v' + r.current + ' → v' + r.latest);
      socket.emit('update_available', {
        current: r.current,
        latest: r.latest,
        zip_url: '',
        notes: 'Update available. You can dismiss this and update later.'
      });
    } else {
      socket.emit('update_not_available', {
        message: 'Up to date (v' + r.current + ').'
      });
    }
  } catch (e) {
    logger.error('[UPDATER] check failed: ' + e.message);
    socket.emit('update_error', { message: e.message });
  }
});

registerCommand('perform_update')(async (params, { socket }) => {
  try {
    socket.emit('update_progress', { step: 'Cloning latest repo...', percent: 15 });
    const r = await runArk(['update'], 240000);

    if (!r.ok) {
      socket.emit('update_error', { message: r.error || 'Update failed' });
      return;
    }

    if (!r.changed) {
      socket.emit('update_complete', { message: r.message || 'Already up to date.' });
      return;
    }

    logger.info('[UPDATER] installed ' + r.written + ' files: ' + (r.installed || []).join(', '));
    socket.emit('update_complete', {
      message: 'Update installed (' + r.written + ' files). Backup saved. Please restart.'
    });
  } catch (e) {
    logger.error('[UPDATER] update failed: ' + e.message);
    socket.emit('update_error', { message: e.message });
  }
});

registerCommand('repair_update')(async (params, { socket }) => {
  try {
    socket.emit('update_progress', { step: 'Repairing from repo...', percent: 10 });
    const r = await runArk(['repair'], 240000);

    if (!r.ok) {
      socket.emit('update_error', { message: r.error || 'Repair failed' });
      return;
    }

    socket.emit('update_complete', {
      message: 'Repair complete (' + r.written + ' files). Please restart.'
    });
  } catch (e) {
    socket.emit('update_error', { message: e.message });
  }
});

registerCommand('rollback_update')(async (params, { socket }) => {
  try {
    socket.emit('update_progress', { step: 'Rolling back...', percent: 25 });
    const r = await runArk(['rollback'], 120000);

    if (!r.ok) {
      socket.emit('update_error', { message: r.error || 'Rollback failed' });
      return;
    }

    socket.emit('update_complete', {
      message: 'Rollback complete. Restored ' + r.restored + ' files. Please restart.'
    });
  } catch (e) {
    socket.emit('update_error', { message: e.message });
  }
});