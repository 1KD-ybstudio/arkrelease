
(function () {
  if (window.arkIcon) return;
  var S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  window.ArkIcons = {
    mic: '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0"/><path d="M12 16.5V21"/><path d="M9 21h6"/>',
    'mic-off': '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0"/><path d="M12 16.5V21"/><path d="M4 4l16 16"/>',
    chat: '<path d="M21 11.5a8 8 0 0 1-8.5 8L4 21l1.6-3.6A8 8 0 1 1 21 11.5z"/>',
    leave: '<path d="M4 14c4.5-4.5 11.5-4.5 16 0"/><path d="M4 14l-1.5 3.5L6 19"/><path d="M20 14l1.5 3.5L18 19"/>',
    react: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    reply: '<path d="M9 14L4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 7 7v4"/>',
    edit: '<path d="M4 20l4.5-1L20 7.5l-3.5-3.5L5 15.5 4 20z"/><path d="M13.5 6l3.5 3.5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M4 12l16-8-6.5 16-2.5-6.5L4 12z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    hash: '<path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17"/>',
    down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    book: '<path d="M5 4a2 2 0 0 1 2-2h12v18H7a2 2 0 0 0-2 2V4z"/><path d="M9 2v18"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
    warn: '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    play: '<path d="M8 5l11 7-11 7V5z"/>',
    file: '<path d="M6 2h8l4 4v16H6V2z"/><path d="M14 2v4h4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'
  };
  window.arkIcon = function (name, size, cls) {
    var b = window.ArkIcons[name] || '';
    return '<svg class="' + (cls || 'ark-ic') + '" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" ' + S + ' aria-hidden="true">' + b + '</svg>';
  };
  var st = document.createElement('style');
  st.textContent = '.ark-ic{vertical-align:-3px;flex-shrink:0}';
  document.head.appendChild(st);
})();

const AVAILABLE_FONTS = [
  { name: 'Inter', weight: '400;500;600;700' },
  { name: 'Roboto', weight: '400;500;700' },
  { name: 'Open Sans', weight: '400;600;700' },
  { name: 'Poppins', weight: '400;500;600;700' },
  { name: 'Nunito', weight: '400;600;700' },
  { name: 'Montserrat', weight: '400;500;600;700' }
];

window._globalThemePath = null;
window._globalThemeLoaded = false;
let currentSettingsTab = 'appearance';

function setTheme(theme) {
  document.body.className = 'theme-' + theme;
  document.documentElement.style.setProperty('--bg-image', 'none');
  const overlay = document.querySelector('.bg-overlay');
  if (overlay) overlay.remove();
  localStorage.setItem('arklum_theme', theme);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'theme', value: theme } });
  window._dashboardPrefs = window._dashboardPrefs || {};
  window._dashboardPrefs.theme_path = '';
  localStorage.removeItem('arklum_theme_path');
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'theme_path', value: '' } });
  highlightThemeSelection(theme);
}

function highlightThemeSelection(theme) {
  document.querySelectorAll('.theme-card').forEach(el => el.style.border = 'none');
  const active = document.getElementById('theme-' + theme + '-card');
  if (active) active.style.border = '2px solid var(--primary)';
}

function loadTheme() {
  const saved = localStorage.getItem('arklum_theme') || 'dark';
  setTheme(saved);
}

function loadFont(fontName) {
  const font = AVAILABLE_FONTS.find(f => f.name === fontName) || AVAILABLE_FONTS[0];
  const link = document.getElementById('google-fonts-link');
  if (link) {
    link.href = `https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, '+')}:wght@${font.weight}&display=swap`;
  }
  document.body.style.fontFamily = `'${font.name}', sans-serif`;
  localStorage.setItem('arklum_font', fontName);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'font', value: fontName } });
  const selector = document.getElementById('font-selector');
  if (selector) selector.value = fontName;
}

function setFont(fontName) { loadFont(fontName); }

function loadStoredFont() {
  const saved = localStorage.getItem('arklum_font') || 'Inter';
  loadFont(saved);
}

function toggleDensity() {
  document.body.classList.toggle('density-compact');
  const isCompact = document.body.classList.contains('density-compact');
  const val = isCompact ? 'compact' : 'cozy';
  localStorage.setItem('arklum_density', val);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'density', value: val } });
  const toggle = document.getElementById('toggle-density');
  if (toggle) toggle.classList.toggle('active', isCompact);
}

function applyDensityState() {
  const density = localStorage.getItem('arklum_density');
  if (density === 'compact') {
    document.body.classList.add('density-compact');
    const toggle = document.getElementById('toggle-density');
    if (toggle) toggle.classList.add('active');
  }
}

function toggleConfirmations() {
  const enabled = localStorage.getItem('arklum_confirmations') !== 'false';
  localStorage.setItem('arklum_confirmations', !enabled);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'confirmations', value: !enabled } });
  const toggle = document.getElementById('toggle-confirmations');
  if (toggle) toggle.classList.toggle('active', !enabled);
}

function applyBorderRadius(style) {
  const radii = {
    sharp: { radius: '2px', radiusSm: '2px' },
    subtle: { radius: '8px', radiusSm: '4px' },
    rounded: { radius: '16px', radiusSm: '8px' },
    pill: { radius: '999px', radiusSm: '16px' }
  };
  const r = radii[style] || radii.subtle;
  document.documentElement.style.setProperty('--radius', r.radius);
  document.documentElement.style.setProperty('--radius-sm', r.radiusSm);
  localStorage.setItem('arklum_border_radius', style);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'border_radius', value: style } });
}

function applyStoredBorderRadius() {
  const style = localStorage.getItem('arklum_border_radius') || 'subtle';
  applyBorderRadius(style);
}

function applyShadowIntensity(style) {
  const shadows = {
    none: 'none',
    subtle: '0 2px 8px rgba(0,0,0,0.1)',
    normal: '0 4px 16px rgba(0,0,0,0.15)',
    deep: '0 8px 32px rgba(0,0,0,0.25)'
  };
  const val = shadows[style] || shadows.normal;
  document.documentElement.style.setProperty('--shadow', val);
  localStorage.setItem('arklum_shadow_intensity', style);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'shadow_intensity', value: style } });
}

function applyStoredShadowIntensity() {
  const style = localStorage.getItem('arklum_shadow_intensity') || 'normal';
  applyShadowIntensity(style);
}

function applyAnimationSpeed(speed) {
  const multiplier = parseFloat(speed);
  document.documentElement.style.setProperty('--animation-speed', multiplier);
  localStorage.setItem('arklum_animation_speed', speed);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'animation_speed', value: multiplier } });
}

function applyStoredAnimationSpeed() {
  const speed = localStorage.getItem('arklum_animation_speed') || '1';
  applyAnimationSpeed(speed);
}

function applyAnimationEasing(easing) {
  document.documentElement.style.setProperty('--animation-easing', easing);
  localStorage.setItem('arklum_animation_easing', easing);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'animation_easing', value: easing } });
}

function applyStoredAnimationEasing() {
  const easing = localStorage.getItem('arklum_animation_easing') || 'ease';
  applyAnimationEasing(easing);
}

function applyAllPrefs(prefs) {
  if (prefs.theme && !window._globalThemePath && window._globalThemeLoaded) { setTheme(prefs.theme); }
  if (prefs.font) loadFont(prefs.font);
  if (prefs.density) {
    if (prefs.density === 'compact') document.body.classList.add('density-compact');
    else document.body.classList.remove('density-compact');
  }
  if (prefs.features_enabled) updateFeatureSidebar();
  if (prefs.sidebar_logo_url !== undefined) {
    applySidebarLogo(prefs.sidebar_logo_url || null);
  }
  if (prefs.refresh_interval) {
    if (window.statsInterval) {
      clearInterval(window.statsInterval);
      window.statsInterval = setInterval(function() {
        if (AppState.currentPage === 'home') {
          socket.emit('run_command', { cmd: 'get_system_stats', params: {} });
        }
      }, prefs.refresh_interval * 1000);
    }
  }
  if (prefs.background_tasks) {
    Object.keys(prefs.background_tasks).forEach(key => {
      const task = prefs.background_tasks[key];
      const toggle = document.getElementById('bg_toggle_' + key);
      const status = document.getElementById('bg_status_' + key);
      const prefixInput = document.getElementById('bg_prefix_' + key);
      if (toggle) toggle.classList.toggle('active', task.enabled);
      if (status) status.textContent = task.enabled ? 'ON' : 'OFF';
      if (prefixInput) prefixInput.value = task.prefix || '$';
    });
  }
  if (prefs.animation_speed !== undefined) {
    document.documentElement.style.setProperty('--animation-speed', prefs.animation_speed);
  }
  if (prefs.animation_easing) {
    document.documentElement.style.setProperty('--animation-easing', prefs.animation_easing);
  }
  if (prefs.border_radius) {
    const radii = {
      sharp: { radius: '2px', radiusSm: '2px' },
      subtle: { radius: '8px', radiusSm: '4px' },
      rounded: { radius: '16px', radiusSm: '8px' },
      pill: { radius: '999px', radiusSm: '16px' }
    };
    const r = radii[prefs.border_radius] || radii.subtle;
    document.documentElement.style.setProperty('--radius', r.radius);
    document.documentElement.style.setProperty('--radius-sm', r.radiusSm);
  }
  if (prefs.shadow_intensity) {
    const shadows = {
      none: 'none',
      subtle: '0 2px 8px rgba(0,0,0,0.1)',
      normal: '0 4px 16px rgba(0,0,0,0.15)',
      deep: '0 8px 32px rgba(0,0,0,0.25)'
    };
    const val = shadows[prefs.shadow_intensity] || shadows.normal;
    document.documentElement.style.setProperty('--shadow', val);
  }
}

