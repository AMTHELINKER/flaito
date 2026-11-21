# flaito — PWA Laito

Front de **Laito**, PWA d'écriture et de partage de livres : écrire en chapitres, choisir qui peut lire (privé, amis, lien privé, public), partager et lire confortablement, en ligne ou hors ligne. L'API est dans le dépôt [blaito](https://github.com/AMTHELINKER/blaito).

React 18 · TypeScript · Vite · React Router · TanStack Query · Tailwind CSS v4 · vite-plugin-pwa (Workbox) · IndexedDB.

## Démarrer

Prérequis : Node 22, pnpm (`corepack enable`), et l'API blaito lancée sur le port 3000.

```bash
pnpm install
pnpm dev              # http://localhost:5173 — /api et /uploads relayés vers l'API
```

Pour viser une autre API en développement : `VITE_API_PROXY=http://hote:port pnpm dev` (voir `.env.example`).

## Commandes

| Commande | Effet |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | qualité et tests (Vitest) |
| `pnpm build` / `pnpm preview` | build de production (PWA, service worker) et aperçu |
| `pnpm icons` | régénère les icônes PWA |

## Production

L'image Docker sert la PWA avec nginx et relaie `/api` et `/uploads` vers l'API :

```bash
docker build -t laito-web .
docker run -p 8080:80 -e API_UPSTREAM=http://adresse-de-l-api:3000 laito-web
```

`docker compose up --build` fait la même chose en visant une API lancée sur la machine hôte. Si l'API est servie sur un autre domaine, construire avec `--build-arg VITE_API_URL=https://api.exemple.fr/api/v1` ; l'API doit alors autoriser ce domaine dans `WEB_ORIGIN`.

## Organisation

```
src/api         client HTTP (jeton en mémoire, refresh automatique) et requêtes
src/auth        session, gardes de routes
src/components  primitives « verre », badges de visibilité, navigation
src/features    écrans : onboarding, auth, bibliothèque, éditeur, lecteur, partage, découverte, profil, paramètres
src/shared      types et règles du texte, partagés avec l'API
src/styles      jetons de design (palette parchemin, mode nuit chaud), effet verre
```

## Code partagé avec l'API

`src/shared/` est **une copie identique** du dossier `src/shared/` de blaito (types des réponses, syntaxe du texte, comptage de mots). Toute modification doit être reportée dans les deux dépôts.

## Format du texte

L'éditeur est une zone de texte simple. La mise en forme utilise une syntaxe légère que le lecteur interprète sans jamais exécuter de HTML : `**gras**`, `*italique*`, `# titre`, `> citation`, `- liste`, `-> centré <-`, `* * *` pour un changement de scène.

## Limites connues

- **Mode concentration** : impossible d'estomper les autres paragraphes dans une zone de texte. Un dégradé en haut et en bas le remplace.
- **Envoi à la fermeture** : `fetch keepalive` est limité à environ 64 Ko. Au-delà, le texte reste dans le brouillon local et part à la prochaine ouverture.
- **Langue** : seul le français est disponible.
