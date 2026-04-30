# 📊 Data Model - Sales Companion

## Vue d'ensemble

Sales Companion utilise **Firebase Firestore** comme base de données. Le modèle de données est conçu pour supporter :
- Gestion d'entreprises camerounaises
- Pipeline CRM personnel et équipe
- Système de rôles (admin, manager, member)
- Support client
- Import/export en masse

---

## Collections principales

### 1. `users`

Profils utilisateurs avec rôles et permissions.

```typescript
{
  uid: string              // Firebase Auth UID (clé)
  email: string            // Adresse email
  displayName: string      // Nom complet
  photoURL?: string        // Photo de profil
  role: 'admin' | 'manager' | 'member'  // Rôle utilisateur
  
  // Metadata
  createdAt: Timestamp     // Date de création
  updatedAt: Timestamp     // Dernière mise à jour
  lastLogin?: Timestamp    // Dernier accès
  
  // Permissions
  canImportCompanies: boolean
  canManageUsers: boolean
  canSeeAnalytics: boolean
  
  // Manager info (si role === 'manager')
  teamId?: string          // ID de l'équipe gérée
  teamMembers?: string[]   // UIDs des membres
  
  // Settings
  preferences?: {
    darkMode: boolean
    emailNotifications: boolean
    language: 'fr' | 'en'
  }
}
```

**Règles Firestore :**
```javascript
match /users/{userId} {
  allow read: if isSignedIn() && (isOwner(userId) || isAdmin() || isManager())
  allow write: if isSignedIn() && (isOwner(userId) || isAdmin())
  allow create: if isSignedIn()
}
```

---

### 2. `companies`

Base de données d'entreprises camerounaises (read-only pour non-admin).

```typescript
{
  id: string               // Identifiant unique (RCCM ou NIU)
  name: string             // Raison sociale
  
  // Contact
  phone: string[]          // Numéros de téléphone
  email?: string[]         // Adresses email
  website?: string         // Site web
  
  // Localisation
  region: string           // Région (ex: "Centre", "Littoral")
  city: string             // Ville
  address: string          // Adresse complète
  coordinates?: {
    lat: number
    lng: number
  }
  
  // Secteur d'activité
  sector: string           // Secteur (ex: "Tech", "BTP", "Santé")
  subSector?: string       // Sous-secteur
  
  // Données entreprise
  siret?: string           // SIRET si applicable
  foundedYear?: number     // Année de création
  employeeCount?: 'micro' | 'tpe' | 'pme' | 'eti' | 'large'
  
  // Finance
  annualRevenue?: number   // Chiffre d'affaires annuel
  currency?: string        // Devise (default: 'XAF')
  
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  source: 'import' | 'manual' | 'api'  // Source des données
}
```

**Indices requis :**
```json
{
  "region": "Ascending",
  "sector": "Ascending"
}
{
  "city": "Ascending",
  "sector": "Ascending"
}
{
  "region": "Ascending",
  "sector": "Ascending",
  "employeeCount": "Ascending"
}
```

---

### 3. `pipeline`

Pipeline CRM personnel/équipe.

```typescript
{
  id: string               // ID unique (auto-generated)
  userId: string           // Propriétaire du prospect
  companyId: string        // Référence à la companie
  
  // Prospect Info
  companyName: string
  sector: string
  contactPerson?: string   // Personne de contact
  contactPhone?: string
  contactEmail?: string
  
  // Pipeline State
  status: 'prospect' | 'contact' | 'negotiation' | 'won' | 'lost'
  stage: number            // Numéro du stage (0-4)
  probability: number      // Probabilité 0-100%
  
  // Commerce
  estimatedDeal?: number   // Valeur estimée
  currency?: string        // Devise (default: 'XAF')
  expectedCloseDate?: Timestamp
  
  // Management
  notes: string            // Notes libres
  tags: string[]           // Tags pour catégoriser
  assignedTo?: string      // UID du commercial (si manager)
  priority: 'low' | 'medium' | 'high'
  
  // Historique
  activities: {
    type: 'call' | 'email' | 'meeting' | 'note'
    description: string
    timestamp: Timestamp
  }[]
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastActivityAt?: Timestamp
}
```

**Indices requis :**
```json
{
  "userId": "Ascending",
  "status": "Ascending"
}
{
  "userId": "Ascending",
  "priority": "Descending",
  "expectedCloseDate": "Ascending"
}
{
  "assignedTo": "Ascending",
  "status": "Ascending"
}
```

---

### 4. `saved_searches`

Recherches sauvegardées par utilisateur.

```typescript
{
  id: string               // ID unique
  userId: string           // Propriétaire
  
  name: string             // Nom de la recherche
  description?: string     // Description
  
  // Filtres
  criteria: {
    region?: string[]
    sector?: string[]
    city?: string[]
    employeeCount?: string[]
    keyword?: string
  }
  
  // Resultats
  resultCount: number      // Nombre d'empreses trouvées
  
  // Usage
  lastUsedAt?: Timestamp
  frequency: number        // Nombre de fois utilisée
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

### 5. `support_threads`

Threads de support client.

```typescript
{
  id: string               // ID unique
  userId: string           // Créateur du ticket
  
  subject: string          // Sujet
  description: string      // Description initiale
  
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  
  // Messages (sous-collection)
  messages: {
    id: string
    senderId: string       // UID de l'auteur
    senderRole: 'user' | 'admin'
    message: string
    attachments?: string[] // URLs
    timestamp: Timestamp
  }[]
  
  // Assignation
  assignedAdminId?: string
  
  // Tags
  category: string         // ex: 'bug', 'feature', 'question'
  tags: string[]
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  resolvedAt?: Timestamp
}
```

**Structure sous-collection :**
```
support_threads/{threadId}/messages/
```

---

### 6. `team_accesses`

Gestion des accès équipe pour les managers.

```typescript
{
  id: string               // ID unique
  managerId: string        // UID du manager
  
  teamName: string         // Nom de l'équipe
  description?: string
  
  members: {
    userId: string
    role: 'member' | 'lead'  // Lead = responsable d'équipe
    joinedAt: Timestamp
  }[]
  
  permissions: {
    canViewPipeline: boolean
    canAssignProspects: boolean
    canViewAnalytics: boolean
  }
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

### 7. `assignments`

Affectations de prospects aux commerciaux.

```typescript
{
  id: string               // ID unique
  managerId: string        // UID du manager qui assigne
  pipelineId: string       // Référence au prospect
  
  assignedTo: string       // UID du commercial
  
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  
  // Contex