# CTN Lycée — Cahier de Texte Numérique

> Application web de gestion pédagogique pour lycées camerounais.
> Trois rôles : **Enseignant**, **Conseiller Pédagogique**, **Administrateur**.
> Backend complet sur **Supabase** (PostgreSQL + Auth + Storage + Realtime).

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Connected-3ECF8E?logo=supabase&logoColor=white)

---

## Table des matières

1. [Présentation](#1-présentation)
2. [Stack technique](#2-stack-technique)
3. [Supabase — Configuration](#3-supabase--configuration)
4. [Installation & lancement](#4-installation--lancement)
5. [Architecture des fichiers](#5-architecture-des-fichiers)
6. [Base de données — Les 7 étapes](#6-base-de-données--les-7-étapes)
7. [Contextes React](#7-contextes-react)
8. [Hooks personnalisés](#8-hooks-personnalisés)
9. [Pages & fonctionnalités](#9-pages--fonctionnalités)
10. [Flux métier détaillés](#10-flux-métier-détaillés)
11. [Comptes de démonstration](#11-comptes-de-démonstration)
12. [Ce qui reste à faire](#12-ce-qui-reste-à-faire)

---

## 1. Présentation

**CTN Lycée** remplace le cahier de texte papier par une plateforme numérique qui garantit :

- **Traçabilité** — chaque séance est horodatée, géolocalisée et signée numériquement
- **Transparence** — conseiller et administration ont une vue en temps réel
- **Archivage** — conservation légale des données
- **Responsabilisation** — signature manuscrite obligatoire sur canvas HTML5

---

## 2. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| UI | React | 19.2 |
| Bundler | Vite | 8.0 |
| Routing | React Router DOM | 7.14 |
| Backend | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Realtime | Supabase Realtime (CDC) | — |
| PDF export | html2pdf.js | 0.14 |
| Styles | Vanilla CSS | 752 lignes |

---

## 3. Supabase — Configuration

### Projet actuel
- **URL** : `https://hfillvzdesjvyhhmgjgc.supabase.co`
- **Anon Key** : voir `src/supabaseClient.js`

### Buckets Storage à créer manuellement
| Bucket | Accès | Usage |
|---|---|---|
| `avatars` | Public | Photos de profil des enseignants |
| `resources` | Public | Ressources pédagogiques (PDF, images, vidéos) |

### Politiques Storage
Les politiques RLS pour les deux buckets sont incluses dans le fichier `database.sql` (Étapes 2 et 3b).

---

## 4. Installation & lancement

```bash
# 1. Cloner le repo
git clone https://github.com/liodavinci20-commits/ctn-.git
cd ctn-

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev
# → http://localhost:5173

# 4. Build production
npm run build
npm run preview
```

### Initialisation de la base de données
Ouvrir le fichier `database.sql` et coller chaque bloc **ÉTAPE** dans le **SQL Editor** de Supabase, dans l'ordre 1 → 2 → 3 → 3b → 4 → 5 → 6 → 7.

---

## 5. Architecture des fichiers

```
ctn-app/
├── database.sql                        # Schéma SQL complet — 7 étapes
├── src/
│   ├── main.jsx                        # Point d'entrée — 5 Providers imbriqués
│   ├── App.jsx                         # Routeur — gestion des rôles
│   ├── supabaseClient.js               # Client Supabase (URL + anon key)
│   │
│   ├── context/                        # State management global
│   │   ├── AuthContext.jsx             # Auth Supabase + profil utilisateur
│   │   ├── SessionsContext.jsx         # CRUD séances pédagogiques
│   │   ├── EdtContext.jsx              # CRUD emploi du temps
│   │   ├── NotificationsContext.jsx    # Notifications + Realtime
│   │   └── RattrapagesContext.jsx      # Demandes de rattrapage
│   │
│   ├── hooks/
│   │   ├── useReferenceData.js         # Classes + matières (profil enseignant)
│   │   ├── useProgramme.js             # Programmes officiels + progression
│   │   └── useResources.js            # Ressources pédagogiques (Storage)
│   │
│   ├── data/
│   │   └── mockData.js                 # Menus par rôle, titres de pages
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   └── ProgrammeManager.jsx    # Gestion chapitres par admin
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx           # Shell — Sidebar + Topbar + Outlet
│   │   │   ├── Sidebar.jsx             # Navigation + photo de profil
│   │   │   └── Topbar.jsx             # Titre, notifications, CTA
│   │   ├── modals/
│   │   │   ├── CourseModal.jsx         # Ajout/édition créneau EDT
│   │   │   ├── RattrapageModal.jsx     # Demande de rattrapage
│   │   │   └── SessionDetailModal.jsx  # Détail séance + export PDF
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       └── Card.jsx
│   │
│   └── pages/
│       ├── LoginPage.jsx               # Connexion + inscription Supabase Auth
│       ├── DashboardPage.jsx           # Dashboard enseignant
│       ├── ProfilePage.jsx             # Photo + classes + matières + progression
│       ├── SaisiePage.jsx              # Formulaire séance + chapitres + GPS + signature
│       ├── EdtPage.jsx                 # Grille emploi du temps
│       ├── HistoriquePage.jsx          # Historique des séances
│       ├── RessourcesPage.jsx          # Bibliothèque pédagogique
│       ├── NotificationsPage.jsx       # Centre de notifications
│       ├── ConseillerPage.jsx          # Vue conseiller — suivi progression
│       └── AdminPage.jsx               # Administration complète
```

---

## 6. Base de données — Les 7 étapes

Chaque étape correspond à un bloc SQL dans `database.sql` à coller dans le SQL Editor de Supabase.

### Étape 1 — Authentification & Profils
**Table :** `profiles`

Extension de `auth.users` (Supabase Auth). Créée automatiquement par un trigger à chaque inscription.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Lié à `auth.users(id)` |
| `nom`, `prenom` | text | Identité |
| `email` | text | Email de connexion |
| `role` | text | `enseignant` / `conseiller` / `admin` |
| `matricule` | text | Numéro matricule |
| `avatar_url` | text | URL photo (Supabase Storage `avatars`) |
| `is_active` | boolean | Compte actif/désactivé |

**Trigger `handle_new_user()`** — crée le profil automatiquement à l'inscription en lisant les `raw_user_meta_data` (nom, prénom, rôle, matricule).

**RLS :** tout authentifié peut lire, chacun modifie son propre profil.

---

### Étape 2 — Classes & Photo de profil
**Tables :** `classes`, `profile_classes`

- `classes` — liste des classes du lycée (Terminale C, 1ère D…) avec seed data
- `profile_classes` — jointure N:N enseignant ↔ classes qu'il enseigne
- Storage policies pour le bucket `avatars`

**Usage React :** `useReferenceData(userId)` → `myClasses`, `saveMyClasses(ids)`

---

### Étape 3 — Séances pédagogiques
**Tables :** `sessions`, `session_competences`, `session_devoirs`

Table cœur métier. Chaque séance contient :
- Titre, contenu, matière, classe, date
- Type (Cours / TP / TD / Évaluation / Rattrapage)
- Effectif présent/total, progression, observations
- **Signature** (base64 PNG du canvas HTML5)
- **Géolocalisation** (lat/lng/time via `navigator.geolocation`)
- Compétences visées (table liée `session_competences`)
- Devoirs assignés (table liée `session_devoirs`)

**RLS :** enseignant voit/modifie ses séances ; conseiller/admin voient tout.

---

### Étape 3b — Ressources pédagogiques
**Table :** `resources`

Métadonnées des fichiers uploadés dans le bucket `resources`.

| Colonne | Description |
|---|---|
| `nom` | Nom du fichier |
| `type` | `pdf` / `video` / `image` / `lien` / `autre` |
| `url` | URL publique Supabase Storage |
| `taille` | Taille formatée (ex : "2.4 Mo") |
| `classe` | Classe associée (texte libre) |

**Usage React :** `useResources(userId)` → `uploadFile()`, `addLink()`, `deleteResource()`

---

### Étape 4 — Emploi du temps
**Table :** `courses`

Créneaux hebdomadaires de l'enseignant.

| Colonne | Description |
|---|---|
| `jour` | Lundi / Mardi… |
| `heure_debut`, `heure_fin` | Format `08h00` |
| `matiere`, `classe`, `salle` | Texte |
| `couleur` | `blue` / `teal` / `gold` / `coral` / `navy` |

**RLS :** enseignant CRUD ses cours ; admin/conseiller lecture seule.

---

### Étape 5 — Notifications
**Table :** `notifications`

Messagerie inter-rôles avec **Supabase Realtime** (les notifications apparaissent instantanément sans refresh).

| Colonne | Description |
|---|---|
| `from_user_id` | Expéditeur (UUID réel) |
| `to_user_id` | Destinataire (UUID réel) |
| `type` | `info` / `warn` / `success` |
| `title`, `body` | Contenu |
| `read` | Marqué comme lu |

**Realtime :** `NotificationsContext` souscrit au canal `notifs_${user.id}` et écoute les `INSERT`.

---

### Étape 6 — Rattrapages
**Table :** `rattrapages`

Demandes de rattrapage soumises par l'enseignant, traitées par l'admin.

| Colonne | Description |
|---|---|
| `teacher_id`, `teacher_name` | Enseignant demandeur |
| `classe`, `classe_id` | Classe concernée |
| `date_proposee`, `creneau` | Quand |
| `motif` | Raison du rattrapage |
| `status` | `pending` / `approved` / `rejected` |
| `decided_by`, `decided_at` | Admin qui a traité |

**Flux :** Enseignant soumet → notification admin → Admin approuve/rejette → notification retour enseignant.

---

### Étape 7 — Matières, Programmes & Progression
**Tables :** `matieres`, `profile_matieres`, `programmes`, `programme_chapitres`, `teacher_progress`

Système de suivi de progression basé sur les programmes officiels définis par l'admin.

**`matieres`** — liste des matières (seed data : Mathématiques, Physique-Chimie, Informatique, Français, Histoire-Géo, Anglais, SVT, Philosophie)

**`profile_matieres`** — jointure N:N enseignant ↔ matières qu'il enseigne

**`programmes`** — programme officiel par (classe, matière, année). Ex : Terminale C × Mathématiques × 2024-2025

**`programme_chapitres`** — chapitres d'un programme, ordonnés. Ex :
- Chap 1 — Les fonctions
- Chap 2 — Les algorithmes
- Chap 3 — Les probabilités

**`teacher_progress`** — chapitres couverts par chaque enseignant. Lié à la séance qui a couvert le chapitre.

**Calcul progression :** `COUNT(teacher_progress) / COUNT(programme_chapitres) × 100`

---

## 7. Contextes React

Les 5 contextes sont imbriqués dans `main.jsx` dans cet ordre :

```
AuthProvider
  └─ EdtProvider
       └─ SessionsProvider
            └─ NotificationsProvider
                 └─ RattrapagesProvider
                      └─ <App />
```

### AuthContext
- `user` — objet utilisateur complet (id, nom, prénom, role, email, matricule, avatar_url, av)
- `loading` — true pendant la vérification de session au démarrage
- `signIn(email, password)` — `supabase.auth.signInWithPassword()`
- `signUp(email, password, metadata)` — `supabase.auth.signUp()` + trigger crée le profil
- `signOut()` / `logout()` — déconnexion Supabase
- `login(role)` — connexion rapide démo avec `enseignant@ctn.cm` / `conseiller@ctn.cm` / `admin@ctn.cm`
- `refreshProfile()` — recharge le profil sans déconnecter (utilisé après upload photo)
- **Persistance :** `onAuthStateChange` + `getSession()` au démarrage

### SessionsContext
- `sessions` — tableau de toutes les séances (filtrées par RLS)
- `addSession(data)` — insert session + compétences + devoirs
- `updateSession(id, data)` — update + supprime/réinsère compétences/devoirs
- `getTeacherSessions(teacherId)` — filtre local
- `fetchSessions()` — recharge depuis Supabase

### EdtContext
- `courses` — tous les créneaux (filtrés par RLS)
- `addCourse(teacherId, formData)` — insert
- `updateCourse(teacherId, id, formData)` — update
- `deleteCourse(teacherId, id)` — delete
- `getCoursesForTeacher(teacherId)` — filtre local

### NotificationsContext
- `notifications` — toutes les notifs de l'utilisateur connecté
- `unreadCountFor()` — compte des non lues (utilisé dans la sidebar)
- `markOneRead(id)` / `markAllRead()` — update en base
- `sendNotification({ toUserId, type, title, body })` — insert en base
- **Realtime :** souscription au canal `notifs_${user.id}` — nouvelles notifs sans refresh

### RattrapagesContext
- `rattrapages` — toutes les demandes (RLS : enseignant voit les siennes, admin voit tout)
- `addRattrapage(data)` — insert avec statut `pending`
- `updateStatus(id, status, decidedById)` — admin approuve/rejette
- `getPending()` — filtre local sur `status === 'pending'`

---

## 8. Hooks personnalisés

### useReferenceData(userId)
Charge classes et matières depuis Supabase, filtre celles assignées à l'utilisateur.

```js
const {
  classes,        // toutes les classes du lycée
  myClasses,      // classes assignées à cet enseignant
  matieres,       // toutes les matières
  myMatieres,     // matières assignées à cet enseignant
  loading,
  getClasseIdByName(nom),   // → uuid
  getMatiereIdByName(nom),  // → uuid
  saveMyClasses(ids),       // sauvegarde en DB
  saveMyMatieres(ids),      // sauvegarde en DB
} = useReferenceData(user.id);
```

### useProgramme()
Gestion des programmes officiels et de la progression.

```js
const {
  getProgramme(classeId, matiereId),             // lecture seule
  getOrCreateProgramme(classeId, matiereId, userId), // crée si inexistant
  addChapitre(programmeId, titre, desc, ordre),
  updateChapitre(id, updates),
  deleteChapitre(id),
  getDoneChapitreIds(teacherId, programmeId),    // → [uuid, ...]
  getProgressPct(teacherId, programmeId),        // → { pct, done, total }
  markChapitre(teacherId, chapitreId, sessionId), // marque comme couvert
  unmarkChapitre(teacherId, chapitreId),
} = useProgramme();
```

### useResources(userId)
Gestion des ressources pédagogiques (Storage + DB).

```js
const {
  resources,      // liste depuis DB
  loading,
  uploading,
  uploadFile(file, classe),   // upload Storage + insert DB
  addLink({ nom, url, classe }), // insert DB uniquement
  deleteResource(resource),   // delete DB + Storage
  stats,          // { pdf, video, image, lien, total }
} = useResources(user.id);
```

---

## 9. Pages & fonctionnalités

### LoginPage `/` (non authentifié)
- Connexion email/password → `supabase.auth.signInWithPassword()`
- Inscription → `supabase.auth.signUp()` avec métadonnées (nom, prénom, rôle, matricule)
- 3 boutons démo rapide → `enseignant@ctn.cm`, `conseiller@ctn.cm`, `admin@ctn.cm`
- **Important :** désactiver la confirmation email dans Supabase pour les tests

### ProfilePage `/profil` (enseignant uniquement)
- **Photo de profil** — upload vers bucket `avatars`, URL stockée dans `profiles.avatar_url`
- **Informations personnelles** — lecture seule (nom, email, matricule, rôle)
- **Résumé affectation** — carte affichant classes et matières assignées
- **Classes enseignées** — checkboxes depuis DB + recherche → sauvegardé dans `profile_classes`
- **Matières enseignées** — checkboxes depuis DB + recherche → sauvegardé dans `profile_matieres`
- **Progression par programme** — une carte par combinaison (classe × matière) avec barre de progression et liste des chapitres

### SaisiePage `/saisie` (enseignant)
- **En-tête** — enseignant auto-rempli, matière (dropdown `myMatieres`), classe (dropdown `myClasses`)
- **Programme officiel** — chapitres chargés depuis DB quand classe + matière changent ; barre de progression ; enseignant sélectionne le chapitre du jour
- **Contenu** — titre, sous-titre, plan, textarea, compétences (chips + suggestions), devoirs
- **Ressources** — bouton import fichier (PC et mobile) + ajout lien
- **Infos complémentaires** — type séance, effectif, progression, observations
- **Validation** — canvas signature HTML5 (souris + tactile) + GPS obligatoire
- **À la validation** — insert DB + marque le chapitre comme couvert dans `teacher_progress`

### EdtPage `/edt` (enseignant + admin)
- Grille hebdomadaire (Lundi→Vendredi, 4 créneaux)
- Créneaux remplis : fond coloré, matière en couleur, classe, pastille salle
- Créneaux vides : `+` centré, hover crème
- Clic → `CourseModal` avec classe chargée depuis `profile_classes`
- `key={modalKey}` force le remount à chaque ouverture (formulaire toujours vierge)

### HistoriquePage `/historique` (tous les rôles)
- Tableau des séances depuis Supabase
- Filtres par classe et période
- Clic → `SessionDetailModal` avec export PDF

### RessourcesPage `/ressources` (enseignant)
- Bouton "Importer" → `<input type="file">` (PC et mobile)
- Upload vers bucket `resources` → métadonnées en DB
- Ajout de lien externe
- Recherche + filtre par type
- Suppression (DB + Storage)
- Statistiques en temps réel

### NotificationsPage `/notifications` (tous)
- Liste des notifications depuis Supabase
- Destinataires chargés depuis `profiles` (vrais comptes)
- Formulaire d'envoi → `sendNotification({ toUserId, type, title, body })`
- Marquage lu/non lu persisté en base
- **Realtime :** badge sidebar mis à jour instantanément

### ConseillerPage `/conseiller` (conseiller + admin)
- Stats en temps réel (nb enseignants, progression moyenne, retards, séances)
- Tableau de progression : enseignants depuis `profiles`, sessions comptées depuis `sessions`
- Objectif : 20 séances par trimestre → calcul progression automatique
- Alertes : enseignants < 50% de progression
- Timeline : 10 dernières séances depuis Supabase
- Recherche enseignants en temps réel

### AdminPage `/admin` (admin)
- **Stats** — enseignants actifs, séances, total utilisateurs (depuis DB)
- **Gestion utilisateurs** — liste depuis `profiles`, recherche par nom/email/matricule/rôle, activation/désactivation
- **Cahiers de textes** — 20 dernières séances avec noms enseignants réels
- **Rattrapages** — approuver/rejeter avec notification retour enseignant
- **EDT enseignants** — select chargé depuis DB → affiche `EdtPage` en lecture/écriture
- **Programmes officiels** — composant `ProgrammeManager` : sélectionner classe + matière → CRUD chapitres

---

## 10. Flux métier détaillés

### Flux authentification
```
LoginPage → signIn() → supabase.auth.signInWithPassword()
  → onAuthStateChange → fetchProfile() → profiles table
  → setUser({ id, nom, prénom, rôle, avatar_url, ... })
  → RoleRedirect → première page du menu selon rôle
```

### Flux saisie de séance
```
SaisiePage
  → sélectionne classe (myClasses) + matière (myMatieres)
  → getProgramme(classeId, matiereId) → charge chapitres
  → getDoneChapitreIds() → barre de progression
  → rempli le formulaire
  → canvas signature + GPS obligatoires
  → "Signer et Valider"
    → addSession(sessionData) → sessions + competences + devoirs en DB
    → markChapitre(teacherId, chapitreId) → teacher_progress en DB
    → navigate('/historique')
```

### Flux rattrapage
```
RattrapageModal (enseignant)
  → sélectionne classe (myClasses), date, créneau, motif
  → addRattrapage() → rattrapages table (status: pending)
  → sendNotification(adminId) → notifications table
  → admin reçoit en temps réel (Realtime)

AdminPage (admin)
  → voit demande dans liste
  → handleRattrapageAction('approved' | 'rejected')
  → updateStatus() → rattrapages table (status: approved/rejected)
  → sendNotification(teacherId) → notification retour
  → enseignant reçoit en temps réel
```

### Flux programme & progression
```
AdminPage → ProgrammeManager
  → sélectionne classe + matière
  → getOrCreateProgramme() → programmes table
  → addChapitre(titre, desc, ordre) → programme_chapitres table

ProfilePage (enseignant)
  → loadProgress()
    → getProgramme(classeId, matiereId)
    → getDoneChapitreIds(teacherId)
    → calcule pct = done / total × 100
    → affiche cartes avec barres de progression

SaisiePage (enseignant)
  → sélectionne classe + matière → chapitres chargés
  → coche le chapitre du jour
  → à la validation → markChapitre() → teacher_progress table
```

---

## 11. Comptes de démonstration

Créer ces comptes dans **Supabase → Authentication → Users → Add user** :

| Email | Mot de passe | Rôle à définir dans `profiles` |
|---|---|---|
| `enseignant@ctn.cm` | `Demo@1234` | `enseignant` |
| `conseiller@ctn.cm` | `Demo@1234` | `conseiller` |
| `admin@ctn.cm` | `Demo@1234` | `admin` |

> Après création, aller dans **Table Editor → profiles** et définir manuellement le champ `role` pour chaque compte.

> Désactiver la confirmation email : **Authentication → Settings → Email → décocher "Confirm email"**.

---

## 12. Ce qui reste à faire

### Priorité haute
- [x] ~~**Upload ressources dans SaisiePage**~~ — ✅ Résolu : fichiers et liens uploadés vers Supabase Storage à la validation, liés à la séance via `session_id`
- [ ] **Barre de progression ConseillerPage** — connecter à `teacher_progress` pour afficher la vraie progression par programme au lieu du calcul basé sur le nombre de séances

### Priorité moyenne
- [ ] **Historique des rattrapages** — page de suivi pour l'enseignant (voir statut de ses demandes)
- [ ] **Recherche et filtres** — `HistoriquePage` : barres de recherche non câblées sur Supabase
- [ ] **Skeletons/spinners** — états de chargement uniformes sur toutes les pages
- [ ] **Gestion d'erreurs** — `ErrorBoundary` React + toast sur erreurs Supabase

### Priorité basse
- [ ] **Mode hors ligne** — cache local pour les enseignants avec réseau instable
- [ ] **Tests** — Jest + React Testing Library sur les composants critiques
- [ ] **PWA** — Service Worker pour installation mobile
- [ ] **Accessibilité** — ARIA labels, navigation clavier

---

## 13. Séance de développement — 02 mai 2026

### Améliorations réalisées

#### Ressources pédagogiques — Bibliothèque
- **Lien ressources ↔ séances** : ajout de `session_id` (FK nullable) sur la table `resources`
- **Upload câblé dans SaisiePage** : les fichiers et liens attachés lors de la saisie d'une séance sont désormais uploadés vers Supabase Storage et liés à la séance via `session_id`
- **Vue "Par séance"** dans `RessourcesPage` : les ressources sont groupées sous l'en-tête de leur séance (titre, date, matière, classe). Les ressources sans séance tombent dans "Bibliothèque générale"
- **Vue "Historique"** (groupée par mois) et **Vue "Liste"** (plate)
- **Filtre par classe** extrait dynamiquement des données réelles
- **Tri** : récent, ancien, nom A→Z, par type
- **Fiche détail** au clic avec suppression et confirmation en 2 temps
- **Badges colorés** par type de ressource (PDF, Vidéo, Image, Lien)
- **URL visible** directement sur chaque carte ressource

#### Tableau de bord
- **Stats connectées** à Supabase : séances documentées, taux de signature, classes en charge, rattrapages en attente — avec **compteurs animés** (0 → valeur réelle)
- **Bandeau de bienvenue** personnalisé (salutation selon l'heure, prénom de l'enseignant)
- **Séances récentes** depuis la vraie table `sessions` : date, titre, classe, compétences, badge signé/non signé
- **Alertes réelles** : rattrapages `pending` + séances non signées
- **Prochain cours** calculé depuis l'EDT réel (cherche le prochain créneau à partir de l'heure actuelle)
- **Notifications non lues** : badge et carte si non lues
- **Progression par classe** : affiche les vraies classes assignées (valeurs % à venir)

#### Page de saisie
- Renommage : "Grand titre de la leçon" → **"Unité d'apprentissage"**, "Sous-titre / Chapitre" → **"Unité d'enseignement"**
- Réorganisation : les **Compétences visées** remontent juste après "Unité d'enseignement"

#### Fiche de Progression (nouvelle fonctionnalité)
- **Nouvel onglet "▣ Fiche de Progression"** dans la sidebar enseignant
- **Table SQL** `fiches_progression` : dépôt de fichiers PDF/Word/Excel par classe et par année scolaire
- **Barre de complétion globale** (X% des classes avec fiche déposée)
- **Sélecteur d'année scolaire** (2024-2025, 2025-2026, 2026-2027)
- Actions par carte classe : Télécharger, Remplacer, Supprimer (avec confirmation)

#### Extraction intelligente de fiche de progression
- **Table SQL** `fiches_progression_contenu` (JSONB) : stocke le tableau extrait ligne par ligne
- **Hook `useExtractionFiche`** : extraction PDF via `pdfjs-dist`, OCR image via `Tesseract.js`
- **Algorithme de parsing robuste** :
  - Déduplication des items dupliqués (artefacts PDF multi-couches)
  - Ancrage sur les **numéros de semaine** (1–52) pour ignorer l'en-tête du document
  - Détection adaptative des colonnes depuis la vraie ligne d'en-tête du tableau
  - Propagation des cellules fusionnées (Trimestre, Module, UA, Énoncé)
- **Composant `FicheTableauDynamique`** :
  - En-tête double niveau ("Nature" → LT/LP + LD)
  - Cellules fusionnées avec `rowspan` automatique
  - Texte vertical pour colonnes Module et UA
  - Édition au clic de chaque cellule (propagation aux lignes du groupe pour cellules fusionnées)
  - Déplacer / Insérer / Supprimer des lignes
  - Sauvegarde en base (JSONB) + rechargement automatique

### Nouvelles tables SQL (à exécuter dans Supabase)

```sql
-- Session_id sur resources
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;

-- Fiches de progression (fichiers)
CREATE TABLE public.fiches_progression ( ... ); -- voir database.sql Étape 8

-- Contenu dynamique extrait
CREATE TABLE public.fiches_progression_contenu ( ... ); -- voir database.sql Étape 9
```

### Nouvelles dépendances

```json
{
  "pdfjs-dist": "^5.7.284",
  "tesseract.js": "^6.x"
}
```

### Nouveaux fichiers

| Fichier | Description |
|---|---|
| `src/hooks/useProgression.js` | Upload/fetch/delete des fiches de progression (fichiers) |
| `src/hooks/useExtractionFiche.js` | Extraction PDF/image + parsing intelligent + sauvegarde |
| `src/hooks/useResources.js` | Mis à jour : `session_id` + fetch avec données de séance |
| `src/pages/ProgressionPage.jsx` | Page complète : fiches + tableau dynamique |
| `src/components/FicheTableauDynamique.jsx` | Tableau éditable avec rowspan, texte vertical, tri |

---

## Dépendances

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.103.3",
    "html2pdf.js": "^0.14.0",
    "pdfjs-dist": "^5.7.284",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.14.0",
    "tesseract.js": "^6.0.0"
  }
}
```

---

> Développé avec Claude Code pour le système éducatif camerounais.
