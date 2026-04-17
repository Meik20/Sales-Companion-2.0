const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

let mainWindow;
const TOKEN_FILE = path.join(app.getPath('userData'), 'auth_token.txt');
const SERVER_FILE = path.join(app.getPath('userData'), 'server_url.txt');
const DEFAULT_SERVER = 'https://sales-companion-production.up.railway.app';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 780, minWidth: 1000, minHeight: 640,
    title: 'Sales Companion',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    backgroundColor: '#f0f2f5', show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Storage ──────────────────────────────────────────────────────
ipcMain.handle('get-token', () => { try { return fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : ''; } catch { return ''; } });
ipcMain.handle('save-token', (_, t) => { fs.writeFileSync(TOKEN_FILE, t, 'utf8'); return true; });
ipcMain.handle('clear-token', () => { try { if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE); } catch {} return true; });
ipcMain.handle('get-server-url', () => { return 'https://sales-companion-production.up.railway.app'; });
ipcMain.handle('save-server-url', (_, u) => { fs.writeFileSync(SERVER_FILE, u, 'utf8'); return true; });
ipcMain.handle('open-external', (_, u) => { shell.openExternal(u); return true; });

// ── HTTP Helper ──────────────────────────────────────────────────
function request(serverUrl, method, reqPath, body, token) {
  console.log(`[REQUEST] ${method} ${serverUrl}${reqPath}`);
  return new Promise((resolve, reject) => {
    const url = new URL(serverUrl + reqPath);
    const lib = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : '';
    console.log('[REQUEST] Body:', bodyStr);
    const headers = {};
    if (bodyStr) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(bodyStr); }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    const opts = { hostname: url.hostname, port, path: url.pathname + url.search, method, headers };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { 
        console.log(`[RESPONSE] Status: ${res.statusCode}, Data: ${data}`);
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch { reject(new Error('Réponse invalide')); } 
      });
    });
    req.on('error', (err) => {
      console.error('[REQUEST] Error:', err);
      reject(new Error('Serveur inaccessible. Vérifiez que le serveur est démarré.'));
    });
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Délai dépassé')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function getServerUrl() {
  return 'https://sales-companion-production.up.railway.app';
}

// ── Auth ─────────────────────────────────────────────────────────
ipcMain.handle('login', (_, p) => request(p.serverUrl, 'POST', '/auth/login', { email: p.email, password: p.password }, null));
ipcMain.handle('register', (_, p) => request(p.serverUrl, 'POST', '/auth/register', { name: p.name, email: p.email, password: p.password }, null));
ipcMain.handle('get-me', (_, token) => request(getServerUrl(), 'GET', '/auth/me', null, token));

// ── Search & Chat ────────────────────────────────────────────────
ipcMain.handle('search', (_, p) => request(getServerUrl(), 'POST', '/api/search', { query: p.query, filters: p.filters, use_ai: p.use_ai }, p.token));
ipcMain.handle('chat', (_, p) => request(getServerUrl(), 'POST', '/api/chat', { messages: p.messages }, p.token));

// ── Saved Searches ────────────────────────────────────────────────
ipcMain.handle('save-search', (_, token, data) => request(getServerUrl(), 'POST', '/api/saved-searches', data, token));
ipcMain.handle('load-saved-searches', (_, token) => request(getServerUrl(), 'GET', '/api/saved-searches', null, token));
ipcMain.handle('delete-saved-search', (_, token, id) => request(getServerUrl(), 'DELETE', `/api/saved-searches/${id}`, null, token));

// ── Pipeline ────────────────────────────────────────────────────
ipcMain.handle('pipeline', (_, method, token, id, data) => {
  const url = getServerUrl();
  if (method === 'GET')    return request(url, 'GET',    '/api/pipeline', null, token);
  if (method === 'POST')   return request(url, 'POST',   '/api/pipeline', data, token);
  if (method === 'PUT')    return request(url, 'PUT',    `/api/pipeline/${id}`, data, token);
  if (method === 'DELETE') return request(url, 'DELETE', `/api/pipeline/${id}`, null, token);
});

// ── Menu ─────────────────────────────────────────────────────────
const menuTemplate = [
  { label: 'Fichier', submenu: [
    { label: 'Nouvelle session', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.reload() },
    { label: 'Se déconnecter', click: () => mainWindow.webContents.send('logout') },
    { type: 'separator' },
    { label: 'Quitter', accelerator: 'Alt+F4', click: () => app.quit() },
  ]},
  { label: 'Affichage', submenu: [
    { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
    { label: 'Plein écran', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
    { type: 'separator' },
    { label: 'Zoom +', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
    { label: 'Zoom -', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
    { label: 'Taille normale', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
  ]},
  { label: 'Aide', submenu: [
    { label: 'Outils développeur', accelerator: 'F12', click: () => mainWindow.webContents.openDevTools() },
  ]},
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
