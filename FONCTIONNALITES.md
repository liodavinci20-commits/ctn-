# 📋 Fonctionnalités principales — CTN Lycée

> Cahier de Texte Numérique · Lycées camerounais
> Trois rôles : **Enseignant**, **Conseiller Pédagogique**, **Administrateur**

---

## 1. L'enseignant saisit une séance pédagogique

L'enseignant remplit un formulaire structuré après chaque cours :

- Titre, contenu détaillé, plan de séance
- Matière et classe concernées
- Type de séance (Cours / TP / TD / Évaluation / Rattrapage)
- Compétences visées et devoirs assignés aux élèves
- Effectif présent / total
- **Signature manuscrite numérique** dessinée sur un canvas tactile
- **Géolocalisation GPS automatique** pour prouver la présence physique
- La séance est ensuite enregistrée dans la base de données Supabase

---

## 2. L'enseignant gère son emploi du temps

L'enseignant visualise et édite sa grille horaire hebdomadaire :

- Affichage sous forme de calendrier (Lundi → Samedi, créneaux horaires)
- Ajout, modification et suppression de créneaux (matière, classe, salle, couleur)
- Les créneaux sont liés à de vraies classes et matières issues de la base de données

---

## 3. L'enseignant consulte l'historique de ses séances

L'enseignant retrouve toutes ses séances passées :

- Tableau chronologique avec titre, classe, matière, date et statut
- Recherche par classe ou période
- Accès au détail complet d'une séance (signature, géolocalisation, devoirs)
- **Export PDF** de la fiche de séance complète (via `html2pdf.js`)

---

## 4. L'enseignant demande un rattrapage

Lorsqu'une séance n'a pas pu avoir lieu, l'enseignant soumet une demande :

- Formulaire avec motif, date proposée et créneau de remplacement
- La demande est enregistrée avec le statut `pending`
- Une notification est automatiquement envoyée à l'administrateur

---

## 5. Le conseiller pédagogique suit la progression globale

Le conseiller a une vue d'ensemble sur tous les enseignants de l'établissement :

- Statistiques agrégées (nombre d'enseignants suivis, progression moyenne, retards)
- Tableau de suivi par enseignant avec barre de progression et statut
- Alertes visuelles sur les enseignants en retard dans leur programme
- Chronologie des séances saisies avec indication des séances manquantes
- Actions rapides : planifier un rattrapage, envoyer une notification, exporter un rapport

---

## 6. L'administrateur approuve ou rejette les rattrapages

L'administrateur reçoit et traite les demandes de rattrapage :

- Liste complète des demandes en attente (`pending`)
- Approbation ou rejet en un clic
- Une notification est automatiquement renvoyée à l'enseignant concerné avec la décision
- Horodatage de la décision et identité du décideur enregistrés

---

## 7. L'administrateur gère les comptes utilisateurs

L'administrateur pilote les accès à la plateforme :

- Création, modification et désactivation des comptes (Enseignant / Conseiller / Admin)
- Attribution des rôles et du matricule
- Visualisation de toutes les séances saisies dans l'établissement
- Accès et modification des emplois du temps de n'importe quel enseignant

---

## 8. Le système envoie des notifications inter-rôles

Un centre de messagerie interne relie tous les acteurs :

- Envoi de messages typés : `info`, `alerte`, `confirmation`
- Réception en temps réel grâce à **Supabase Realtime** (PostgreSQL CDC)
- Badge de comptage des messages non lus dans la navigation
- Marquage individuel ou global comme lu

---

## 9. L'enseignant gère sa bibliothèque de ressources pédagogiques

L'enseignant centralise ses supports de cours :

- Dépôt de fichiers PDF, vidéos, images et liens externes
- Organisation par matière et classe
- Association de ressources à une séance spécifique lors de la saisie
- Stockage des fichiers dans Supabase Storage (bucket `resources`)

---

## 10. Connexion sécurisée et navigation adaptée au rôle

L'accès à la plateforme est contrôlé et personnalisé :

- Authentification par email / mot de passe via **Supabase Auth**
- Inscription avec saisie du matricule et du rôle, profil créé automatiquement en base
- Menu de navigation différent selon le rôle connecté (6 entrées enseignant, 5 conseiller/admin)
- Session persistante : l'utilisateur reste connecté entre les rechargements de page
- Déconnexion sécurisée avec destruction de la session Supabase

---

## Récapitulatif par rôle

| Fonctionnalité | Enseignant | Conseiller | Administrateur |
|---|:---:|:---:|:---:|
| Saisir une séance | ✅ | — | — |
| Gérer son emploi du temps | ✅ | — | ✅ (tous) |
| Consulter l'historique | ✅ (le sien) | ✅ (tous) | ✅ (tous) |
| Demander un rattrapage | ✅ | — | — |
| Suivre la progression globale | — | ✅ | ✅ |
| Approuver les rattrapages | — | — | ✅ |
| Gérer les comptes utilisateurs | — | — | ✅ |
| Envoyer / recevoir des notifications | ✅ | ✅ | ✅ |
| Gérer les ressources pédagogiques | ✅ | — | — |
| Exporter une fiche en PDF | ✅ | ✅ | ✅ |

---

> *Document généré à partir de l'analyse du code source — `ctn-app/` · Avril 2026*
