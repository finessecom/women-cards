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

## Conventions de Code
- Utiliser `supabase` de `@supabase/supabase-js`.
- Protection polyfill pour `fetch` dans `main.tsx`.
- Thèmes définis dans `src/types.ts`.

## Configuration Supabase Self-Hosted (CORS)
Si vous utilisez une instance Supabase auto-hébergée (Docker), vous devez configurer les variables suivantes dans votre fichier `.env` Supabase pour autoriser cette application :

1. **CORS** : Ajoutez l'URL de cette application à `GOTRUE_EXTERNAL_ALLOWED_REDIRECT_URLS` et assurez-vous que `API_EXTERNAL_URL` est accessible.
2. **HTTPS** : Votre instance Supabase DOIT être accessible via `https` car cette application est servie en HTTPS (sécurité du navigateur).
3. **Variables d'environnement** :
   - `VITE_SUPABASE_URL` : L'URL publique de votre API (ex: `https://supabase.votre-domaine.com`)
   - `VITE_SUPABASE_ANON_KEY` : Votre `anon` key.
