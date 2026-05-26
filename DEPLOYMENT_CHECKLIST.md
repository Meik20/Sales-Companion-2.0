# ✅ Pre-Deployment Checklist - Sales Companion 2.0

## 📋 Phase 1: Code Quality & Testing

### TypeScript & Linting

- [ ] `npm run typecheck` - Tous les types correctement validés
- [ ] `npm run lint` - Pas d'erreurs lint
- [ ] `npm run format:check` - Code formaté correctement
- [ ] Pas de `any` types dans le code
- [ ] Imports correctement résolus

### Tests

- [ ] `npm run test:web` - Frontend tests passing
- [ ] `npm run test:server` - Backend tests passing
- [ ] Coverage > 70% (critical paths)
- [ ] Tests e2e (si applicable)

### Build Verification

- [ ] `npm run build` - Build complet sans erreurs
- [ ] `npm run build:web` - Frontend build OK
- [ ] `npm run build:server` - Backend build OK
- [ ] `.next/` et `dist/` générés correctement

---

## 🔐 Phase 2: Security

### Code Security

- [ ] Pas de secrets en hardcoded
- [ ] Pas de tokens/credentials dans git
- [ ] `.env` dans `.gitignore`
- [ ] Variables sensibles dans Railway secrets
- [ ] Input validation sur toutes les routes

### Firebase Security

- [ ] Firestore rules déployées: `firebase deploy --only firestore:rules`
- [ ] Indexes déployés: `firebase deploy --only firestore:indexes`
- [ ] Collections protégées (vérifier `firestore.rules`)
- [ ] Authentication rules configurées
- [ ] Admin SDK permissions correctes

### API Security

- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Input sanitization
- [ ] SQL injection prevention (si DB)
- [ ] XSS prevention headers

### Infrastructure

- [ ] Security headers enabled (Helmet)
- [ ] HTTPS force enabled
- [ ] CSP (Content Security Policy) configured
- [ ] HSTS configured

---

## 📱 Phase 3: PWA & Performance

### PWA Configuration

- [ ] `manifest.json` complet et valide
- [ ] `icon.svg` et favicons présents
- [ ] `sw.js` service worker enregistré
- [ ] `offline.html` page fallback
- [ ] App installable sur mobile

### Performance Metrics

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Time to Interactive (TTI) < 3.5s

### Bundle Size

- [ ] JS bundle < 500KB (gzipped)
- [ ] CSS bundle < 100KB (gzipped)
- [ ] No duplicate dependencies
- [ ] Tree-shaking working
- [ ] Code splitting optimized

### Caching

- [ ] Static assets cached (1 year)
- [ ] HTML not cached (service worker)
- [ ] API responses cached appropriately
- [ ] Service worker update mechanism

---

## 🌐 Phase 4: Database

### Firestore Configuration

- [ ] Collections created:
  - [ ] `users`
  - [ ] `companies`
  - [ ] `pipeline`
  - [ ] `saved_searches`
  - [ ] `support_threads`
  - [ ] `team_accesses`
  - [ ] `assignments`
  - [ ] `app_config`
  - [ ] `usage_logs`
  - [ ] `import_logs`
- [ ] Indexes created for:
  - [ ] `companies`: region+sector, city+sector, etc.
  - [ ] `pipeline`: userId+status, userId+priority, assignedTo+status
  - [ ] `saved_searches`: userId+createdAt
  - [ ] `support_threads`: userId+status, status+createdAt

### Data Integrity

- [ ] No null references between collections
- [ ] Timestamps using server-side timestamps
- [ ] Backup strategy implemented
- [ ] Data migration scripts tested

---

## 🖥️ Phase 5: Frontend

### Pages & Routes

- [ ] `/` redirects to `/landing`
- [ ] `/landing` loads correctly
- [ ] `/login` and `/register` accessible
- [ ] Protected routes guard correctly
- [ ] Admin routes restricted to admins
- [ ] 404 page exists and styled

### Features

- [ ] Search functionality working
- [ ] Pipeline CRUD operations
- [ ] Team management (if applicable)
- [ ] Support ticket system
- [ ] User profile management
- [ ] File uploads (if applicable)

### Mobile/Responsive

- [ ] Responsive on 320px to 2560px
- [ ] Touch interactions work
- [ ] Forms mobile-friendly
- [ ] Images responsive
- [ ] Navigation mobile-friendly

### Accessibility

- [ ] Semantic HTML used
- [ ] ARIA labels where needed
- [ ] Keyboard navigation working
- [ ] Color contrast > 4.5:1
- [ ] Screen reader tested (if possible)

---

## 🔧 Phase 6: Backend

