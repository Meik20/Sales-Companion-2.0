# Charte Graphique & Design System — Sales Companion 2.0
> **Document de Référence Officiel**  
> *Sales Intelligence Workspace & CRM B2B*

---

## 1. Identité & Positionnement de Marque

### 1.1 La Vision
Sales Companion 2.0 n'est pas un simple annuaire d'entreprises, mais un **Sales Intelligence Workspace** tout-en-un conçu pour les forces de vente B2B en Afrique subsaharienne (espace CEMAC & international).

Le parcours utilisateur s'articule autour de 5 piliers :
1. **Découvrir** : cibler et identifier des entreprises qualifiées.
2. **Analyser** : évaluer le secteur, les coordonnées vérifiées et le potentiel commercial.
3. **Contacter** : préparer l'approche avec l'assistance IA (scripts d'appel, WhatsApp, e-mails).
4. **Convertir** : transformer les prospects en opportunités de négociation.
5. **Piloter** : suivre en temps réel les objectifs individuels et consolidés d'équipe.

### 1.2 Valeurs Graphiques
- **Rigueur & Clarté Institutionnelle** : contrastes élevés (normes WCAG AA/AAA), hiérarchie typographique tranchée, aucune surcharge cognitive.
- **Modernité SaaS B2B** : finitions soignées, surfaces solides, transitions fluides, micro-interactions réactives.
- **Ancrage Panafricain & Émergence Économique** : vert institutionnel Cameroun `#1B7A3E` marié au bleu technologique `#2F5BEA`.

---

## 2. Logotype, Emblème & Règles d'Usage

### 2.1 Composants du Logo
Le logo officiel est composé de deux entités inséparables :
1. **L'Emblème Vectoriel (`<ScIcon />`)** :
   - Forme : carré aux coins arrondis (`radius-md` à `radius-lg`).
   - Fond : Vert officiel Cameroun `#1B7A3E`.
   - Monogramme : Lettres **SC** en courbes de Bézier blanches équilibrées, centrées.
2. **Le Titrage de Marque** :
   - Typographie : `font-heading` (`Outfit`), graisse Semi-Bold (600).
   - Libellé : `Sales Companion ` en couleur de texte principal (`text-foreground`) suivi de `2.0` en vert institutionnel (`text-[#1B7A3E]`).

### 2.2 Règles d'Interdiction Formelle
> [!CAUTION]
> - **Aucune substitution textuelle brute** : Interdiction d'utiliser des conteneurs HTML `<div>SC</div>` ou des emojis en lieu et place du logo vectoriel.
> - **Respect du ratio** : Ne jamais déformer, étirer ou écraser l'emblème.
> - **Zone de respiration** : Préserver un padding minimal de `16px` à `24px` autour du bloc logo dans les en-têtes et les bannières.

---

## 3. Système de Couleurs & Tokens Sémantiques

L'application supporte nativement un double thème adaptatif (**Mode Clair** et **Mode Sombre**).

### 3.1 Couleurs Primaires & Marque

| Token | Mode Clair | Mode Sombre | Rôle & Usage |
|---|---|---|---|
| **`--primary`** | `#2F5BEA` | `#2F5BEA` | Bleu Royal / Action principale, CTA majeurs, focus ring |
| **`Brand Accent`** | `#1B7A3E` | `#1B7A3E` | Vert Cameroun / Emblème de marque, suffixe 2.0, badges vérifiés |
| **`--primary-foreground`** | `#ffffff` | `#ffffff` | Blanc pur sur fond primaire |

### 3.2 Surfaces & Niveaux de Gris

| Token | Mode Clair (Fintech Nette) | Mode Sombre (Obsidian Deep) | Description |
|---|---|---|---|
| **`--background`** | `#f7f8fa` | `#0b0f17` | Fond de page global |
| **`--card`** | `#ffffff` | `#121826` | Cartes, conteneurs, widgets |
| **`--popover`** | `#ffffff` *(100% opaque)* | `#121826` *(100% opaque)* | Menus déroulants, modales, drawers |
| **`--border`** | `#e6e8ec` | `#1f2937` | Séparateurs, bordures de cartes |
| **`--secondary`** | `#f0f2f5` | `#1a2234` | Arrière-plan secondaire, boutons neutres |
| **`--muted-foreground`**| `#475467` | `#94a3b8` | Textes d'aide, métadonnées, sous-titres |
| **`--foreground`** | `#101828` | `#f8fafc` | Texte principal haute lisibilité |

### 3.3 Statuts Métier CRM & Pipeline Commercial

| Étape / Statut | Couleur (Clair) | Couleur (Sombre) | Background Doux | Usage Métier |
|---|---|---|---|---|
| **Conclue / Gagnée** | `#047857` (Émeraude 700) | `#34d399` (Émeraude 400) | `#ecfdf5` / `rgba(52,211,153,0.12)` | Opportunités signées, succès, clients actifs |
| **Prospection & Négociation** | `#1d4ed8` (Bleu 700) | `#38bdf8` (Bleu Ciel 400) | `#eff6ff` / `rgba(56,189,248,0.12)` | Affaires actives en cours dans le pipeline |
| **Relance en Retard** | `#b91c1c` (Rouge 700) | `#ef4444` (Rouge 500) | `#fef2f2` / `rgba(239,68,68,0.12)` | Actions requises immédiatement, échéances dépassées |
| **Lead Stagnant / Vigilance** | `#b45309` (Ambre 700) | `#fbbf24` (Ambre 400) | `#fffbeb` / `rgba(251,191,36,0.12)` | Opportunités sans activité depuis plus de 15 jours |
| **Neutre / Archivé** | `#475467` (Gris Slate) | `#94a3b8` (Gris Clair) | `#f1f5f9` / `rgba(148,163,184,0.12)` | Dossiers classés sans suite ou non qualifiés |

---

## 4. Typographie & Hiérarchie des Textes

### 4.1 Polices Officielles
- **Titrage & Identité (`font-heading`)** : **Outfit** (Google Fonts)  
  *Graisses utilisées* : Medium (500), Semi-Bold (600), Bold (700), Extra-Bold (800).
- **Corps de texte & Interface (`font-sans`, `font-body`)** : **Source Sans 3** / **Inter**  
  *Graisses utilisées* : Regular (400), Medium (500), Semi-Bold (600).
- **Chiffres, Références & Données Techniques (`font-mono`)** : Police à chasse fixe système (`Consolas`, `Monaco`, monospace) pour les RCCM, NIU fiscaux et métriques denses.

### 4.2 Échelle Typographique Standardisée

| Niveau | Taille | Interligne | Usage Recommandé |
|---|---|---|---|
| **Display / H1** | `2.25rem` (36px) à `1.875rem` (30px) | `1.2` | Titres de Landing Page, Hero sections |
| **Page Title / H2** | `1.5rem` (24px) | `1.25` | En-tête des tableaux de bord, titres de pages |
| **Section Title / H3** | `1.125rem` (18px) | `1.375` | Titres de cartes KPIs, étapes du pipeline |
| **Card Header / H4** | `0.9375rem` (15px) | `1.4` | Noms de prospects, libellés de listes |
| **Body (Base)** | `0.875rem` (14px) | `1.5` | Texte courant, descriptions, champs de formulaires |
| **Caption / Small** | `0.75rem` (12px) | `1.4` | Badges, tags de statut, dates de relance |
| **Micro / 2xs** | `0.6875rem` (11px) | `1.3` | Compteurs discrets, labels de raccourcis |

---

## 5. Iconographie & Éléments Visuels (Politique Zéro Emoji)

> [!IMPORTANT]
> **Règle Fondamentale : 100% Vectoriel**  
> L'utilisation d'emojis Unicode bruts (ex: `🔥`, `🥇`, `⚠️`, `✓`, `🟢`, `🔴`) en tant qu'icônes d'interface est strictement prohibée.

### 5.1 Sources Officielles

- **Lucide React (`lucide-react`)** : bibliothèque unique pour toutes les icônes de navigation, d'action et d'état (`Search`, `Filter`, `Calendar`, `TrendingUp`, `Trash2`, `Download`, etc.).
- **ScIcon** : logo exclusif de la marque.
- **CountryFlag** : drapeaux vectoriels des pays membres (Cameroun, Côte d'Ivoire, Sénégal, etc.).
- **Pastilles d'état** : pastille CSS `w-2 h-2 rounded-full` avec couleur pleine (`backgroundColor: color`), jamais d'émojis de cercles de couleur (`🟢`, `🔴`).

---

## 6. Rayons de Courbure, Ombres & Profondeur

### 6.1 Rayons de Courbure (`border-radius`)
- **Éléments fins & tags internes (`rounded-xs` / `rounded-sm`)** : `4px` à `6px`
- **Champs de saisie, selects, boutons secondaires (`rounded-md`)** : `8px`
- **Boutons CTA majeurs, cartes standard (`rounded-lg`)** : `12px`
- **Grandes cartes KPIs, modales de dialogue (`rounded-xl` / `rounded-2xl`)** : `16px` à `20px`
- **Pilules, badges d'état, avatars (`rounded-full`)** : `9999px`

### 6.2 Ombres & Élévation
- **`elevation-0`** : Aucune ombre, délimitation purement assurée par `border: 1px solid var(--border)`.
- **`elevation-1`** (Cartes au repos) : `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`.
- **`elevation-2`** (Hover cartes, popovers) : `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **`elevation-3` / `elevation-4`** (Modales, drawers) : `0 20px 25px -5px rgba(0, 0, 0, 0.15)`.

---

## 7. Invariants d'Interface Inviolables (Règles Architecturales)

1. **Opacité 100% des Fenêtres Flottantes (Règle 8)** :
   - Les popovers, listes déroulantes de profil, sélecteurs et modales doivent **TOUJOURS** avoir un fond opaque à 100% (`bg-card` ou `bg-popover` solide).
   - **Interdiction formelle** de `bg-card/80` ou de transparences qui laisseraient lire les textes situés à l'arrière-plan.
2. **Aucun Identifiant Technique Brut (Règle 13)** :
   - Ne jamais afficher un UID Firebase ou UUID Supabase dans l'interface. Toujours résoudre le nom complet de l'utilisateur ou utiliser un intitulé de rôle générique qualifié (`Team Manager`, `Commercial`).
3. **Internationalisation Bilingue Intégrale (Règle 10)** :
   - L'ensemble des textes, boutons, infobulles, mois du calendrier et statuts s'adapte automatiquement à la langue active (`fr` / `en`).
   - Jamais de libellé temporel en dur (ex: `getMonthPeriodLabel(period, lang)` obligatoire).
