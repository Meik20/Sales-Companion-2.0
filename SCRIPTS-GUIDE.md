# 📦 Package.json Scripts — Firebase Edition

## Backend Scripts

Ajouter ces scripts à `server/package.json` dans la section `"scripts"`:

```json
{
  "scripts": {
    "start": "node server-firebase.js",
    "dev": "nodemon server-firebase.js",
    "migrate:db": "node migrate-sqlite-to-firestore.js",
    "test:health": "curl http://localhost:3210/health",
    "docker:build": "docker build -t sales-companion:latest .",
    "docker:run": "docker run -p 3210:3210 -e FIREBASE_PROJECT_ID=... sales-companion:latest",
    "compose:up": "docker-compose up -d backend",
    "compose:down": "docker-compose down",
    "compose:logs": "docker-compose logs -f backend"
  }
}
```

## Usage

```bash
# Développement
npm run dev

# Migration SQLite → Firestore
npm run migrate:db

# Docker
npm run docker:build
npm run docker:run

# Docker Compose
npm run compose:up
npm run compose:logs
npm run compose:down

# Test santé du serveur
npm run test:health
```

## Frontend Scripts

Ajouter à `client/package.json`:

```json
{
  "scripts": {
    "start": "electron .",
    "dev": "electron . --debug",
    "build:win": "electron-builder --win --x64",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder --win --mac --linux"
  }
}
```

---

**✅ Intégration Firebase terminée !**

Voyez [`QUICKSTART.md`](./QUICKSTART.md) pour démarrer.
