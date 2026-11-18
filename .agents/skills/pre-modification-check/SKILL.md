---
name: pre-modification-check
description: >-
  Vérification de blocage obligatoire avant TOUTE modification dans Sales Companion 2.0.
  Consulte et applique rigoureusement les règles d'intégrité architecturale (AGENTS.md)
  et la charte graphique officielle (docs/CHARTE_GRAPHIQUE.md) pour interdire toute régression.
---

# Règle de Blocage Pré-Modification — Sales Companion 2.0

> [!CAUTION]
> **VERROU CRITIQUE DE BLOCAGE ABSOLU :**  
> **AUCUNE MODIFICATION DE L'APPLICATION (Code, UI, Bannières, Styles, Assets, API, Modèle Firestore/Supabase)** ne doit débuter sans avoir préalablement consulté et validé la conformité avec :
> 1. Les **Règles d'Intégrité Architecturale (`AGENTS.md`)**
> 2. La **Charte Graphique Officielle (`docs/CHARTE_GRAPHIQUE.md`)**

---

## 1. Protocole de Démarrage Obligatoire (Gate 0)

Avant d'éditer un fichier ou d'exécuter un script créateur/modificateur d'assets :

1. **Identifier la nature du changement :**
   - **Visuel / UI / Branding / Bannières / Graphisme** ➔ Appliquer la **Checklist Visuelle (Section 2)**.
   - **Backend / API / Données / Hiérarchie / Rôles** ➔ Appliquer la **Checklist Architecturale (Section 3)**.
2. **Formuler le Bilan de Conformité :**
   - Énoncer les contraintes de la charte et d'intégrité qui s'appliquent directement à la tâche.
   - En cas d'incompatibilité entre une demande et la charte, alerter immédiatement avant d'écrire du code.

---

## 2. Checklist Visuelle & Branding (Charte Graphique)

Toute création de composant UI, bannière réseau social, icône ou document marketing doit valider :

- [ ] **Logotype & Titrage (Charte §2)** :
  - Emblème vectoriel `<ScIcon />` avec centrage optique parfait des lettres `SC` dans le squircle `#1B7A3E`.
  - Titre : `Sales Companion ` en couleur de texte (`text-foreground` ou `#FFFFFF` en dark) suivi de `2.0` en vert institutionnel solide (`#1B7A3E`).
  - Police : **`Outfit`** (`font-heading`), graisse **Semi-Bold (600)** impérative. Pas de graisse 800 arbitraire, pas de glows/néons ou d'effets visuels non documentés dans la charte.
  - Suffixe `2.0` : toujours en vert uni `#1B7A3E` (aucun dégradé fantaisiste).
- [ ] **Palette & Couleurs Chartées (Charte §3)** :
  - **Vert Institutionnel** : `#1B7A3E` (seul vert de marque autorisé).
  - **Bleu Primaire / Action** : `#2F5BEA` (bleu technologique royal).
  - **Surfaces Sombres** : `#0B0F17` (fond page) et `#121826` (cartes / conteneurs).
  - **Interdiction formelle** d'utiliser des verts non chartés (ex: `#4ADE80`, `#22C55E`, `#10B981` en tant que couleurs de marque) ou des palettes arbitraires non validées.
- [ ] **Politique Zéro Emoji (AGENTS.md Règle 6 & Charte §5)** :
  - 100% vectoriel. Aucune utilisation d'emojis Unicode (`🇨🇲`, `🔥`, `🥇`, `⚠️`, `✓`, etc.), y compris dans les bannières, métadonnées ou visuels de partage.
  - Drapeaux : uniquement via SVG vectoriel (`CountryFlag`).
  - Icônes : Lucide React ou tracés SVG vectoriels stricts équivalents.
- [ ] **Terminologie de Marque** :
  - Ne jamais réintroduire le terme obsolète « B2B » dans les titres ou badges utilisateur.
  - Désignation officielle : **« Workspace Commercial & Prospection »** ou **« Sales Intelligence Workspace »**.

---

## 3. Checklist Architecturale & Métier (AGENTS.md)

Toute modification de logique métier, de routes API ou de requêtes doit valider :

- [ ] **Hiérarchie à 4 Niveaux (Règle 1)** : Senior Managers (supervision segment), Team Managers (pilotage opérationnel), Commerciaux (terrain), Support Agent (SAV clients clos uniquement).
- [ ] **Confinement Agent Support (Règle 14)** : Jamais dans les sélecteurs de managers, jamais de délégation de prospects actifs.
- [ ] **Désignation Explicite Team Managers (Règle 9)** : Sur les vues Senior Manager, toujours nommer explicitement les « Team Managers » (jamais juste « Managers »).
- [ ] **Zéro Fuite d'UID (Règle 13)** : Toujours résoudre les noms complets côté serveur, jamais de fallback `?? uid`.
- [ ] **Portefeuille Actif Exclusif (Règle 7 & 12)** : Prospection + Négociation uniquement. Les conclues restent dans la base clients du TM historique.
- [ ] **Zéro Constante en Dur / Context-Driven (Règle 16)** : Périodes dynamiques, fuseaux horaires org, devises org, aucune date figée.

---

## 4. Garde-fou Pré-Commit & Build

Avant de soumettre ou commiter :
```bash
node scripts/check-architecture-integrity.js
npx tsc --noEmit -p apps/web/tsconfig.json
```
Tout échec bloque immédiatement l'opération.