socket.on('dashboard_prefs', function(prefs) {
  window._dashboardPrefs = prefs;
  applyAllPrefs(prefs);
  if (window._globalThemePath) {
    applyCustomTheme(window._globalThemePath);
  }
});

function getEnabledFeatures() {
  try {
    return JSON.parse(localStorage.getItem('arklum_features_enabled') || '["management","devportal","status","utility","plugins"]');
  } catch { return ["management","devportal","status","utility","plugins"]; }
}

function saveEnabledFeatures(features) {
  localStorage.setItem('arklum_features_enabled', JSON.stringify(features));
}

function updateFeatureSidebar() {
  const features = getEnabledFeatures();
  ['management','devportal','status','utility','plugins'].forEach(function(id) {
    const cat = document.getElementById(id+'-category');
    if (cat) cat.style.display = features.includes(id) ? '' : 'none';
  });
}

function toggleSidebarFeature(id) {
  const features = getEnabledFeatures();
  const idx = features.indexOf(id);
  if (idx > -1) features.splice(idx, 1);
  else features.push(id);
  saveEnabledFeatures(features);
  updateFeatureSidebar();
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'features_enabled', value: features } });
  const toggle = document.getElementById('toggle-'+id);
  if (toggle) toggle.classList.toggle('active', features.includes(id));
}

function loadFeatureToggles() {
  const features = getEnabledFeatures();
  ['management','devportal','status','utility','plugins'].forEach(function(id) {
    const toggle = document.getElementById('toggle-'+id);
    if (toggle) toggle.classList.toggle('active', features.includes(id));
  });
  updateFeatureSidebar();
}

function buildFeatureToggle(id, name) {
  return `<div style="display:flex; align-items:center; justify-content:space-between; margin:8px 0;"><span>${esc(name)}</span><div class="toggle-switch" id="toggle-${id}" onclick="toggleSidebarFeature('${id}')"></div></div>`;
}

function renderTokenListInSettings() {
  const container = document.getElementById('settings-token-list');
  if (!container) return;
  socket.emit('run_command', { cmd: 'token_list', params: {} });
}

function addTokenFromSettings() {
  const token = document.getElementById('new-token').value.trim();
  if (!token) return pushNotification('Token required', '', 'warning');
  socket.emit('add_token', { token });
  document.getElementById('new-token').value = '';
  pushNotification('Token added', '', 'success');
}

function uploadSidebarLogo(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result.split(',')[1];
    socket.emit('run_command', { cmd: 'settings_upload_logo', params: { image: base64 } });
  };
  reader.readAsDataURL(file);
}

socket.on('logo_updated', function(data) {
  localStorage.setItem('arklum_sidebar_logo_url', data.url);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'sidebar_logo_url', value: data.url } });
  applySidebarLogo(data.url);
  const preview = document.getElementById('sidebar-logo-preview');
  if (preview) preview.innerHTML = `<img src="${data.url}" style="max-width:120px; max-height:60px;">`;
  pushNotification('Logo updated', '', 'success');
});

function resetSidebarLogo() {
  localStorage.removeItem('arklum_sidebar_logo_url');
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'sidebar_logo_url', value: '' } });
  applySidebarLogo(null);
  const preview = document.getElementById('sidebar-logo-preview');
  if (preview) preview.innerHTML = '';
  socket.emit('run_command', { cmd: 'settings_upload_logo', params: { image: '' } });
}

function applySidebarLogo(url) {
  const header = document.querySelector('.sidebar-header');
  if (!header) return;
  if (url) {
    header.innerHTML = `<img src="${url}" style="height:40px; width:auto; max-width:100%; object-fit:contain; display:block; margin:0 auto;">`;
  } else {
    header.innerHTML = 'ARKLUM';
  }
}

function loadSidebarLogo() {
  const saved = localStorage.getItem('arklum_sidebar_logo_url');
  applySidebarLogo(saved);
}

function saveRefreshInterval() {
  const val = parseInt(document.getElementById('refresh-interval').value) || 3;
  localStorage.setItem('arklum_refresh_interval', val);
  socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'refresh_interval', value: val } });
  if (window.statsInterval) {
    clearInterval(window.statsInterval);
    window.statsInterval = setInterval(function() {
      if (AppState.currentPage === 'home') {
        socket.emit('run_command', { cmd: 'get_system_stats', params: {} });
      }
    }, val * 1000);
  }
  pushNotification('Refresh interval set to ' + val + 's', '', 'success');
}

function resetCustomVisuals() {
  ['headerLeftImgSlot', 'headerRightImgSlot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.src = '';
      el.style.display = 'none';
      el.removeAttribute('style');
    }
  });

  ['chatCornerTL', 'chatCornerBR'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  const chatStyle = document.getElementById('custom-chat-style');
  if (chatStyle) chatStyle.remove();

  const overlay = document.getElementById('connecting-overlay');
  if (overlay) {
    overlay.innerHTML = '<div style="text-align:center;color:var(--text);"><div class="ethereum-container" style="width:160px;height:160px;margin:0 auto;"><svg xmlns="http://w3.org" viewBox="-80 -80 416 577" width="100%" height="100%"><defs><filter id="magnetic-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><g class="container-cluster"><g class="part-top-left"><path fill="#8a92ff" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="#3438cc" d="M0 212.32l127.96 75.638v-133.8z"/></g><g class="part-top-right"><path fill="#454af8" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="#1a1c72" d="M127.961 287.958l127.96-75.637-127.96-58.162z"/></g><g class="part-bottom-v"><path fill="#8a92ff" d="M127.962 416.905v-104.72L0 236.585z"/><path fill="#3a3edf" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/></g></g></svg></div><div id="loading-message" style="margin-top:16px;font-size:1rem;">Connecting…</div></div>';
  }

  if (typeof applySidebarLogo === 'function') {
    applySidebarLogo(null);
  }

  const bgOverlay = document.querySelector('.bg-overlay');
  if (bgOverlay) bgOverlay.remove();

  const root = document.documentElement;
  root.style.removeProperty('--bg-image');
  root.style.removeProperty('--bg-overlay');
}

function changeTheme(path) {
  socket.emit('run_command', {
    cmd: 'save_global_theme',
    params: { path: path }
  });

  if (path) {
    window._globalThemePath = path;
    document.body.classList.remove('theme-dark', 'theme-oled', 'theme-light');
    document.body.classList.add('custom-theme');
    applyCustomTheme(path);
    populateThemeSelector(path);
  } else {
    window._globalThemePath = null;
    document.body.classList.remove('custom-theme');
    resetCustomVisuals();
    window._currentTheme = null;
    localStorage.removeItem('arklum_sidebar_logo_url');
    socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'sidebar_logo_url', value: '' } });
    const builtIn = (window._dashboardPrefs && window._dashboardPrefs.theme) || 'dark';
    setTheme(builtIn);
    populateThemeSelector(null);
  }
}

function populateThemeSelector(currentPath) {
  const sel = document.getElementById('theme-selector');
  if (!sel) return;

  fetch('/themes/')
    .then(r => r.json())
    .then(files => {
      sel.innerHTML = '<option value="">Default</option>';
      if (Array.isArray(files)) {
        files.forEach(file => {
          const selected = file.path === currentPath ? ' selected' : '';
          sel.innerHTML += `<option value="${file.path}"${selected}>${file.name}</option>`;
        });
      }
    })
    .catch(() => {
      sel.innerHTML = '<option value="">-- Default --</option>';
    });
}

