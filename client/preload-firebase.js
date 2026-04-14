/**
 * Preload Script pour Electron
 * Bridge sécurisé entre processus principal et processus de rendu
 * Intégration Firebase
 */

const { contextBridge, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(require('electron').app.getPath('userData'), 'firebase_token.txt');
const SERVER_FILE = path.join(require('electron').app.getPath('userData'), 'server_url.txt');
const DEFAULT_SERVER = 'http://localhost:3210';

/**
 * Expose des APIs sécurisées au contexte renderer
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── TOKEN MANAGEMENT ──────────────────────────────
  getToken: () => {
    try {
      return fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';
    } catch {
      return '';
    }
  },

  saveToken: (token) => {
    try {
      fs.writeFileSync(TOKEN_FILE, token, 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  },

  clearToken: () => {
    try {
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
      return true;
    } catch {
      return true;
    }
  },

  // ── SERVER MANAGEMENT ────────────────────────────
  getServerUrl: () => {
    try {
      return fs.existsSync(SERVER_FILE)
        ? fs.readFileSync(SERVER_FILE, 'utf8').trim()
        : DEFAULT_SERVER;
    } catch {
      return DEFAULT_SERVER;
    }
  },

  saveServerUrl: (url) => {
    try {
      fs.writeFileSync(SERVER_FILE, url, 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving server URL:', error);
      return false;
    }
  },

  // ── NETWORK REQUESTS ─────────────────────────────
  /**
   * Effectuer une requête HTTP sécurisée
   */
  fetch: async (method, path, body = null, token = null) => {
    try {
      const serverUrl = contextBridge.electronAPI.getServerUrl() === '' 
        ? DEFAULT_SERVER 
        : contextBridge.electronAPI.getServerUrl();
      
      const url = new URL(serverUrl + path);
      const https = require('https');
      const http = require('http');
      const lib = url.protocol === 'https:' ? https : http;

      const bodyStr = body ? JSON.stringify(body) : '';
      const headers = {
        'Content-Type': 'application/json',
      };

      if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const port = url.port ? parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
      const opts = {
        hostname: url.hostname,
        port,
        path: url.pathname + url.search,
        method,
        headers,
      };

      return new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data),
              });
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          });
        });

        req.on('error', (err) => {
          reject(new Error('Server unreachable. Please ensure the server is running.'));
        });

        if (bodyStr) req.write(bodyStr);
        req.end();
      });
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  },

  // ── EXTERNAL LINKS ───────────────────────────────
  openExternal: (url) => {
    require('electron').shell.openExternal(url);
    return true;
  },

  // ── SYSTEM INFO ──────────────────────────────────
  getSystemInfo: () => {
    const os = require('os');
    return {
      platform: process.platform,
      version: require('electron').app.getVersion(),
      arch: process.arch,
      cpus: os.cpus().length,
    };
  },

  // ── FILE OPERATIONS ──────────────────────────────
  /**
   * Sauvegarder un fichier localement
   */
  saveFile: (filename, data) => {
    try {
      const userDataPath = require('electron').app.getPath('userData');
      const filesDir = path.join(userDataPath, 'exports');
      
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
      
      const filePath = path.join(filesDir, filename);
      fs.writeFileSync(filePath, data);
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Ouvrir un dossier dans l'explorateur
   */
  openFolder: (folderPath) => {
    require('electron').shell.openPath(folderPath);
    return true;
  },
});

/**
 * Handlers IPC pour le processus principal
 */
const { ipcMain: ipc } = require('electron');

// Exemple: gestion des événements depuis le renderer
ipc.handle('app-info', async () => {
  return {
    version: require('electron').app.getVersion(),
    name: 'Sales Companion',
  };
});

ipc.handle('check-server', async () => {
  try {
    const result = await contextBridge.electronAPI.fetch('GET', '/health');
    return result.status === 200;
  } catch {
    return false;
  }
});
