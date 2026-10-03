const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, shell, Menu, MenuItem, screen } = require('electron');

let mainWindow;

const DEFAULT_BOUNDS = { width: 1300, height: 800 };

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function savedBoundsAreVisible(state) {
  if (
    !state ||
    !Number.isFinite(state.x) ||
    !Number.isFinite(state.y) ||
    !Number.isFinite(state.width) ||
    !Number.isFinite(state.height) ||
    state.width < 800 ||
    state.height < 600
  ) {
    return false;
  }
  const area = screen.getDisplayMatching(state).workArea;
  const visibleWidth =
    Math.min(state.x + state.width, area.x + area.width) - Math.max(state.x, area.x);
  const visibleHeight =
    Math.min(state.y + state.height, area.y + area.height) - Math.max(state.y, area.y);
  return visibleWidth >= 50 && visibleHeight >= 50;
}

function readWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
    if (!savedBoundsAreVisible(state)) {
      return null;
    }
    return {
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      maximized: Boolean(state.maximized),
    };
  } catch {
    return null;
  }
}

function writeWindowState(win) {
  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
  try {
    fs.writeFileSync(
      windowStatePath(),
      JSON.stringify({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized: win.isMaximized(),
      })
    );
  } catch {
    // The next launch falls back to the default centered window.
  }
}

function rememberWindowState(win) {
  let timer;
  const saveSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => writeWindowState(win), 300);
  };
  win.on('resize', saveSoon);
  win.on('move', saveSoon);
  win.on('maximize', () => writeWindowState(win));
  win.on('unmaximize', () => writeWindowState(win));
  win.on('close', () => {
    clearTimeout(timer);
    writeWindowState(win);
  });
}

const ALLOWED_HOSTS = [
  'x.com',
  'twitter.com',
  't.co',
  'accounts.google.com',
  'appleid.apple.com',
];

const GRANTED_PERMISSIONS = new Set([
  'notifications',
  'fullscreen',
  'pointerLock',
  'clipboard-sanitized-write',
  'media',
  'mediaKeySystem',
]);

function isPermissionGranted(permission) {
  return GRANTED_PERMISSIONS.has(permission);
}

function chromeUserAgent() {
  const version = process.versions.chrome;
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

function setHeader(headers, name, value) {
  const existing = Object.keys(headers).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );
  headers[existing || name] = value;
}

// Electron's sec-ch-ua only lists Chromium. X's edge then blocks
// UsersByRestIds, so the "Live on X" card never fills in. Send the same
// brand list Chrome does.
function advertiseAsChrome(session) {
  const version = process.versions.chrome;
  const major = version.split('.')[0];
  const userAgent = chromeUserAgent();
  session.setUserAgent(userAgent, 'en-US,en');
  session.webRequest.onBeforeSendHeaders(
    {
      urls: [
        '*://x.com/*',
        '*://*.x.com/*',
        '*://twitter.com/*',
        '*://*.twitter.com/*',
        '*://twimg.com/*',
        '*://*.twimg.com/*',
        '*://pscp.tv/*',
        '*://*.pscp.tv/*',
      ],
    },
    (details, callback) => {
      setHeader(details.requestHeaders, 'User-Agent', userAgent);
      setHeader(
        details.requestHeaders,
        'sec-ch-ua',
        `"Chromium";v="${major}", "Google Chrome";v="${major}", "Not?A_Brand";v="24"`
      );
      setHeader(details.requestHeaders, 'sec-ch-ua-mobile', '?0');
      setHeader(details.requestHeaders, 'sec-ch-ua-platform', '"Linux"');
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

function isAllowedUrl(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return ALLOWED_HOSTS.some(
    (host) => hostname === host || hostname.endsWith('.' + host)
  );
}

function createWindow() {
  const state = readWindowState();
  const win = new BrowserWindow({
    x: state ? state.x : undefined,
    y: state ? state.y : undefined,
    width: state ? state.width : DEFAULT_BOUNDS.width,
    height: state ? state.height : DEFAULT_BOUNDS.height,
    minWidth: 800,
    minHeight: 600,
    title: 'Areos',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:areos',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state && state.maximized) {
    win.maximize();
  }
  rememberWindowState(win);

  win.webContents.setUserAgent(chromeUserAgent());

  const session = win.webContents.session;
  advertiseAsChrome(session);

  session.setSpellCheckerLanguages(['en-US']);

  session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(isPermissionGranted(permission));
  });

  session.setPermissionCheckHandler((_webContents, permission) =>
    isPermissionGranted(permission)
  );

  win.webContents.on('context-menu', (event, params) => {
    if (!params.misspelledWord) {
      return;
    }
    event.preventDefault();
    const menu = new Menu();
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion),
        })
      );
    }
    menu.append(
      new MenuItem({
        label: 'Add to dictionary',
        click: () =>
          win.webContents.session.addWordToSpellCheckerDictionary(
            params.misspelledWord
          ),
      })
    );
    menu.popup();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });


  win.loadURL('https://x.com');
  mainWindow = win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });
}