function isMobileDevice() {
return /Mobi|Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
}
const IS_MOBILE = isMobileDevice();

function applyCustomTheme(themePathOverride) {
  document.body.classList.remove('theme-dark', 'theme-oled', 'theme-light');
  const themePath = themePathOverride || (window._dashboardPrefs && window._dashboardPrefs.theme_path)
    || 'themes/default.json';
  const themeUrl = '/' + themePath;

  fetch(themeUrl)
    .then(r => r.json())
    .then(theme => {
      window._currentTheme = theme;
      const root = document.documentElement;
      root.style.setProperty('--bg-deep', theme.colors['bg-deep']);
      root.style.setProperty('--primary', theme.colors.primary);
      root.style.setProperty('--secondary', theme.colors.secondary);
      root.style.setProperty('--text', theme.colors.text);
      root.style.setProperty('--text-muted', theme.colors['text-muted']);

      if (theme.glass) {
        const glassOpacity = theme.glass.opacity;
        root.style.setProperty('--glass-bg', `rgba(24,24,27,${glassOpacity})`);
        root.style.setProperty('--refraction', glassOpacity);
        root.style.setProperty('--blur', theme.glass.blur + 'px');
        root.style.setProperty('--vibrancy', theme.glass.vibrancy + '%');
        root.style.setProperty('--dispersion', theme.glass.shadow + 'px');
      }

      if (theme.fonts) {
        if (theme.fonts.body) {
          root.style.setProperty('--font', theme.fonts.body);
          document.body.style.fontFamily = theme.fonts.body;
        }
        if (theme.fonts.heading) root.style.setProperty('--font-heading', theme.fonts.heading);
      }

      document.body.classList.add('custom-theme');
      root.style.setProperty('--bg-image', 'none');
      root.style.setProperty('--bg-overlay', 'transparent');
      const existingOverlay = document.querySelector('.bg-overlay');
      if (existingOverlay) existingOverlay.remove();

      if (theme.background && theme.background.image) {
        const assetsBase = themeUrl.substring(0, themeUrl.lastIndexOf('/') + 1);
        const imgUrl = assetsBase + theme.background.image;
        root.style.setProperty('--bg-image', 'url(' + imgUrl + ')');
        if (theme.background.overlay) {
          root.style.setProperty('--bg-overlay', theme.background.overlay);
          const overlay = document.createElement('div');
          overlay.className = 'bg-overlay';
          document.body.appendChild(overlay);
        }
      }

      const assetsBase = themeUrl.substring(0, themeUrl.lastIndexOf('/') + 1);

      if (theme.assets) {
        if (theme.assets.loadingScreen) {
          const overlay = document.querySelector('#connecting-overlay');
          if (overlay) {
            overlay.innerHTML = `<img src="${assetsBase + theme.assets.loadingScreen}" style="max-width:160px; max-height:160px; object-fit:contain; margin-bottom:16px;">`;
          }
        }
        if (theme.assets.sidebarLogo) {
          if (typeof applySidebarLogo === 'function') {
            applySidebarLogo(assetsBase + theme.assets.sidebarLogo);
          }
        }
        if (theme.assets.cornerTL) {
          const el = document.getElementById('chatCornerTL');
          if (el) el.innerHTML = `<img src="${assetsBase + theme.assets.cornerTL}" style="opacity:${theme.corner_tl.opacity}; filter:blur(${theme.corner_tl.blur}px);">`;
        }
        if (theme.assets.cornerBR) {
          const el = document.getElementById('chatCornerBR');
          if (el) el.innerHTML = `<img src="${assetsBase + theme.assets.cornerBR}" style="opacity:${theme.corner_br.opacity}; filter:blur(${theme.corner_br.blur}px);">`;
        }
        if (theme.assets.headerLeft) {
          const el = document.getElementById('headerLeftImgSlot') || document.getElementById('headerLeftImg');
          if (el) {
            el.src = assetsBase + theme.assets.headerLeft;
            el.style.display = 'inline-block';
            el.style.opacity = theme.header_left.opacity;
            el.style.filter = `blur(${theme.header_left.blur}px)`;
            el.style.boxShadow = theme.header_left.glow ? `0 0 ${theme.header_left.glow}px rgba(0,212,170,0.5)` : '';
          }
        }
        if (theme.assets.headerRight) {
          const el = document.getElementById('headerRightImgSlot') || document.getElementById('headerRightImg');
          if (el) {
            el.src = assetsBase + theme.assets.headerRight;
            el.style.display = 'inline-block';
            el.style.opacity = theme.header_right.opacity;
            el.style.filter = `blur(${theme.header_right.blur}px)`;
            el.style.boxShadow = theme.header_right.glow ? `0 0 ${theme.header_right.glow}px rgba(0,212,170,0.5)` : '';
          }
        }
      }

      if (theme.chat) {
        root.style.setProperty('--chat-bg', theme.chat.bg);
        root.style.setProperty('--chat-text', theme.chat.text);
        root.style.setProperty('--chat-opacity', theme.chat.opacity);
        root.style.setProperty('--chat-blur', theme.chat.blur + 'px');
        root.style.setProperty('--chat-glow', theme.chat.glow + 'px');
      }
      
      const chatStyle = document.getElementById('custom-chat-style') || document.createElement('style');
      chatStyle.id = 'custom-chat-style';
      chatStyle.textContent = `
        .message-wrapper .msg-text {
          background: var(--chat-bg) !important;
          color: var(--chat-text) !important;
          opacity: var(--chat-opacity) !important;
          backdrop-filter: blur(var(--chat-blur)) !important;
          box-shadow: 0 0 var(--chat-glow) rgba(0,212,170,0.3) !important;
          border-radius: 12px;
          padding: 8px 14px;
        }
      `;
      document.head.appendChild(chatStyle);
      applyThemeVisuals();
      if (typeof refreshInteractiveElements === 'function') setTimeout(refreshInteractiveElements, 50);
    })
    .catch(() => console.warn('Theme not found, using defaults'));
}

function toggleBackgroundTask(key) {
  const current = localStorage.getItem('bg_enabled_' + key) !== 'false';
  const newState = !current;
  localStorage.setItem('bg_enabled_' + key, newState);
  const toggle = document.getElementById('bg_toggle_' + key);
  const status = document.getElementById('bg_status_' + key);
  if (toggle) toggle.classList.toggle('active', newState);
  if (status) status.textContent = newState ? 'ON' : 'OFF';
  socket.emit('run_command', { cmd: 'toggle_background_task', params: { key: key, enabled: newState } });
}

function saveBackgroundPrefix(key, value) {
  localStorage.setItem('bg_prefix_' + key, value);
  socket.emit('run_command', { cmd: 'set_bg_prefix', params: { key: key, prefix: value } });
}

function syncMemeConfig() {
  socket.emit('run_command', { cmd: 'get_meme_config', params: {} });
}

socket.on('meme_config', function(cfg) {
  if (cfg) {
    const enabled = cfg.enabled !== false;
    const prefix = cfg.prefix || '$';
    localStorage.setItem('bg_enabled_memes', enabled);
    localStorage.setItem('bg_prefix_memes', prefix);
    const toggle = document.getElementById('bg_toggle_memes');
    const status = document.getElementById('bg_status_memes');
    const prefixInput = document.getElementById('bg_prefix_memes');
    if (toggle) toggle.classList.toggle('active', enabled);
    if (status) status.textContent = enabled ? 'ON' : 'OFF';
    if (prefixInput) prefixInput.value = prefix;
  }
});

function buildBackgroundTasksContent() {
  const tasks = [
    { key: 'memes', label: 'Meme Generator', desc: 'Commands like $hell, $kms, etc.' }
  ];
  let html = '';
  tasks.forEach(t => {
    const enabled = localStorage.getItem('bg_enabled_' + t.key) !== 'false';
    const prefix = localStorage.getItem('bg_prefix_' + t.key) || '$';
    html +=
      '<div class="glass-card" style="margin-bottom:1rem;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<div>' +
          '<h4 style="margin:0;">' + esc(t.label) + '</h4>' +
          '<small style="color:var(--text-muted);">' + esc(t.desc) + '</small>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          '<input type="text" id="bg_prefix_' + t.key + '" value="' + esc(prefix) + '" style="width:60px; font-size:0.8rem;" placeholder="Prefix" onchange="saveBackgroundPrefix(\'' + t.key + '\', this.value)">' +
          '<div class="toggle-switch ' + (enabled ? 'active' : '') + '" id="bg_toggle_' + t.key + '" onclick="toggleBackgroundTask(\'' + t.key + '\')"></div>' +
          '<span style="font-size:0.8rem;" id="bg_status_' + t.key + '">' + (enabled ? 'ON' : 'OFF') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  return html;
}

function injectPluginSettingsTabs(tabs, sections) {
  const tabsContainer = document.querySelector('.settings-tabs');
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'module-tab';
    btn.id = 'stab-' + tab.key;
    btn.textContent = tab.title;
    btn.onclick = () => switchPluginSettingsTab(tab);
    tabsContainer.appendChild(btn);
  });
  window._pluginSections = sections;
}

