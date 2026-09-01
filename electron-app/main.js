const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
const LICENSE_SERVER = 'https://loyalty-theta-flax.vercel.app';
const VALIDATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let mainWindow = null;

// ─── License validation ───────────────────────────────────────────────────────

async function validateLicense(licenseKey) {
  try {
    const res = await fetch(`${LICENSE_SERVER}/api/licencia/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      // Cache successful validation
      store.set('lastValidation', Date.now());
      store.set('restaurantName', data.restaurant_name);
      return { ok: true, name: data.restaurant_name };
    }
    if (res.status === 403) {
      return { ok: false, blocked: true, reason: data.reason };
    }
    return { ok: false, reason: data.reason || 'Clave inválida' };
  } catch {
    // Offline: use cached validation (valid for 7 days)
    const lastValidation = store.get('lastValidation', 0);
    if (Date.now() - lastValidation < VALIDATION_INTERVAL_MS) {
      return { ok: true, offline: true, name: store.get('restaurantName', '') };
    }
    return { ok: false, reason: 'Sin conexión y la validación expiró. Conéctate a internet.' };
  }
}

// ─── Window creation ──────────────────────────────────────────────────────────

function createLicenseWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 560,
    resizable: false,
    title: '3E Plataforma — Activación',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });
  win.loadFile('license-screen.html');
  return win;
}

function createSuspendedWindow(reason) {
  const win = new BrowserWindow({
    width: 480,
    height: 480,
    resizable: false,
    title: '3E Plataforma — Cuenta Suspendida',
    webPreferences: { contextIsolation: true },
    autoHideMenuBar: true,
  });
  win.loadFile('suspended.html');
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      document.getElementById('reason').textContent = ${JSON.stringify(reason)};
    `);
  });
  return win;
}

function createMainWindow(restaurantName) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `3E Plataforma — ${restaurantName}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    autoHideMenuBar: false,
  });

  // Build a minimal menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'Archivo',
      submenu: [
        { label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: () => win.webContents.reload() },
        { type: 'separator' },
        { label: 'Cerrar sesión', click: () => { store.delete('licenseKey'); app.relaunch(); app.exit(); } },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { label: 'Acercar', role: 'zoomIn' },
        { label: 'Alejar', role: 'zoomOut' },
        { label: 'Restablecer zoom', role: 'resetZoom' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Soporte 3E', click: () => shell.openExternal('mailto:enriquenemer@gmail.com') },
        { label: 'Versión', click: () => require('electron').dialog.showMessageBox(win, { message: `3E Plataforma v${app.getVersion()}`, title: 'Versión' }) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  win.loadURL(`${LICENSE_SERVER}/admin`);
  mainWindow = win;
  return win;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const savedKey = store.get('licenseKey');

  if (!savedKey) {
    // First launch: show license entry screen
    createLicenseWindow();
  } else {
    const result = await validateLicense(savedKey);
    if (result.ok) {
      createMainWindow(result.name);
    } else if (result.blocked) {
      createSuspendedWindow(result.reason);
    } else {
      // Key invalid or expired — ask again
      store.delete('licenseKey');
      createLicenseWindow();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) app.emit('ready');
});

// ─── IPC handlers (called from license-screen.html) ──────────────────────────

ipcMain.handle('validate-license', async (_event, licenseKey) => {
  const result = await validateLicense(licenseKey.trim());
  if (result.ok) {
    store.set('licenseKey', licenseKey.trim());
    // Close license window and open main
    BrowserWindow.getAllWindows().forEach(w => w.close());
    createMainWindow(result.name);
  }
  return result;
});
