# Projet : women.cards

## Vision
Un clone de Linktree minimaliste et professionnel, dédié exclusivement aux femmes (entrepreneuses, leaders, créatrices). Design élégant, épuré et sophistiqué.

## Stack Technique
- **Frontend** : React 19 + Vite + Tailwind CSS 4.
- **Animations** : Motion (framer-motion).
- **Base de données** : Supabase (Self-hosted).
- **Icônes** : Lucide-react.

## Structure de la Base de Données (Supabase)
Toutes les tables commencent par le préfixe `wc_` :
- `wc_profiles` : Stocke les informations du profil (id, username, name, bio, avatar_url, theme).
- `wc_links` : Stocke les liens de chaque utilisateur (id, profile_id, title, url, is_active, position).

## Identifiants de Démo (Local/Test)
- **Email** : `admin@women.cards`
- **Mot de passe** : `women.cards2026`

## Fonctionnalités Clés
- **Dashboard WYSIWYG** : Edition en direct avec prévisualisation mobile.
- **Gestion du Profil** : Choix du pseudo (`women.cards/pseudo`), nom et bio.
- **Apparence** : Sélection de thèmes élégants (Minimal Light, Minimal Dark, Soft Rose, Elegant Gold).
- **Liens** : Ajout, édition, activation/désactivation et suppression de liens.

## État du Projet & Dépannage (Mai 2026)

### Problème : "Profil non trouvé" (/pseudo)
Si le lien "Voir ma page en ligne" ne fonctionne pas :
1. **Script SQL** : Vérifiez que vous avez bien exécuté le code dans le *SQL Editor* de Supabase.
2. **Pseudo (Username)** : Allez dans le **Dashboard**, dans la section **A. Détails du Profil**, et vérifiez que vous avez bien saisi un **Pseudo**.
3. **Enregistrement** : Vous DEVEZ cliquer sur le bouton noir **"SAVE CHANGES"** en haut à droite du Dashboard. Si un message d'erreur rouge apparaît, lisez-le pour diagnostiquer (souvent un problème de RLS).
4. **Casse** : Les pseudos sont enregistrés en minuscules.

### Bouton "Réparer la Base"
Ce bouton génère un code SQL à copier-coller dans Supabase. Il garantit que :
- Les tables `wc_profiles` et `wc_links` existent.
- Les colonnes `username`, `socials`, etc., sont présentes.
- La sécurité **RLS** est activée et autorise les lectures publiques et les écritures par le propriétaire.

### Authentification
L'application utilise Supabase Auth. Seul le propriétaire d'un compte peut modifier ses propres données. Si vous n'êtes pas connecté, le Dashboard vous redirigera vers la page de login.