function switchPluginSettingsTab(tab) {
  currentSettingsTab = tab.key;
  document.querySelectorAll('.settings-tabs .module-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('stab-' + tab.key).classList.add('active');
  document.getElementById('settings-tab-content').innerHTML = tab.html;
}

function buildPrivacyContent() {
  return `
    <div class="glass-card" style="padding:20px;">
      <h2 style="margin-top:0; display:flex; align-items:center; gap:10px;">${arkIcon('book', 20)} Arklum Documentation</h2>
      <p style="color:var(--text-muted); margin-bottom:16px;">Access the full platform API reference, plugin development guides, and dashboard tutorials. The docs are hosted locally and encrypted at rest.</p>
      <a href="http://localhost:8001/" target="_blank" class="primary-btn" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; padding:10px 20px; border-radius:8px;">
        Open Documentation Portal ${arkIcon('external', 14)}
      </a>
    </div>
    <div class="glass-card" style="padding:20px; margin-top:16px;">
      <h3>Privacy & Data Policy</h3>
      <ul style="line-height:1.8; color:var(--text); padding-left:20px;">
        <li><strong>Self-Hosted:</strong> Arklum runs entirely on your hardware. No telemetry, no analytics, and no data ever leaves your device except to Discord's official API.</li>
        <li><strong>Token Storage:</strong> Bot tokens are encrypted at rest in <code class="inline">.arklum_sys/tokens.enc</code>. The decryption key is generated locally and never transmitted.</li>
        <li><strong>Preferences:</strong> Dashboard settings are saved locally in your browser and synced to <code class="inline">.arklum_sys/dashboard_prefs.json</code> for per-bot persistence.</li>
        <li><strong>Plugins:</strong> Plugins run in-process with full Node.js access. Only install plugins from trusted sources. The core platform enforces crash-guards and scope limits, but cannot sandbox malicious code.</li>
        <li><strong>Network:</strong> The REST API and Docs site on <code class="inline">:8001</code> are bound to <code class="inline">127.0.0.1</code> (localhost only) and require an auto-generated API key for write operations.</li>
      </ul>
    </div>
    <div class="glass-card" style="padding:20px; margin-top:16px;">
      <h3>Open Source & Licenses</h3>
      <p style="color:var(--text-muted);">Arklum is built on top of <code class="inline">discord.js</code>, <code class="inline">socket.io</code>, and <code class="inline">adm-zip</code>. All dependencies are licensed under MIT or ISC.</p>
    </div>
  `;
}

function buildSettingsContent() {
  return `
    <div class="settings-tabs-scroll" style="overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; margin-bottom: 16px;">
      <div class="settings-tabs" style="display: inline-flex; gap: 0;">
        <button class="module-tab active" onclick="switchSettingsTab('appearance')" id="stab-appearance">Appearance</button>
        <button class="module-tab" onclick="switchSettingsTab('sidebar')" id="stab-sidebar">Sidebar</button>
        <button class="module-tab" onclick="switchSettingsTab('behaviour')" id="stab-behaviour">Behaviour</button>
        <button class="module-tab" onclick="switchSettingsTab('bot')" id="stab-bot">Bot</button>
        <button class="module-tab" onclick="switchSettingsTab('data')" id="stab-data">Data</button>
        <button class="module-tab" onclick="switchSettingsTab('logs')" id="stab-logs">Logs</button>
        <button class="module-tab" onclick="switchSettingsTab('background')" id="stab-background">Background Tasks</button>
        <button class="module-tab" onclick="switchSettingsTab('updates')" id="stab-updates">App Updates</button>
        <button class="module-tab" onclick="switchSettingsTab('privacy')" id="stab-privacy">Privacy & Policy</button>
      </div>
    </div>
    <style id="settings-wall-styles">
  #settings-walls{position:relative;background:rgba(0,0,0,0.2);border:1px solid var(--glass-border,rgba(255,255,255,.1));border-radius:var(--radius,12px);padding:14px;margin-top:4px;backdrop-filter:blur(var(--blur,12px)) saturate(180%);-webkit-backdrop-filter:blur(var(--blur,12px)) saturate(180%)}
  .wall-corner{position:absolute;width:26px;height:26px;pointer-events:none;opacity:.9;z-index:2}
  .wall-tl{top:-1px;left:-1px;border-top:2px solid var(--primary,#454af8);border-left:2px solid var(--primary,#454af8);border-top-left-radius:var(--radius,12px)}
  .wall-br{bottom:-1px;right:-1px;border-bottom:2px solid var(--primary,#454af8);border-right:2px solid var(--primary,#454af8);border-bottom-right-radius:var(--radius,12px)}
  </style>
  <div id="settings-walls"><div class="wall-corner wall-tl"></div><div class="wall-corner wall-br"></div><div id="settings-tab-content"></div></div>`;
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  document.querySelectorAll('.settings-tabs .module-tab').forEach(b => b.classList.remove('active'));
  const activeTabBtn = document.getElementById('stab-' + tab);
  if (activeTabBtn) activeTabBtn.classList.add('active');

  let html = '';
  if (tab === 'appearance') {
    html = `
      <div class="glass-card">
        <h3>Theme</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div class="theme-card" onclick="setTheme('dark')" id="theme-dark-card">Default</div>
          <div class="theme-card" onclick="setTheme('oled')" id="theme-oled-card">oled</div>
          <div class="theme-card" onclick="setTheme('light')" id="theme-light-card">light</div>
        </div>
      </div>
      <div class="glass-card">
        <h3>Font</h3>
        <select id="font-selector" onchange="setFont(this.value)">
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Poppins">Poppins</option>
          <option value="Nunito">Nunito</option>
          <option value="Montserrat">Montserrat</option>
        </select>
      </div>
      <div class="glass-card">
        <h3>UI Density</h3>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>Compact</span>
          <div class="toggle-switch" id="toggle-density" onclick="toggleDensity()"></div>
        </div>
      </div>
      <div class="glass-card">
        <h3>Custom Theme</h3>
        <select id="theme-selector" onchange="changeTheme(this.value)">
          <option value="">Default</option>
        </select>
        <small style="color:var(--text-muted); display:block; margin-top:8px;">Page will reload after choosing a theme.</small>
      </div>
    `;
    document.getElementById('settings-tab-content').innerHTML = html;
    applyDensityState();
    highlightThemeSelection(localStorage.getItem('arklum_theme') || 'dark');
    const fontSelector = document.getElementById('font-selector');
    if (fontSelector) fontSelector.value = localStorage.getItem('arklum_font') || 'Inter';
    populateThemeSelector(window._globalThemePath || (window._dashboardPrefs && window._dashboardPrefs.theme_path) || '');
    return; 
  } else if (tab === 'sidebar') {
    html = `
      <div class="glass-card">
        <h3>Logo</h3>
        <div style="display:flex; align-items:center; gap:12px;">
          <input type="file" id="sidebar-logo-input" accept="image/*" onchange="uploadSidebarLogo(this)" style="max-width:220px;">
          <button class="secondary-btn" onclick="resetSidebarLogo()">Reset</button>
        </div>
        <div id="sidebar-logo-preview" style="margin-top:8px; max-width:120px; max-height:60px;"></div>
      </div>
      <div class="glass-card">
        <h3>Features</h3>
        <div id="feature-toggles">
          ${buildFeatureToggle('management','Management')}
          ${buildFeatureToggle('devportal','Developer Portal')}
          ${buildFeatureToggle('status','Status')}
          ${buildFeatureToggle('utility','Utility')}
          ${buildFeatureToggle('plugins','Plugins')}
        </div>
      </div>
    `;
  } else if (tab === 'behaviour') {
    const refreshInterval = localStorage.getItem('arklum_refresh_interval') || 3;
    const confirmations = localStorage.getItem('arklum_confirmations') !== 'false';
    html = `
      <div class="glass-card">
        <h3>Auto‑refresh Home Stats</h3>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="number" id="refresh-interval" value="${refreshInterval}" min="1" max="30" style="width:80px;">
          <span>seconds</span>
          <button class="secondary-btn" onclick="saveRefreshInterval()">Save</button>
        </div>
      </div>
      <div class="glass-card">
        <h3>Confirmation Dialogs</h3>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>Show confirmation before kick/ban/delete</span>
          <div class="toggle-switch" id="toggle-confirmations" onclick="toggleConfirmations()" ${confirmations ? 'class="toggle-switch active"' : 'class="toggle-switch"'}> </div>
        </div>
      </div>
    `;
  } else if (tab === 'bot') {
    html = `<div class="glass-card">
      <h3>Bot Tokens</h3>
      <div id="settings-token-list"></div>
      <div style="margin-top:8px;">
        <input type="password" id="new-token" placeholder="Paste new bot token" autocomplete="off" style="margin-bottom:4px;">
        <button class="primary-btn" onclick="addTokenFromSettings()">Add Token</button>
      </div>
    </div>`;
  } else if (tab === 'data') {
    html = `
      <div class="glass-card">
        <h3>Cache & Storage</h3>
        <button class="secondary-btn" onclick="clearRuntimeCache()">Clear Runtime Cache</button>
        <button class="danger-btn" onclick="resetSystem()" style="margin-left:8px;">Reset System</button>
      </div>
    `;
  } else if (tab === 'logs') {
    html = `
      <div class="glass-card" style="padding: 0; overflow: hidden;">
        <div id="live-log-container" style="background: #0a0a0a; color: #d4d4d4; font-family: monospace; font-size: 0.8rem; padding: 12px; height: 60vh; overflow-y: auto; white-space: pre-wrap; border-radius: var(--radius);">
          Loading recent logs…
        </div>
      </div>
    `;
    document.getElementById('settings-tab-content').innerHTML = html;
    initLiveLogs();
  } else if (tab === 'background') {
    html = buildBackgroundTasksContent();
    document.getElementById('settings-tab-content').innerHTML = html;
    syncMemeConfig();
  } else if (tab === 'updates') {
  html = '<div id="appinfo-content" style="padding:10px;">' + PLUGIN_LOADER_HTML + '</div>';
  document.getElementById('settings-tab-content').innerHTML = html;
  socket.emit('run_command', { cmd: 'fetch_arkv_markup', params: {} });
  return;
  } else if (tab === 'privacy') {
  html = buildPrivacyContent();
  }

  document.getElementById('settings-tab-content').innerHTML = html;
  applyDensityState();
  if (tab === 'sidebar') {
    loadFeatureToggles();
    const logo = localStorage.getItem('arklum_sidebar_logo_url');
    if (logo) {
      const preview = document.getElementById('sidebar-logo-preview');
      if (preview) preview.innerHTML = `<img src="${logo}" style="max-width:120px; max-height:60px;">`;
    }
  } else if (tab === 'bot') {
    renderTokenListInSettings();
  } else if (tab === 'behaviour') {
    const confToggle = document.getElementById('toggle-confirmations');
    if (confToggle) {
      confToggle.classList.toggle('active', localStorage.getItem('arklum_confirmations') !== 'false');
    }
  }
  if (window._pluginSections) {
    window._pluginSections.filter(s => s.tab === tab).forEach(s => {
      document.getElementById('settings-tab-content').innerHTML += '<div class="glass-card"><h3>'+esc(s.title)+'</h3>'+s.html+'</div>';
    });
  }
}

socket.on('arkv_content', function(data) {
  const container = document.getElementById('appinfo-content');
  if (!container) return;
  container.innerHTML = renderArklumMarkup(data.content || '');
  initArkEffects();
});

function arkEscape(s) {
  return window.esc ? window.esc(s) : String(s);
}
function arkSlug(s) {
  return String(s).toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}
function arkAttr(line, name) {
  const m = line.match(new RegExp(name + '\\s*=\\s*"([^"]*)"'));
  return m ? m[1] : '';
}
function arkInline(raw) {
  let t = arkEscape(raw);
  t = t.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  t = t.replace(/\[badge(?:\s+color=([\w#-]+))?\]([^[]*)\[\/badge\]/gi, function (m, c, b) {
    return '<span class="ark-badge" style="--bc:' + (c || 'var(--primary)') + '">' + b + '</span>';
  });
  t = t.replace(/\[chip\]([^[]*)\[\/chip\]/gi, '<span class="ark-chip">$1</span>');
  t = t.replace(/\[typewriter\]([^[]*)\[\/typewriter\]/gi, '<span class="ark-typewriter" data-text="$1"></span>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--primary);">$1</a>');
  t = t.replace(/(^|[^"'=\w])(https?:\/\/\S+)/g, '$1<a href="$2" target="_blank" rel="noopener" style="color:var(--primary);">$2</a>');
  return t;
}
function ensureArkStyles() {
  if (document.getElementById('ark-markup-styles')) return;
  const st = document.createElement('style');
  st.id = 'ark-markup-styles';
  st.textContent =
    '.ark-hero{position:relative;border:1px solid var(--glass-border);border-radius:var(--radius);padding:22px;margin:6px 0 14px;background:linear-gradient(135deg,rgba(69,74,248,.16),rgba(0,212,170,.08));overflow:hidden}' +
    '.ark-hero h1{margin:0;font-size:1.5rem}' +
    '.ark-ver{position:absolute;top:14px;right:14px;font:700 11px monospace;color:#00d4aa;border:1px solid #00d4aa;border-radius:999px;padding:3px 10px;background:rgba(0,212,170,.08)}' +
    '.ark-h{margin:18px 0 8px}' +
    '.ark-badge{font:700 9px monospace;letter-spacing:.5px;color:var(--bc,var(--primary));border:1px solid var(--bc,var(--primary));border-radius:999px;padding:2px 8px;background:rgba(255,255,255,.04)}' +
    '.ark-chip{font-size:.75rem;border:1px solid var(--glass-border);border-radius:8px;padding:2px 8px;background:rgba(255,255,255,.05)}' +
    '.ark-note{border-left:4px solid var(--nc,var(--primary));background:rgba(255,255,255,.04);border-radius:0 10px 10px 0;padding:10px 14px;margin:10px 0}' +
    '.ark-cols{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:10px 0}' +
    '.ark-toc-box{border:1px solid var(--glass-border);border-radius:var(--radius);padding:12px 14px;margin:10px 0;background:rgba(255,255,255,.03)}' +
    '.ark-toc-title{font:700 10px monospace;letter-spacing:1px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px}' +
    '.ark-toc-box a{display:block;color:var(--text);font-size:.85rem;padding:3px 0;cursor:pointer}' +
    '.ark-toc-box a.ark-toc-l2{padding-left:12px;color:var(--text-muted)}' +
    '.ark-toc-box a.ark-toc-l3{padding-left:24px;color:var(--text-muted)}' +
    '.ark-btn{display:inline-block;margin:6px 8px 6px 0;padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--primary),#00d4aa);color:#fff;font-weight:700;font-size:.85rem;text-decoration:none}' +
    '.ark-btn.secondary{background:rgba(255,255,255,.08);border:1px solid var(--glass-border);color:var(--text)}' +
    '.ark-tilt{transition:transform .1s linear}' +
    '.ark-typewriter::after{content:"▍";animation:arkBlink 1s infinite}' +
    '@keyframes arkBlink{50%{opacity:0}}' +
    '.ark-live-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-top:8px}' +
    '.ark-ls{border:1px solid var(--glass-border);border-radius:10px;padding:10px;text-align:center;background:rgba(255,255,255,.04)}' +
    '.ark-ls b{display:block;font-size:1.05rem}.ark-ls span{font-size:.65rem;color:var(--text-muted)}' +
    '.ark-cap{font-size:.75rem;color:var(--text-muted);margin-top:6px;display:block}';
  document.head.appendChild(st);
}
function initArkEffects(root) {
  ensureArkStyles();
  root = root || document;
  root.querySelectorAll('.ark-typewriter').forEach(function (el) {
    if (el._arkDone) return;
    el._arkDone = true;
    const text = el.dataset.text || '';
    let idx = 0;
    el.textContent = '';
    const iv = setInterval(function () {
      el.textContent += text[idx] || '';
      idx++;
      if (idx >= text.length) clearInterval(iv);
    }, 40);
  });
  root.querySelectorAll('.ark-tilt').forEach(function (el) {
    if (el._arkTilt) return;
    el._arkTilt = true;
    el.addEventListener('mousemove', function (e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'perspective(700px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  });
  root.querySelectorAll('[data-ark-scroll]').forEach(function (a) {
    a.addEventListener('click', function () {
      const el = document.getElementById(a.getAttribute('data-ark-scroll'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  if (root.querySelector('.ark-confetti-trigger') && !window._arkConfettiDone) {
    window._arkConfettiDone = true;
    for (let i = 0; i < 60; i++) {
      setTimeout(function () {
        const c = document.createElement('div');
        c.style.cssText = 'position:fixed;top:-20px;left:' + Math.random() * 100 + '%;width:10px;height:10px;background:' + ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'][Math.floor(Math.random() * 6)] + ';border-radius:2px;z-index:9999;animation:confetti-fall 2s linear forwards;';
        document.body.appendChild(c);
        setTimeout(function () { c.remove(); }, 2000);
      }, i * 25);
    }
  }
  const live = root.querySelectorAll('[data-ark="live-stats"]');
  if (live.length) {
    socket.once('system_stats', function (info) {
      live.forEach(function (el) {
        el.innerHTML = '<div class="ark-live-grid">' +
          '<div class="ark-ls"><b>' + (info.ping || 0) + 'ms</b><span>PING</span></div>' +
          '<div class="ark-ls"><b>' + (info.cpu_percent || 0) + '%</b><span>CPU</span></div>' +
          '<div class="ark-ls"><b>' + (info.memory_percent || 0) + '%</b><span>RAM</span></div>' +
          '<div class="ark-ls"><b>' + (info.uptime || 0) + 's</b><span>UPTIME</span></div>' +
          '<div class="ark-ls"><b>' + (info.guilds || 0) + '</b><span>SERVERS</span></div>' +
          '</div>';
      });
    });
    socket.emit('run_command', { cmd: 'get_system_stats', params: {} });
  }
}
function renderArkMarkup(src) {
  ensureArkStyles();
  if (!src) return '';
  const lines = src.split('\n');
  const out = [];
  const toc = [];
  let i = 0;
  let heroDone = false;
  function peek() { return i < lines.length ? lines[i] : ''; }
  function next() { return i < lines.length ? lines[i++] : ''; }
  function collectUntil(close) {
    const buf = [];
    while (i < lines.length && lines[i].trim().toLowerCase() !== close) buf.push(next());
    i++;
    return buf.join('\n');
  }
  while (i < lines.length) {
    const t = peek().trim();
    if (!t) { next(); continue; }
    let m;
    if (t[0] === '[') {
      const tag = ((t.match(/^\[([\w-]+)/) || [])[1] || '').toLowerCase();
      if (tag === 'card') {
        next();
        const title = arkAttr(t, 'title');
        const icon = arkAttr(t, 'icon');
        const inner = renderArkMarkup(collectUntil('[/card]'));
        out.push('<div class="glass-card ark-card">' + (title || icon ? '<h3>' + (icon ? icon + ' ' : '') + arkInline(title) + '</h3>' : '') + inner + '</div>');
        continue;
      }
      if (tag === 'note') {
        next();
        const type = (arkAttr(t, 'type') || 'info').toLowerCase();
        const colors = { info: 'var(--primary)', success: '#00d4aa', warn: '#fbd44c', danger: '#f23f43' };
        const inner = renderArkMarkup(collectUntil('[/note]'));
        out.push('<div class="ark-note" style="--nc:' + (colors[type] || colors.info) + '">' + inner + '</div>');
        continue;
      }
      if (tag === 'cols') {
        next();
        const raw = collectUntil('[/cols]');
        const cells = raw.split(/\[col\]/i).filter(function (c) { return c.trim(); });
        out.push('<div class="ark-cols">' + cells.map(function (c) { return '<div>' + renderArkMarkup(c) + '</div>'; }).join('') + '</div>');
        continue;
      }
      if (tag === 'tilt') {
        next();
        const inner = renderArkMarkup(collectUntil('[/tilt]'));
        out.push('<div class="ark-tilt glass-card">' + inner + '</div>');
        continue;
      }
      if (tag === 'code') {
        next();
        const lang = arkAttr(t, 'lang');
        const raw = collectUntil('[/code]');
        const body = (typeof highlightCode === 'function') ? highlightCode(raw, lang) : arkEscape(raw);
        out.push('<pre style="background:#1e1f22;color:#d4d4d4;padding:12px;border-radius:10px;overflow-x:auto;"><code>' + body + '</code></pre>');
        continue;
      }
      if (tag === 'img') {
        next();
        const s = arkAttr(t, 'src');
        const cap = arkAttr(t, 'caption');
        out.push('<div style="margin:10px 0;">' + ((typeof ambientGlowImage === 'function') ? ambientGlowImage(s, 'max-width:100%;border-radius:10px;') : ('<img src="' + arkEscape(s) + '" style="max-width:100%;border-radius:10px;">')) + (cap ? '<span class="ark-cap">' + arkInline(cap) + '</span>' : '') + '</div>');
        continue;
      }
      if (tag === 'btn') {
        next();
        const href = arkAttr(t, 'href');
        const kind = arkAttr(t, 'kind');
        const label = collectUntil('[/btn]');
        out.push('<a class="ark-btn' + (kind === 'secondary' ? ' secondary' : '') + '" href="' + arkEscape(href) + '" target="_blank" rel="noopener">' + arkInline(label) + '</a>');
        continue;
      }
      if (tag === 'hr') { next(); out.push('<hr style="border-color:var(--glass-border);margin:14px 0;">'); continue; }
      if (tag === 'toc') { next(); out.push('<!--ARK_TOC-->'); continue; }
      if (tag === 'confetti') { next(); out.push('<div class="ark-confetti-trigger"></div>'); continue; }
      if (tag === 'live-stats') { next(); out.push('<div class="glass-card" data-ark="live-stats" style="padding:14px;"><span class="ark-cap">LIVE SYSTEM STATS</span></div>'); continue; }
      next();
      out.push('<p>' + arkInline(t) + '</p>');
      continue;
    }
    if ((m = t.match(/^(#{1,3})\s+(.*)/)) !== null) {
      next();
      const lvl = m[1].length;
      const text = m[2];
      const id = arkSlug(text);
      toc.push({ lvl: lvl, text: text, id: id });
      if (lvl === 1 && !heroDone) {
        heroDone = true;
        const ver = (text.match(/v?\d+(?:\.\d+)*/) || [])[0] || '';
        out.push('<div class="ark-hero"><h1>' + arkInline(text) + '</h1>' + (ver ? '<span class="ark-ver">' + ver + '</span>' : '') + '</div>');
      } else {
        out.push('<h' + (lvl + 1) + ' id="' + id + '" class="ark-h">' + arkInline(text) + '</h' + (lvl + 1) + '>');
      }
      continue;
    }
    if (/^```/.test(t)) {
      next();
      const lang = t.replace(/```/, '').trim();
      const buf = [];
      while (i < lines.length && !/^```/.test(peek().trim())) buf.push(next());
      i++;
      const raw = buf.join('\n');
      const body = (typeof highlightCode === 'function') ? highlightCode(raw, lang) : arkEscape(raw);
      out.push('<pre style="background:#1e1f22;color:#d4d4d4;padding:12px;border-radius:10px;overflow-x:auto;"><code>' + body + '</code></pre>');
      continue;
    }
    if (/^([-*]|\d+\.)\s+/.test(t)) {
      const ordered = /^\d+\.\s+/.test(t);
      const items = [];
      while (i < lines.length && /^([-*]|\d+\.)\s+/.test(peek().trim())) items.push(next().trim().replace(/^([-*]|\d+\.)\s+/, ''));
      out.push((ordered ? '<ol>' : '<ul>') + items.map(function (x) { return '<li>' + arkInline(x) + '</li>'; }).join('') + (ordered ? '</ol>' : '</ul>'));
      continue;
    }
    if (/^>\s?/.test(t)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(peek().trim())) buf.push(next().trim().replace(/^>\s?/, ''));
      out.push('<blockquote class="ark-note" style="--nc:var(--primary)">' + buf.map(arkInline).join('<br>') + '</blockquote>');
      continue;
    }
    const para = [next().trim()];
    while (i < lines.length) {
      const p = peek().trim();
      if (!p || p[0] === '#' || p[0] === '[' || /^```/.test(p) || /^([-*]|\d+\.)\s+/.test(p) || /^>/.test(p)) break;
      para.push(next().trim());
    }
    out.push('<p>' + para.map(arkInline).join(' ') + '</p>');
  }
  let html = out.join('\n');
  if (toc.length) {
    const tocHtml = '<div class="ark-toc-box"><div class="ark-toc-title">On this page</div>' + toc.map(function (h) { return '<a class="ark-toc-l' + h.lvl + '" data-ark-scroll="' + h.id + '">' + arkEscape(h.text) + '</a>'; }).join('') + '</div>';
    html = html.replace('<!--ARK_TOC-->', tocHtml);
  }
  return html;
}
function renderArklumMarkup(text) {
  return renderArkMarkup(text);
}

function openPreviewModal(id) {
  const container = document.getElementById(id);
  if (!container) return;
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.background = 'rgba(0,0,0,0.6)';
  container.style.zIndex = '10050';
  const pages = container.querySelectorAll('.preview-page');
  pages.forEach(p => p.classList.remove('active'));
  if (pages.length) pages[0].classList.add('active');
  container.addEventListener('click', function(e) { if (e.target === container) container.style.display = 'none'; });
}

function switchPreviewPage(id, index) {
  const container = document.getElementById(id);
  if (!container) return;
  const pages = container.querySelectorAll('.preview-page');
  pages.forEach(p => p.classList.remove('active'));
  if (pages[index]) pages[index].classList.add('active');
  const dots = container.querySelectorAll('.preview-dot');
  dots.forEach(d => d.classList.remove('active'));
  if (dots[index]) dots[index].classList.add('active');
}

(function() {
  const pattern = 'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight KeyB KeyA';
  let current = [];
  document.addEventListener('keydown', function(e) {
    current.push(e.code);
    if (current.length > pattern.split(' ').length) current.shift();
    if (current.join(' ') === pattern) {
      for (let i=0; i<80; i++) {
        setTimeout(() => {
          const conf = document.createElement('div');
          conf.style.cssText = 'position:fixed;top:-20px;left:'+Math.random()*100+'%;width:12px;height:12px;background:'+['#f00','#0f0','#00f','#ff0','#f0f','#0ff'][Math.floor(Math.random()*6)]+';border-radius:2px;z-index:9999;animation:confetti-fall 3s linear forwards;';
          document.body.appendChild(conf);
          setTimeout(() => conf.remove(), 3000);
        }, i*20);
      }
      pushNotification('You found the Konami code!', 'Arklum secret unlocked.', 'success', 5000);
    }
  });
})();

socket.on('token_list', function(data) {
  const loginContainer = document.getElementById('saved-tokens');
  if (loginContainer) {
    loginContainer.innerHTML = '';
    if (data.tokens && data.tokens.length > 0) {
      data.tokens.forEach(function(tok) {
      const active = (tok.index === data.active_index);
      const div = document.createElement('div');
      div.className = 'saved-token-item' + (active ? ' active' : '');
      div.dataset.tokenIndex = tok.index;
      const name = tok.name || ('Token ' + (tok.index + 1));
      const initial = name.charAt(0).toUpperCase();
      const av = tok.avatar
        ? '<span class="sti-av"><img src="' + esc(tok.avatar) + '" onerror="this.parentElement.textContent=\'' + initial + '\'"></span>'
        : '<span class="sti-av">' + initial + '</span>';
      div.innerHTML = av +
        '<span class="sti-info"><b>' + esc(name) + '</b><small>token ' + (tok.index + 1) + (active ? ' · active' : ' · saved') + '</small></span>' +
        (active ? '<span class="sti-dot"></span>' : '') +
        '<span class="sti-chev">›</span>';
      loginContainer.appendChild(div);
      });
    } else { loginContainer.innerHTML = '<div style="color:var(--text-muted);">No tokens saved.</div>'; }
  }

  const settingsContainer = document.getElementById('settings-token-list');
  if (settingsContainer) {
    let html = '';
    if (data.tokens && data.tokens.length > 0) {
      data.tokens.forEach(function(tok, idx) {
        const active = (tok.index === data.active_index) ? ' (active)' : '';
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:var(--glass-bg-light); border-radius:8px; margin-bottom:4px;">
          <span>${esc(tok.name || 'Token '+(idx+1))} ${active}</span>
          <div style="display:flex; gap:4px;">
            <button class="secondary-btn" onclick="loginWithToken(${tok.index})">Switch</button>
            <button class="danger-btn" onclick="removeToken(${tok.index})">Remove</button>
          </div>
        </div>`;
      });
    } else {
      html = '<div style="color:var(--text-muted);">No tokens saved.</div>';
    }
    settingsContainer.innerHTML = html;
  }
});

socket.emit('run_command', { cmd: 'token_list', params: {} });

document.addEventListener('DOMContentLoaded', function() {
  loadTheme();
  loadFeatureToggles();
  loadStoredFont();
  loadSidebarLogo();
  applyDensityState();
  applyStoredBorderRadius();
  applyStoredShadowIntensity();
  applyStoredAnimationSpeed();
  applyStoredAnimationEasing();
});
(function loadGlobalTheme() {
  fetch('/global-theme')
    .then(r => r.json())
    .then(data => {
      const path = data.theme_path;
      if (path && path !== 'themes/default.json') {
        window._globalThemePath = path;
        document.body.classList.remove('theme-dark', 'theme-oled', 'theme-light');
        document.body.classList.add('custom-theme');
        applyCustomTheme(path);
      } else {
        window._globalThemePath = null;
      }
      window._globalThemeLoaded = true;
      if (window._globalThemePath) {
        window._dashboardPrefs = window._dashboardPrefs || {};
        window._dashboardPrefs.theme_path = window._globalThemePath;
        localStorage.setItem('arklum_theme_path', window._globalThemePath);
        socket.emit('run_command', { cmd: 'dashboard_save_pref', params: { key: 'theme_path', value: window._globalThemePath } });
      }
      populateThemeSelector(window._globalThemePath);
    });
})();

document.addEventListener('click', function (e) {
  const chip = e.target.closest('.saved-token-item');
  if (chip) openTokenModal(parseInt(chip.dataset.tokenIndex, 10), chip);
});
document.addEventListener('DOMContentLoaded', function () {
  const leaf = Array.from(document.querySelectorAll('body *')).find(n =>
    !n.children.length && /Known issue/i.test(n.textContent || ''));
  if (leaf) {
    const box = leaf.closest('div');
    if (box) box.remove();
  }
});
const TokenModal = { idx: null, fallbackName: '', verifying: false };
(function buildTokenModal() {
  const css = document.createElement('style');
  css.textContent = `
  #tm-backdrop{position:fixed;inset:0;background:rgba(5,6,10,.7);z-index:10090;display:none}
  #tm-backdrop.show{display:block}
  .tm-card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.96);width:min(400px,92vw);max-height:86vh;overflow-y:auto;background:rgba(18,20,31,.92);border:1px solid rgba(255,255,255,.12);border-radius:20px;z-index:10091;opacity:0;pointer-events:none;transition:.22s cubic-bezier(.4,0,.2,1);backdrop-filter:blur(20px)}
  .tm-card.show{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
  .tm-banner{height:96px;border-radius:20px 20px 0 0;background:linear-gradient(135deg,#1a1c72,#3438cc 55%,#454af8);background-size:cover;background-position:center;position:relative;overflow:hidden}
  .tm-art{position:absolute;right:-26px;top:-46px;width:190px;height:190px;opacity:.18;transform:rotate(10deg)}
  .tm-x{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(11,13,20,.5);color:#fff;cursor:pointer;z-index:3}
  .tm-head{display:flex;gap:12px;align-items:flex-end;padding:0 18px;margin-top:-26px;position:relative;z-index:2}
  .tm-avatar{width:64px;height:64px;border-radius:50%;border:4px solid #12141f;background:linear-gradient(135deg,#8a92ff,#454af8);display:grid;place-items:center;font:600 24px 'Fredoka',system-ui,sans-serif;color:#fff;overflow:hidden;flex-shrink:0}
  .tm-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
  .tm-id{flex:1;min-width:0;padding-bottom:2px}
  .tm-id h3{margin:0;font-size:17px}
  .tm-id small{color:var(--text-muted,#8b90a8);font-family:monospace}
  .tm-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;margin-bottom:6px}
  .tm-pill.active{background:rgba(0,212,170,.15);color:#00d4aa;border:1px solid rgba(0,212,170,.4)}
  .tm-pill.idle{background:rgba(255,255,255,.08);color:#aaa;border:1px solid rgba(255,255,255,.15)}
  .tm-pill.bad{background:rgba(255,94,87,.12);color:#ff5e57;border:1px solid rgba(255,94,87,.4)}
  .tm-bio{padding:10px 18px 0;margin:0;font-size:12.5px;color:var(--text-muted,#8b90a8);white-space:pre-wrap}
  .tm-stats{display:flex;gap:10px;padding:14px 18px 4px}
  .tm-stat{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;text-align:center}
  .tm-stat b{display:block;font-size:16px}
  .tm-stat span{font-size:10px;color:var(--text-muted,#8b90a8)}
  .tm-guilds{display:none;flex-wrap:wrap;gap:6px;margin:10px 18px 0;padding:8px;max-height:120px;overflow-y:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px}
  .tm-guilds.show{display:flex}
  .tm-guild{display:flex;align-items:center;gap:6px;font-size:11px;background:rgba(255,255,255,.06);border-radius:999px;padding:4px 10px}
  .tm-guild img{width:16px;height:16px;border-radius:50%}
  .tm-actions{display:flex;gap:8px;padding:16px 18px 6px}
  .tm-btn{flex:1;border-radius:12px;padding:10px 8px;font-weight:700;font-size:12.5px;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:var(--text,#fff)}
  .tm-btn:disabled{opacity:.5;cursor:default}
  .tm-btn.primary{border:none;background:linear-gradient(135deg,#8a92ff,#454af8);color:#fff;box-shadow:0 0 18px rgba(69,74,248,.35)}
  .tm-btn.danger{background:rgba(255,94,87,.1);border-color:rgba(255,94,87,.4);color:#ff5e57}
  .tm-warn{display:block;padding:6px 18px 14px;color:#f97316;font-size:11px}`;
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.innerHTML = `
  <div id="tm-backdrop"></div>
  <div class="tm-card" id="tm-card">
    <div class="tm-banner" id="tm-banner">
      <svg class="tm-art" id="tm-art" viewBox="0 0 240 240">
        <polygon points="120,14 66,70 58,158 98,120" fill="#8a92ff"/>
        <polygon points="58,158 66,210 100,210 92,160 98,120" fill="#5a5ff5"/>
        <polygon points="120,14 152,58 176,150 128,104" fill="#454af8"/>
        <polygon points="176,150 172,210 140,210 146,158 128,104" fill="#3438cc"/>
        <polygon points="120,96 106,128 134,128" fill="#00d4aa"/>
      </svg>
      <button class="tm-x" id="tm-close">${arkIcon('close', 14)}</button>
    </div>
    <div class="tm-head">
      <div class="tm-avatar" id="tm-avatar">T</div>
      <div class="tm-id"><h3 id="tm-name">…</h3><small id="tm-username"></small></div>
      <span class="tm-pill idle" id="tm-state">checking…</span>
    </div>
    <p class="tm-bio" id="tm-bio"></p>
    <div class="tm-stats">
      <div class="tm-stat"><b id="tm-servers">–</b><span>servers</span></div>
      <div class="tm-stat"><b id="tm-slot">–</b><span>slot</span></div>
      <div class="tm-stat"><b id="tm-valid">–</b><span>token</span></div>
    </div>
    <div class="tm-guilds" id="tm-guilds"></div>
    <div class="tm-actions">
      <button class="tm-btn" id="tm-verify">Re-verify</button>
      <button class="tm-btn danger" id="tm-remove">Remove</button>
      <button class="tm-btn primary" id="tm-login">Login ${arkIcon('send', 14)}</button>
    </div>
    <small class="tm-warn" id="tm-warn" hidden>${arkIcon('warn', 14)} Removing this token deletes all existing configuration for this bot.</small>
  </div>`;
  document.body.appendChild(root);
  document.getElementById('tm-close').onclick = closeTokenModal;
  document.getElementById('tm-backdrop').onclick = closeTokenModal;
  document.getElementById('tm-login').onclick = function () {
    const i = TokenModal.idx;
    closeTokenModal();
    if (typeof loginWithToken === 'function') loginWithToken(i);
    else socket.emit('login', { token_index: i });
  };
  document.getElementById('tm-verify').onclick = function () {
    if (TokenModal.idx === null) return;
    TokenModal.verifying = true;
    this.disabled = true;
    this.textContent = 'Checking…';
    const st = document.getElementById('tm-state');
    st.className = 'tm-pill idle';
    st.textContent = 'checking…';
    socket.emit('token_details_request', { index: TokenModal.idx });
  };
  document.getElementById('tm-remove').onclick = function () {
    const w = document.getElementById('tm-warn');
    if (w.hidden) {
      w.hidden = false;
      return;
    }
    const i = TokenModal.idx;
    closeTokenModal();
    socket.emit('remove_token_request', { index: i });
  };
})();
function openTokenModal(index, chip) {
  if (isNaN(index)) return;
  TokenModal.idx = index;
  TokenModal.fallbackName = chip
    ? (chip.textContent || '').replace('(active)', '').trim() || ('Token ' + (index + 1))
    : ('Token ' + (index + 1));
  document.getElementById('tm-warn').hidden = true;
  document.getElementById('tm-slot').textContent = '#' + (index + 1);
  document.getElementById('tm-state').className = 'tm-pill idle';
  document.getElementById('tm-state').textContent = 'checking…';
  document.getElementById('tm-name').textContent = TokenModal.fallbackName;
  document.getElementById('tm-username').textContent = '';
  document.getElementById('tm-avatar').textContent = TokenModal.fallbackName.charAt(0).toUpperCase();
  document.getElementById('tm-bio').style.display = 'none';
  document.getElementById('tm-servers').textContent = '–';
  document.getElementById('tm-valid').textContent = '–';
  const g = document.getElementById('tm-guilds');
  g.classList.remove('show');
  g.innerHTML = '';
  const banner = document.getElementById('tm-banner');
  banner.style.backgroundImage = '';
  document.getElementById('tm-art').style.display = '';
  document.getElementById('tm-backdrop').classList.add('show');
  document.getElementById('tm-card').classList.add('show');
  socket.emit('token_details_request', { index });
}
function closeTokenModal() {
  document.getElementById('tm-backdrop').classList.remove('show');
  document.getElementById('tm-card').classList.remove('show');
}
socket.on('token_details', function (d) {
  if (d.index !== TokenModal.idx) return;
  const vb = document.getElementById('tm-verify');
  if (vb.disabled) {
    vb.disabled = false;
    vb.textContent = 'Re-verify';
  }
  const state = document.getElementById('tm-state');
  if (d.invalid) {
    state.className = 'tm-pill bad';
    state.textContent = 'invalid token';
  } else if (d.active) {
    state.className = 'tm-pill active';
    state.textContent = 'active';
  } else {
    state.className = 'tm-pill idle';
    state.textContent = 'saved';
  }
  if (TokenModal.verifying) {
    TokenModal.verifying = false;
    if (typeof pushNotification === 'function') {
      pushNotification(d.invalid ? 'Token is invalid' : 'Token valid — ' + (d.name || d.saved_name), '', d.invalid ? 'error' : 'success', 2500);
    }
  }
  const name = d.name || d.saved_name || TokenModal.fallbackName;
  document.getElementById('tm-name').textContent = name;
  document.getElementById('tm-username').textContent = d.id || '';
  const av = document.getElementById('tm-avatar');
  const initial = name.charAt(0).toUpperCase();
  av.textContent = initial;
  const src = d.avatar_url || d.saved_avatar;
  if (src) {
    const img = new Image();
    img.onload = function () {
      av.textContent = '';
      av.appendChild(img);
    };
    img.onerror = function () { av.textContent = initial; };
    img.src = src;
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
  }
  const bio = document.getElementById('tm-bio');
  bio.textContent = d.bio || '';
  bio.style.display = d.bio ? '' : 'none';
  document.getElementById('tm-servers').textContent = d.servers != null ? d.servers : '—';
  document.getElementById('tm-valid').innerHTML = d.invalid ? arkIcon('close', 12) : arkIcon('check', 12);
  const banner = document.getElementById('tm-banner');
  const art = document.getElementById('tm-art');
  if (d.banner_url) {
    banner.style.backgroundImage = 'url(' + d.banner_url + ')';
    art.style.display = 'none';
  } else if (d.accent_color) {
    banner.style.backgroundImage = 'linear-gradient(135deg,#' + d.accent_color.toString(16).padStart(6, '0') + ',#1a1c72)';
    art.style.display = '';
  } else {
    banner.style.backgroundImage = '';
    art.style.display = '';
  }
  const g = document.getElementById('tm-guilds');
  if (d.guilds && d.guilds.length) {
    g.classList.add('show');
    g.innerHTML = d.guilds.map(function (x) {
      return '<span class="tm-guild">' + (x.icon_url ? '<img src="' + esc(x.icon_url) + '">' : '') + esc(x.name) + '</span>';
    }).join('');
  } else {
    g.classList.remove('show');
    g.innerHTML = '';
  }
});