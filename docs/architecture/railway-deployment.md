# 🚀 Railway Deployment Guide

## Overview

Sales Companion est déployé sur Railway avec :

- **Frontend** : Next.js sur Vercel (optionnel) ou Railway
- **Backend** : Express API sur Railway
- **Database** : Firebase Firestore (managé par Google)
- **Auth** : Firebase Auth

---

## 🔐 Prerequisites

1. **Railway Account** - https://railway.app
2. **Firebase Project** - https://console.firebase.google.com
3. **GitHub Repository** - Pour CI/CD

---

## 📋 Setup Steps

### Step 1: Firebase Setup

#### 1.1 Créer Firebase Service Account

```bash
# Via Firebase Console:
1. Go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy le JSON généré
4. Garder en sécurité (secrets management)
```

#### 1.2 Activer les collections Firestore

```bash
firebase init firestore
firebase deploy --only firestore:rules,firestore:indexes
```

---

### Step 2: Railway Backend Setup

#### 2.1 Connecter GitHub

```bash
1. Sign in to Railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize GitHub & select sales-companion repo
5. Choose branch (main)
```

#### 2.2 Configurer les variables d'environnement

Railway Dashboard → Settings → Variables

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Firebase
FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_CLIENT_EMAIL=... (from Service Account JSON)
FIREBASE_PRIVATE_KEY=... (from Service Account JSON)

# CORS
WEB_ORIGIN=https://salescompanion.cm (ou Vercel URL)
CORS_ORIGIN=https://salescompanion.cm

# Feature Flags
ENABLE_AI=true
ENABLE_TEAM_MANAGEMENT=true
ENABLE_IMPORT=true
```

#### 2.3 Configurer le build et start

Railway automatiquement détecte :

```json
// package.json scripts
"build": "npm run build:server",
"start": "npm --workspace apps/server run start"
```

#### 2.4 Database Integration (optionnel)

Si utilisant PostgreSQL avec Railway :

```
Railway → Variables → Add
DATABASE_URL = Railway PostgreSQL URL
```

---

### Step 3: Frontend Deployment

#### Option A: Vercel (Recommended)

```bash
# Via Vercel Dashboard
1. Import project from GitHub
2. Choose apps/web as root
3. Set Build Command: npm run build:web
4. Set Output Directory: .next

Environment Variables:
NEXT_PUBLIC_API_URL=https://api.salescompanion.cm
(autres NEXT_PUBLIC_* variables)
```

#### Option B: Railway

```bash
# Via Railway Dashboard
1. Create new service
2. Connect GitHub
3. Set build command: npm run build:web
4. Set start command: npm --workspace apps/web run start
5. Expose port 3000
```

---

### Step 4: Domain Configuration

#### 4.1 Custom Domain

```bash
# Railway → Settings → Domain
Add custom domain: api.salescompanion.cm
Add custom domain: salescompanion.cm (frontend)
```

#### 4.2 SSL Certificate

Railway automatic SSL is included ✅

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Tests passing: `npm run test:web && npm run test:server`
- [ ] No console.errors or warnings

### Security

- [ ] Firebase rules deployed
- [ ] Service Account key safely stored
- [ ] No hardcoded secrets in code
- [ ] CORS properly configured
- [ ] Security headers enabled

### Performance

- [ ] Bundle size < 500KB (JS)
- [ ] Lighthouse score > 90
- [ ] No unused dependencies
- [ ] Images optimized

### Firebase

- [ ] Firestore indexes created
- [ ] Collections protected
- [ ] Backup enabled
- [ ] quotas configured

### Infrastructure

- [ ] Health check endpoint working
- [ ] Environment variables set
- [ ] Database migrations done
- [ ] Logs configured

---

## 🚀 Deployment Process

### Automatic Deployment (Recommended)

```bash
# Simply push to main branch
git add .
git commit -m "Deploy to production"
git push origin main

# Railway automatically:
# 1. Builds the project
# 2. Runs tests
# 3. Deploys to production
# 4. Updates both frontend & backend
```

### Manual Deployment

```bash
# Via Railway CLI
railway login
railway link     # Link to Railway project
railway up       # Deploy current branch
```

---

## 📊 Monitoring Post-Deployment

### Health Checks

```bash
# Backend health
curl https://api.salescompanion.cm/health
# Response: {"status":"ok"}

# Frontend
https://salescompanion.cm
```

### Logs

```bash
# Railway → Deployment → Logs
# Real-time logs for debugging

# Errors
Check Sentry (if configured) for error tracking
```

### Performance

```bash
# Lighthouse audit
# Frontend → 90+
# Backend response time < 200ms
```

---

## 🔄 Rollback Process

```bash
# If deployment fails:

# 1. Via Railway Dashboard
Railway → Deployment History → Select previous version → Rollback

# 2. Via Git
git revert <commit-hash>
git push origin main

# Railway automatically redeploys
```

---

## 🛠️ Troubleshooting

### Build Fails

```bash
# Check logs
railway logs -f

# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

### Service Down

```bash
# Check status
railway status

# Restart
railway deploy --force

# Check Firebase connectivity
# Verify FIREBASE_* credentials
```

### Performance Issues

```bash
# Check metrics
railway metrics

# Database query analysis
firebase firestore-debug

# Optimize:
# - Add Firestore indexes
# - Cache API responses
# - Lazy load components
```

---

## 📈 Scaling Considerations

### As Traffic Grows

1. **Firestore Scaling**
   - Monitor read/write units
   - Optimize queries
   - Add composite indexes

2. **API Scaling**
   - Increase Railway instance size
   - Enable auto-scaling
   - Add caching layer (Redis)

3. **Frontend Scaling**
   - Use CDN (Vercel/Cloudflare)
   - Enable image optimization
   - Service Worker caching

---

## 🔐 Security Hardening

### After Deployment

```bash
# 1. Update Firestore rules
firebase deploy --only firestore:rules

# 2. Enable 2FA on accounts
# Firebase Console → Authentication → 2FA

# 3. Rotate service account keys regularly
# Firebase Console → Service Accounts

# 4. Monitor security alerts
# Firebase Console → Security Insights
```

---

## 📞 Support

For issues:

- Check logs: `railway logs -f`
- Railway docs: https://docs.railway.app
- Firebase docs: https://firebase.google.com/docs
- Create GitHub issue with logs

---

## 🎉 Deployment Complete!

Your Sales Companion 2.0 is now live! 🚀

**URLs**

- Frontend: https://salescompanion.cm
- Backend API: https://api.salescompanion.cm
- Health: https://api.salescompanion.cm/health
- Firebase Console: https://console.firebase.google.com/project/sales-companion-237
