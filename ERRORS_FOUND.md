# 🔍 Erreurs Cachées Détectées

## 🔴 CRITIQUES - Production Risk

### 1. Console Logs en Production
**Fichier** : `apps/web/src/app/api/team/activate/route.ts`
**Lignes** : 87, 94, 129, 205, 210
**Problème** : 5 appels `console.log/console.error` vont polluer les logs en production
```typescript
console.log('[team/activate] Activation initiated:', {...})
console.log('[team/activate] Updated existing user:', {...})
console.log('[team/activate] Created new user:', {...})
console.log('[team/activate] Account activated successfully:', {...})
console.error('[team/activate] Error:', error)
console.error('[team/activate] Error details:', {...})
```
**Impact** : Logs sensibles exposées, performance dégradée
**Solution** : Remplacer par `logger.info/logger.error` ou retirer en production

---

### 2. Non-Null Assertions Dangereux
**Fichier** : 6 fichiers API routes
**Occurrences** :
- `apps/web/src/app/api/ai/chat/route.ts:59` - `userSnap.data()!`
- `apps/web/src/app/api/search/companies/route.ts:65` - `userSnap.data()!`
- `apps/web/src/app/api/team/access-info/[accessId]/route.ts:36` - `snap.data()!`
- `apps/web/src/app/api/team/activate/route.ts:53` - `snap.data()!`
- `apps/web/src/app/api/auth/verify-email/route.ts:50` - `userSnap.data()!`
- `apps/web/src/app/api/auth/activate/route.ts:73` - `snap.data()!`

**Problème** : Utiliser `!` sur des snapshots de Firestore assume que `.data()` retourne toujours une valeur
```typescript
const data = snap.data()!  // ❌ Crash potentiel si null/undefined
```
**Risque** : Si le document est vide ou corrompu → runtime error TypeError
**Solution** : 
```typescript
const data = snap.data()
if (!data) return NextResponse.json({...}, { status: 400 })
```

---

### 3. Error Mapper Fragile
**Fichier** : `apps/web/src/features/auth/utils/error-mapper.ts:7`
**Code** :
```typescript
const code = (error as any).code?.toLowerCase() || ''
```
**Problème** : 
1. `as any` sur l'erreur
2. Accès à `.code` qui existe peut-être pas
3. Appel `.toLowerCase()` sur undefined potentiel

**Risque** : Si une erreur non-Firebase arrive → comportement imprévisible
**Solution** :
```typescript
const code = typeof (error as any)?.code === 'string' ? (error as any).code.toLowerCase() : ''
```

---

## 🟡 MAJEURS - Type Safety Issues

### 4. Excessif Use of `as any` (20+ Occurrences)

**Liste complète** :
1. `apps/web/src/hooks/usePWARegistration.ts:157` - `(registration as any).sync.register(tag)`
2. `apps/web/src/features/team/components/TeamAccessManager.tsx:94-95` - Timestamp conversion
3. `apps/web/src/features/team/components/TeamAccessManager.tsx:179` - JSON response
4. `apps/web/src/features/team/components/CreateAssignmentForm.tsx:169` - Prospect fields
5. `apps/web/src/features/search/components/SearchFiltersForm.tsx:514, 536` - Translation keys
6. `apps/web/src/features/profile/components/ProfileCard.tsx:97` - Role translation
7. `apps/server/src/services/company-import.service.ts:62` - Buffer loading
8. `apps/web/src/components/layout/AppSidebar.tsx:347, 427` - Region/Sector keys
9. `apps/web/src/features/auth/utils/error-mapper.ts:7` - Error code
10. `apps/web/src/features/auth/components/RegisterForm.tsx:114` - Translation key
11. `apps/web/src/features/auth/components/LoginForm.tsx:152` - Translation key
12. `apps/web/src/app/(protected)/settings/page.tsx:89, 96, 146` - Plan labels
13. `apps/web/src/app/HomeClient.tsx:23` - Navigator standalone
14. `apps/web/src/app/(protected)/search/page.tsx:234, 251` - Pagination texts
15. `apps/web/src/app/api/team/activate/route.ts:65` - Email body parsing

**Impact** : Perte complète de type-safety, erreurs potentielles non détectées
**Sévérité** : Moyen (mais affecte 15+ fichiers)

---

### 5. Unsafe Error Handling

**Fichier** : `apps/web/src/app/api/team/activate/route.ts:210-212`
```typescript
const code = (authErr as { code?: string })?.code  // ❌ as any variant
if (code === 'auth/user-not-found') {
```
**Problème** : Typing partiel sur erreur, risque de faux positif

---

## 🟠 MINEURS - Code Quality

### 6. Unguarded Null Access
**Pattern** : `data?.email?.trim()`
**Fichiers** : Plusieurs routes API
**Contexte** : Fonctionne mais fragile

---

## 📊 Résumé

| Problème | Sévérité | Qty | Impact |
|----------|----------|-----|--------|
| Console logs production | 🔴 Critique | 5 | Logs sensibles |
| Non-null assertions dangereux | 🔴 Critique | 6 | Runtime crashes |
| Error mapper fragile | 🔴 Critique | 1 | Imprévisible |
| Excessive `as any` | 🟡 Majeur | 20+ | Type-safety loss |
| Error handling unsafe | 🟡 Majeur | 1 | Faux positifs |

---

## ✅ Fixes Recommandées (Priorité)

1. **Immédiat** : Remplacer `console.log` par logger en production
2. **Immédiat** : Ajouter guards avant `.data()!`
3. **Urgent** : Fixer error mapper avec type safety
4. **Court terme** : Réduire `as any` progressivement
