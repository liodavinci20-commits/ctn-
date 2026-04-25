# 📓 CTN Lycée — Cahier de Texte Numérique

> **Application de gestion pédagogique** permettant aux enseignants de documenter leurs séances, aux conseillers pédagogiques de suivre la progression, et aux administrateurs de piloter l'ensemble du système éducatif d'un lycée.

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Ready-3ECF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)

---

## 📋 Table des matières

1. [Présentation du projet](#-présentation-du-projet)
2. [Fonctionnalités principales](#-fonctionnalités-principales)
3. [Architecture du projet](#-architecture-du-projet)
4. [Fonctionnement global](#-fonctionnement-global)
5. [Composants clés](#-composants-clés)
6. [Gestion des données](#-gestion-des-données)
7. [Authentification](#-authentification)
8. [Base de données Supabase](#-base-de-données-supabase)
9. [Design System](#-design-system)
10. [Installation & Lancement](#-installation--lancement)
11. [Points forts & limites](#-points-forts--limites)
12. [Suggestions d'amélioration](#-suggestions-damélioration)

---

## 🎯 Présentation du projet

**CTN Lycée** (Cahier de Texte Numérique) est une application web complète dédiée à la gestion pédagogique des lycées camerounais. Elle remplace le cahier de texte papier traditionnel par une plateforme numérique qui garantit :

- **La traçabilité** : chaque séance est horodatée et géolocalisée
- **La transparence** : les conseillers pédagogiques et l'administration ont une vue en temps réel
- **L'archivage** : conservation légale des données sur 5 ans minimum
- **La responsabilisation** : signature numérique manuscrite obligatoire

Le projet est actuellement en **phase de prototype fonctionnel** avec données simulées (mock data), et dispose d'un schéma de base de données SQL complet prêt à être déployé sur **Supabase**.

---

## ✨ Fonctionnalités principales

### 👨‍🏫 Enseignant
| Fonctionnalité | Description |
|---|---|
| **Saisie de séance** | Formulaire complet avec titre, contenu, compétences, devoirs, type de séance, effectif, progression |
| **Signature manuscrite** | Canvas interactif (souris + tactile) pour signer numériquement chaque séance |
| **Géolocalisation GPS** | Capture automatique des coordonnées (lat/lng) pour prouver la présence physique |
| **Emploi du temps** | Grille hebdomadaire éditable avec CRUD complet des créneaux |
| **Historique** | Tableau des séances saisies avec filtres (classe, période) |
| **Ressources** | Bibliothèque de documents PDF, vidéos, liens |
| **Export PDF** | Génération de fiches de séance au format PDF via `html2pdf.js` |
| **Demande de rattrapage** | Formulaire de soumission avec notification automatique à l'administration |

### 👩‍💼 Conseiller Pédagogique
| Fonctionnalité | Description |
|---|---|
| **Vue globale** | Statistiques agrégées (28 enseignants, progression moyenne, retards) |
| **Suivi par enseignant** | Tableau de progression avec barres visuelles et statuts |
| **Alertes de retard** | Identification des enseignants en retard dans leur programme |
| **Chronologie** | Timeline des séances avec statuts (validé / en retard) |
| **Actions rapides** | Planification de rattrapages, notifications, export de rapports |

### 🔧 Administrateur
| Fonctionnalité | Description |
|---|---|
| **Gestion des utilisateurs** | CRUD des comptes avec rôles (Enseignant, Conseiller, Admin) |
| **Contrôle des cahiers** | Surveillance en temps réel de toutes les séances saisies |
| **Gestion des rattrapages** | Approbation / Rejet des demandes avec notification à l'enseignant |
| **Édition des EDT** | Visualisation et modification des emplois du temps de n'importe quel enseignant |
| **Modules admin** | Gestion des classes, filières, programmes officiels, archivage légal |

### 🔔 Système transversal
- **Notifications inter-rôles** : Centre de messagerie avec envoi/réception typé (info, alerte, confirmation)
- **Toast notifications** : Messages éphémères visuels pour les actions réussies/échouées
- **Navigation dynamique** : Menu latéral adapté au rôle de l'utilisateur connecté

---

## 🏗 Architecture du projet

```
ctn-app/
├── public/
│   ├── favicon.svg                    # Icône de l'application
│   └── icons.svg                      # Sprite SVG des icônes
│
├── src/
│   ├── main.jsx                       # Point d'entrée — Providers imbriqués
│   ├── App.jsx                        # Routeur principal — Gestion des rôles
│   ├── App.css                        # Styles spécifiques (complémentaires)
│   ├── index.css                      # Design system complet (752 lignes)
│   │
│   ├── context/                       # ── Gestion d'état globale (React Context) ──
│   │   ├── AuthContext.jsx            # Auth mock — login par rôle, localStorage
│   │   ├── EdtContext.jsx             # CRUD emploi du temps (par enseignant)
│   │   ├── SessionsContext.jsx        # CRUD séances pédagogiques
│   │   ├── NotificationsContext.jsx   # Notifications inter-rôles
│   │   └── RattrapagesContext.jsx     # Demandes de rattrapage
│   │
│   ├── data/
│   │   └── mockData.js               # Données statiques : USERS, MENUS, PAGE_TITLES
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx          # Shell principal — Sidebar + Topbar + Outlet
│   │   │   ├── Sidebar.jsx            # Navigation latérale adaptée au rôle
│   │   │   └── Topbar.jsx             # Barre supérieure — titre, notifications, CTA
│   │   │
│   │   ├── modals/
│   │   │   ├── CourseModal.jsx        # Ajout / édition d'un cours dans l'EDT
│   │   │   ├── RattrapageModal.jsx    # Formulaire de demande de rattrapage
│   │   │   └── SessionDetailModal.jsx # Fiche détaillée d'une séance + export PDF
│   │   │
│   │   └── ui/
│   │       ├── Badge.jsx              # Badge réutilisable (success, warning, danger…)
│   │       └── Card.jsx               # Carte avec header optionnel
│   │
│   └── pages/
│       ├── LoginPage.jsx              # Connexion + Inscription + Démo rapide
│       ├── DashboardPage.jsx          # Tableau de bord enseignant
│       ├── SaisiePage.jsx             # Formulaire de saisie de séance (445 lignes)
│       ├── EdtPage.jsx                # Emploi du temps hebdomadaire interactif
│       ├── HistoriquePage.jsx         # Historique des séances avec tableau
│       ├── RessourcesPage.jsx         # Bibliothèque de fichiers pédagogiques
│       ├── NotificationsPage.jsx      # Centre de notifications + envoi de messages
│       ├── ConseillerPage.jsx         # Vue conseiller — suivi global
│       └── AdminPage.jsx              # Administration système
│
├── database.sql                       # Schéma SQL complet pour Supabase (816 lignes)
├── package.json                       # Dépendances et scripts
├── vite.config.js                     # Configuration Vite
└── index.html                         # HTML racine
```

### Organisation du code

| Couche | Rôle |
|---|---|
| `context/` | **State management** — 5 contextes React imbriqués pour l'état global |
| `data/` | **Données statiques** — Utilisateurs mock, menus par rôle, titres de pages |
| `components/layout/` | **Structure de l'app** — Sidebar, Topbar, AppLayout (shell) |
| `components/modals/` | **Dialogues** — Modales CRUD pour cours, rattrapages, détails de séance |
| `components/ui/` | **Primitives UI** — Badge, Card |
| `pages/` | **Pages métier** — 9 pages correspondant aux routes |

---

## ⚙ Fonctionnement global

### Flux de données (Architecture actuelle — Prototype)

```
┌─────────────────────────────────────────────────────────────────┐
│                        main.jsx                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  AuthProvider                                              │   │
│  │  └→ EdtProvider                                            │   │
│  │     └→ SessionsProvider                                    │   │
│  │        └→ NotificationsProvider                            │   │
│  │           └→ RattrapagesProvider                           │   │
│  │              └→ <App />                                    │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────┐
                         │  App.jsx │
                         └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         user === null    user !== null   <RoleRedirect>
              │               │           (→ menu[0].path)
        ┌─────┴─────┐   ┌────┴────┐
        │ LoginPage  │   │AppLayout│
        └────────────┘   │ ├─Sidebar
                         │ ├─Topbar
                         │ └─<Outlet>──→ Pages…
                         └─────────┘
```

### Routing (React Router v7)

| Route | Composant | Rôle |
|---|---|---|
| `*` (non auth) | `LoginPage` | Page de connexion/inscription |
| `/` | `RoleRedirect` | Redirection vers la 1ère entrée du menu selon le rôle |
| `/dashboard` | `DashboardPage` | Tableau de bord |
| `/saisie` | `SaisiePage` | Formulaire de saisie de séance |
| `/edt` | `EdtPage` | Emploi du temps |
| `/historique` | `HistoriquePage` | Archives des séances |
| `/ressources` | `RessourcesPage` | Bibliothèque pédagogique |
| `/notifications` | `NotificationsPage` | Centre de notifications |
| `/conseiller` | `ConseillerPage` | Vue conseiller pédagogique |
| `/admin` | `AdminPage` | Administration générale |

### Flux d'interactions typiques

**1. Saisie d'une séance (enseignant) :**
```
SaisiePage → Remplir formulaire → Signer sur canvas → Cliquer "Valider"
  → navigator.geolocation.getCurrentPosition()
  → canvas.toDataURL('image/png')  // signature en base64
  → addSession(sessionData)        // dans SessionsContext
  → showToast("Séance validée !")
  → navigate('/historique')
```

**2. Demande de rattrapage (enseignant → admin) :**
```
RattrapageModal → Saisir motif, date, créneau → "Envoyer"
  → addRattrapage(data)            // dans RattrapagesContext
  → sendNotification(to: 'admin')  // dans NotificationsContext
  → showToast("Demande envoyée")
```

**3. Approbation d'un rattrapage (admin) :**
```
AdminPage → Section Rattrapages → "Approuver"
  → updateStatus(ratt.id, 'approved')
  → sendNotification(to: enseignant, "Rattrapage approuvé")
```

---

## 🧩 Composants clés

### Pages (Smart Components)

| Composant | Lignes | Rôle | Dépendances contextes |
|---|---|---|---|
| `SaisiePage` | 445 | Formulaire complet de saisie de séance avec canvas signature + géolocalisation | `AuthContext`, `SessionsContext` |
| `LoginPage` | 282 | Connexion (matricule/mdp) + inscription + démo rapide par rôle | `AuthContext` |
| `AdminPage` | 221 | Administration : utilisateurs, rattrapages, EDT, surveillance | `SessionsContext`, `RattrapagesContext`, `NotificationsContext` |
| `NotificationsPage` | 202 | Centre de messagerie inter-rôles | `AuthContext`, `NotificationsContext` |
| `ConseillerPage` | 145 | Tableau de bord de suivi pédagogique global | (données mock inline) |
| `DashboardPage` | 138 | Dashboard enseignant avec stats, séances récentes, alertes | `AuthContext` |
| `EdtPage` | 138 | Grille emploi du temps hebdomadaire interactive | `AuthContext`, `EdtContext` |
| `HistoriquePage` | 93 | Tableau des séances avec recherche et filtres | `AuthContext`, `SessionsContext` |
| `RessourcesPage` | 93 | Bibliothèque de fichiers pédagogiques | (données mock inline) |

### Composants structurants

| Composant | Rôle |
|---|---|
| `AppLayout` | Shell de l'app : Sidebar + Topbar + `<Outlet>`. Gère les toasts globaux et le modal de rattrapage. |
| `Sidebar` | Navigation latérale : menu dynamique selon `MENUS[user.id]`, badge de notifications non lues. |
| `Topbar` | Barre supérieure : titre de page dynamique via `PAGE_TITLES`, boutons d'action conditionnels par rôle. |

### Modales

| Composant | Rôle |
|---|---|
| `SessionDetailModal` | Fiche détaillée d'une séance : titre, contenu, compétences, devoirs, géolocalisation, signature, export PDF (`html2pdf.js`). |
| `CourseModal` | Formulaire d'ajout/édition/suppression d'un créneau dans l'emploi du temps. |
| `RattrapageModal` | Formulaire de demande de rattrapage avec notification automatique à l'admin. |

---

## 🔄 Gestion des données

### State Management — React Context API

L'application utilise **5 Context Providers** imbriqués dans `main.jsx` :

```
AuthProvider          →  user, login(role), logout()
  EdtProvider         →  getCoursesForTeacher(), addCourse(), updateCourse(), deleteCourse()
    SessionsProvider  →  sessions, getTeacherSessions(), addSession(), updateSession()
      NotificationsProvider  →  getNotificationsFor(), sendNotification(), markAllRead(), markOneRead()
        RattrapagesProvider  →  rattrapages, addRattrapage(), updateStatus(), getPending()
```

### Flux de données par contexte

| Contexte | Données | Persistance | API exposée |
|---|---|---|---|
| `AuthContext` | Utilisateur courant | `localStorage` (`ctn_user`) | `user`, `login(role)`, `logout()` |
| `EdtContext` | Emplois du temps par enseignant | RAM (état React) | CRUD par `teacherId` |
| `SessionsContext` | Séances pédagogiques | RAM (état React) | `addSession()`, `updateSession()`, `getTeacherSessions()` |
| `NotificationsContext` | Notifications inter-rôles | RAM (état React) | `sendNotification()`, `markAllRead()`, compteur unread |
| `RattrapagesContext` | Demandes de rattrapage | RAM (état React) | `addRattrapage()`, `updateStatus()`, `getPending()` |

### Données statiques (`mockData.js`)

| Export | Contenu |
|---|---|
| `USERS` | 3 profils prédéfinis : enseignant (Dr. Kamga), conseiller (Mme. Essomba), admin (Directeur) |
| `MENUS` | Navigation différenciée par rôle (6 items enseignant, 5 items conseiller/admin) |
| `PAGE_TITLES` | Titres et sous-titres de page pour la Topbar |

---

## 🔐 Authentification

### État actuel (Prototype)

L'authentification est **simulée** via un système mock :

1. **Connexion par rôle** : L'utilisateur sélectionne un profil (Enseignant / Conseiller / Admin) et clique "Se connecter"
2. **Démo rapide** : 3 boutons permettent une connexion instantanée sans remplir de formulaire
3. **Inscription simulée** : Formulaire complet avec champs (nom, prénom, email, matricule, mot de passe) — affiche un `alert()` de confirmation
4. **Persistance** : L'utilisateur est stocké dans `localStorage` sous `ctn_user` pour survivre aux rechargements
5. **Déconnexion** : Suppression du localStorage et reset de l'état React

### Schéma de base de données prévu (Supabase)

Le fichier `database.sql` prévoit une authentification complète :

- **`auth.users`** : Gérée nativement par Supabase Auth
- **`public.profiles`** : Table extension liée via `id → auth.users(id)` avec rôle, matricule, grade, établissement
- **Trigger `handle_new_user()`** : Création automatique du profil dans `profiles` à l'inscription via Supabase Auth, en extrayant `nom`, `prénom`, `role`, `matricule` des `raw_user_meta_data`

---

## 🗄 Base de données Supabase

Le fichier `database.sql` (816 lignes) contient le schéma complet prêt pour Supabase.

### Schéma relationnel

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  etablissements   │───→│  annees_scolaires │    │     matieres      │
└────────┬─────────┘    └──────────────────┘    └────────┬─────────┘
         │                                               │
         │              ┌──────────────────┐             │
         └──────────────│     profiles      │─────────────┘
                        │ (auth.users → FK) │     N:N via
                        └────────┬─────────┘  profile_matieres
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
   ┌──────────┴──────┐  ┌───────┴───────┐  ┌───────┴───────┐
   │     courses      │  │   sessions     │  │  notifications │
   │  (Emploi du      │  │  (Séances      │  │  (Messages     │
   │   temps)         │  │   pédagogiques) │  │   inter-rôles) │
   └──────────────────┘  └───────┬────────┘  └────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
   ┌──────────┴──────┐  ┌───────┴───────┐  ┌───────┴───────┐
   │ session_         │  │ session_       │  │ session_       │
   │ competences      │  │ devoirs        │  │ resources      │
   └──────────────────┘  └───────────────┘  └───────┬───────┘
                                                     │
                                            ┌────────┴───────┐
                                            │   resources     │
                                            │  (Bibliothèque) │
                                            └────────────────┘
   ┌──────────────────┐
   │   rattrapages     │ (Demandes enseignant → admin)
   └──────────────────┘
```

### Tables (14 tables)

| # | Table | Description |
|---|---|---|
| 1 | `etablissements` | Lycées (nom, ville, région, code) |
| 2 | `annees_scolaires` | Périodes scolaires pour archivage |
| 3 | `profiles` | Extension de `auth.users` — rôle, matricule, grade, avatar |
| 4 | `classes` | Classes (Terminale C, 1ère D…) avec effectif |
| 5 | `matieres` | Matières enseignées |
| 6 | `profile_matieres` | Jointure N:N enseignant ↔ matières |
| 7 | `courses` | Emploi du temps : créneaux hebdomadaires |
| 8 | `sessions` | **Table cœur métier** — séances pédagogiques avec géolocalisation et signature |
| 9 | `session_competences` | Compétences visées par séance |
| 10 | `session_devoirs` | Devoirs assignés par séance |
| 11 | `resources` | Bibliothèque de fichiers (PDF, vidéo, liens) |
| 12 | `session_resources` | Jointure séance ↔ ressource |
| 13 | `notifications` | Messages inter-rôles |
| 14 | `rattrapages` | Demandes de rattrapage (pending/approved/rejected) |

### Sécurité — Row Level Security (RLS)

Toutes les 14 tables ont RLS activé avec des politiques granulaires :

| Principe | Mise en œuvre |
|---|---|
| **Enseignant** | Lit/écrit uniquement ses propres données (séances, EDT, ressources) |
| **Conseiller** | Lecture seule sur toutes les séances et EDT |
| **Admin** | Accès total en lecture/écriture sur toutes les tables |
| **Données référentielles** | Lecture autorisée pour tous les utilisateurs authentifiés (établissements, classes, matières) |
| **Notifications** | Chacun lit ses propres notifications ; tout authentifié peut en envoyer |

### Triggers et fonctions

| Trigger | Fonction | Rôle |
|---|---|---|
| `on_auth_user_created` | `handle_new_user()` | Crée automatiquement un profil dans `profiles` à l'inscription Supabase |
| `set_updated_at_profiles` | `update_updated_at()` | Met à jour `updated_at` à chaque modification de profil |
| `set_updated_at_sessions` | `update_updated_at()` | Met à jour `updated_at` à chaque modification de séance |

### Index de performance

**19 index** créés sur les colonnes les plus requêtées : `teacher_id`, `classe_id`, `date_cours DESC`, `status`, `to_user_id`, etc.

### Seed Data

Le script inclut des données initiales :
- 1 établissement : **Lycée Général Leclerc** (Yaoundé)
- 1 année scolaire : **2024–2025**
- 6 classes : Terminale C/D, 1ère C/D, 2nde C/A
- 8 matières : Mathématiques, Physique-Chimie, Informatique, Français, Histoire-Géo, Anglais, SVT, Philosophie

---

## 🎨 Design System

### Typographie
- **Titres** : [Syne](https://fonts.google.com/specimen/Syne) (Geometric sans-serif, 400–800)
- **Corps** : [DM Sans](https://fonts.google.com/specimen/DM+Sans) (300–600)

### Palette de couleurs

| Token | Hex | Utilisation |
|---|---|---|
| `--navy` | `#0D1B3E` | Couleur primaire, texte principal, sidebar |
| `--blue` | `#1B6CA8` | Accents, liens, badges info |
| `--gold` | `#C9933A` | Avertissements, accents dorés |
| `--teal` | `#1A8C7A` | Succès, progression positive |
| `--coral` | `#D95F4B` | Erreurs, retards, danger |
| `--cream` | `#F5F2EA` | Fond principal de l'app |

### Composants CSS documentés
Cards, Badges, Buttons, Tables, Progress bars, Alerts, Timeline, Modals, Forms, Calendar grid, EDT grid, Toast notifications, Drop zones, Chips, Search bars — **tous entièrement stylisés en Vanilla CSS** (752 lignes).

### Responsive
- 4 breakpoints : `1200px`, `900px`, `768px`, `480px`
- Sidebar se réduit à 70px (icônes seules) sous 768px
- Grilles se passent en colonne unique sous 1200px
- Login : la partie gauche (branding) disparaît sous 480px

---

## 🚀 Installation & Lancement

### Prérequis
- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd ctn-app

# Installer les dépendances
npm install
```

### Lancement en développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`.

### Build de production

```bash
npm run build
npm run preview
```

### Connexion rapide

Sur la page de login, utilisez les boutons **"Démonstration rapide"** :
- 🟢 **Enseignant** → Dashboard + Saisie de séances
- 🔵 **Conseiller** → Vue globale pédagogique
- 🟡 **Admin** → Administration complète

---

## 💪 Points forts

| Point fort | Détails |
|---|---|
| **Architecture claire** | Séparation nette context / pages / components / data |
| **UI premium** | Design soigné avec palette harmonieuse, micro-animations, glassmorphism |
| **Multi-rôle complet** | 3 rôles avec menus, permissions et vues distinctes |
| **Géolocalisation** | Preuve de présence physique lors de la validation des séances |
| **Signature manuscrite** | Canvas HTML5 avec support tactile |
| **Export PDF** | Génération de fiches de séance au format PDF |
| **SQL prêt pour production** | 816 lignes avec tables, RLS, triggers, index, seed data |
| **Responsive** | 4 breakpoints, navigation adaptative |
| **Notifications inter-rôles** | Système de messagerie complet avec compteur |

## ⚠ Limites actuelles

| Limite | Impact |
|---|---|
| **Données mock** | Toutes les données sont en mémoire React (perdues au refresh, sauf auth) |
| **Pas de backend connecté** | Supabase n'est pas encore intégré côté React |
| **Auth simulée** | Pas de vraie authentification (email/mot de passe) |
| **Pas d'upload réel** | Le drag & drop de fichiers est uniquement visuel |
| **Barre de recherche non fonctionnelle** | Les champs de recherche/filtres sont présents mais non câblés |
| **Données métier hardcodées** | Progression, statistiques, enseignants dans ConseillerPage sont en dur |
| **Pas de validation formulaire côté client** | Peu de validations au-delà du `required` HTML |
| **Pas de tests** | Aucun test unitaire ou d'intégration |

---

## 🚧 Processus en cours (Intégration Supabase)

**Phase 1 terminée : Migration Backend Core**
✅ **SDK & Client** : Configuration de `@supabase/supabase-js` branchée sur le projet.
✅ **Authentification** : Re-câblage complet de de `LoginPage.jsx` sur Supabase Auth (Connexion / Inscription).
✅ **Contextes de données** : Réecriture de tous les contextes (`Auth`, `Sessions`, `Edt`, `Notifications`, `Rattrapages`) remplaçant les données mockées par les tables PostgreSQL, en gérant le RLS et Realtime Notifications.
✅ **Données de référence** : Hook `useReferenceData` créé pour lier les formulaires de création aux vraies métadonnées (classes, matières).

**Prochaines étapes pour la reprise :**
1. 🔧 **Comptes de test** : Créer physiquement (`enseignant@ctn.cm`, `conseiller@ctn.cm`, `admin@ctn.cm` / Mdp : `Demo@1234`) depuis votre interface pour réanimer les boutons de démo rapide.
2. 🗂 **Storage (Bucket)** : Terminer l'intégration de l'upload réel des Fichiers Pédagogiques dans le bucket `resources` via la `SaisiePage` et la `RessourcesPage`.
3. 🧪 **Tests Live UI** : Lancer le portail `npm run dev`, vérifier qu'il n'y a pas de warning sur les props liés à la transition de structures d'objet et valider le cycle complet d'une séance (géolocalisation / canvas / insertion).

---

## 🔮 Suggestions d'amélioration

### 🔴 Priorité haute — Finalisation Production

1. **Storage** : Finaliser l'Upload de Fichiers Réel dans le bucket `resources` sur Supabase.
2. **Synchronisation Vues** : Mettre les pages `ConseillerPage` et `HistoriquePage` parfaitement à jour pour correspondre aux données relationnelles structurées.

### 🟡 Priorité moyenne — Qualité UX

5. **Validation de formulaire** : Ajouter une librairie comme `zod` ou `react-hook-form` pour la saisie de séance
6. **Recherche et filtres** : Câbler les barres de recherche (historique, ressources, notifications)
7. **Composants de chargement** : Ajouter des skeletons/spinners pour les appels réseau
8. **Gestion d'erreurs** : `ErrorBoundary` React + gestion des erreurs Supabase
9. **Mode hors ligne** : Cache local avec synchronisation (les enseignants peuvent avoir un réseau instable)

### 🟢 Priorité basse — Améliorations

10. **Tests** : Jest + React Testing Library pour les composants critiques
11. **Accessibilité** : ARIA labels, navigation au clavier, contraste
12. **Internationalisation** : Support FR/EN avec `react-i18next`
13. **Performance** : Lazy loading des pages (`React.lazy`), `React.memo` sur les composants lourds
14. **PWA** : Service Worker pour installation sur mobile

---

## 📦 Dépendances

### Production
| Package | Version | Usage |
|---|---|---|
| `react` | ^19.2.4 | Framework UI |
| `react-dom` | ^19.2.4 | Rendu DOM |
| `react-router-dom` | ^7.14.0 | Routing SPA |
| `html2pdf.js` | ^0.14.0 | Export de séances en PDF |

### Développement
| Package | Version | Usage |
|---|---|---|
| `vite` | ^8.0.4 | Bundler & dev server |
| `@vitejs/plugin-react` | ^6.0.1 | JSX/React HMR |
| `eslint` | ^9.39.4 | Linting |
| `eslint-plugin-react-hooks` | ^7.0.1 | Règles React Hooks |

---

## 📄 Licence

Projet privé — Tous droits réservés.

---

> *Développé avec ❤️ pour le système éducatif camerounais.*