### API Endpoints

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Auth endpoints working (`/auth/*`)
- [ ] Companies endpoints working (`/companies/*`)
- [ ] Admin endpoints protected (`/admin/*`)
- [ ] Error responses consistent

### Middleware

- [ ] Auth middleware validates tokens
- [ ] Admin middleware checks permissions
- [ ] Error middleware catches all errors
- [ ] CORS middleware configured
- [ ] Rate limiting working

### Validation & Error Handling

- [ ] Zod schemas validate all inputs
- [ ] Error messages user-friendly
- [ ] 4xx and 5xx responses correct
- [ ] Logging comprehensive
- [ ] No sensitive data in errors

### Database Operations

- [ ] Firestore queries optimized
- [ ] No N+1 queries
- [ ] Transactions for critical operations
- [ ] Error handling for connection issues
- [ ] Retry logic where needed

---

## 🚀 Phase 7: Deployment Configuration

### Environment Variables

#### Frontend (.env.local)

- [ ] NEXT_PUBLIC_FIREBASE_API_KEY set
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN set
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID set
- [ ] NEXT_PUBLIC_API_URL set correctly

#### Backend (.env)

- [ ] NODE_ENV=production
- [ ] PORT=8080
- [ ] FIREBASE_PROJECT_ID set
- [ ] FIREBASE_CLIENT_EMAIL set
- [ ] FIREBASE_PRIVATE_KEY set
- [ ] WEB_ORIGIN set to frontend URL
- [ ] CORS_ORIGIN set correctly

### Railway Configuration

- [ ] railway.json configured
- [ ] Procfile created and valid
- [ ] Build commands correct
- [ ] Start commands correct
- [ ] Environment variables in Railway dashboard

### Deployment Credentials

- [ ] Firebase service account key secure
- [ ] Railway access token configured
- [ ] GitHub SSH key added
- [ ] No credentials in repository

---

## 🧪 Phase 8: Integration Testing

### End-to-End User Flow

- [ ] User can register
- [ ] User can login
- [ ] User can search companies
- [ ] User can add to pipeline
- [ ] User can save searches
- [ ] User can create support ticket
- [ ] Admin can import companies
- [ ] Manager can assign prospects

### Third-party Integrations

- [ ] Firebase Auth working
- [ ] Firestore operations working
- [ ] Service Worker registering
- [ ] Push notifications (if configured)
- [ ] Email notifications (if configured)

### Browser Compatibility

- [ ] Chrome latest version
- [ ] Firefox latest version
- [ ] Safari latest version
- [ ] Edge latest version
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🔄 Phase 9: Rollback & Recovery

### Backup & Restore

- [ ] Firestore backup configured
- [ ] Database snapshots scheduled
- [ ] Restore procedure documented
- [ ] Version control tags created
- [ ] Git tags for releases

### Monitoring Setup

- [ ] Error logging configured (Sentry/etc)
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set
- [ ] On-call rotation established

---

## 📊 Phase 10: Documentation

### Technical Documentation

- [ ] README.md complete and up-to-date
- [ ] data-model.md documented
- [ ] API documentation (if using Swagger/OpenAPI)
- [ ] Database schema documented
- [ ] Architecture diagram included

### Deployment Documentation

- [ ] railway-deployment.md complete
- [ ] Setup instructions clear
- [ ] Troubleshooting guide provided
- [ ] Scaling considerations documented
- [ ] Maintenance procedures documented

### User Documentation

- [ ] User guide written (if applicable)
- [ ] Feature overview documented
- [ ] FAQ section created
- [ ] Support contact provided
- [ ] Terms of Service/Privacy Policy created

---

## ✨ Final Checks

### Before Going Live

- [ ] All checklist items checked
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance audit passed
- [ ] Stakeholder approval received

### Day of Deployment

- [ ] Backup Firestore
- [ ] Take screenshot of current status
- [ ] Notify stakeholders
- [ ] Deploy to staging first (if applicable)
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Monitor logs for errors
- [ ] Test critical user flows
- [ ] Update status page

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Collect user feedback
- [ ] Document any issues
- [ ] Plan for improvements
- [ ] Schedule post-mortem if issues

---

## 🎉 Deployment Complete!

**Launch Time!** 🚀

Your Sales Companion 2.0 is ready for production.

Keep monitoring and iterate based on user feedback!

---

## 📞 Emergency Contacts

- **Tech Lead**: [Name/Contact]
- **DevOps**: [Name/Contact]
- **Support**: [Contact info]

## 📝 Sign-Off

- [ ] Project Manager: **\_** Date: **\_**
- [ ] Tech Lead: **\_** Date: **\_**
- [ ] QA Lead: **\_** Date: **\_**
- [ ] DevOps: **\_** Date: **\_**
