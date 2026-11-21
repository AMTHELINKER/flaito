# Contribuer

## Flux de travail

1. Une branche par fonctionnalité depuis `main` : `feat/partage-chapitre`, `fix/sauvegarde-hors-ligne`…
2. Commits conventionnels, vérifiés par un hook : `feat(editeur): raccourci nouveau chapitre`.
   Types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`.
3. Pull request vers `main`, avec le modèle rempli. Revue obligatoire ; la CI doit être verte.

## Hooks git (installés par `pnpm install`)

- **pre-commit** : ESLint et Prettier sur les fichiers modifiés (lint-staged).
- **commit-msg** : refuse un message qui ne suit pas la convention (commitlint).

## Définition de « terminé »

- Critères d'acceptation couverts par un test automatisé, tests verts.
- `pnpm format:check`, `pnpm lint` et `pnpm typecheck` passent.
- Documentation à jour (README, `docs/API.md` pour l'API).

## Dépendances

Dependabot propose chaque semaine une PR groupée pour les mises à jour mineures. La CI refuse une dépendance de production avec une faille de gravité haute (`pnpm audit`).

## Interface

- Une seule action principale par écran ; les réglages secondaires restent repliés (composants `Disclosure`, `Tabs`). C'est l'application de la loi de Hick : moins de choix visibles, décision plus rapide.
- Zones tactiles de 44 × 44 px minimum, contraste WCAG AA, navigation complète au clavier.
- Ne modifiez pas `src/shared/` ici : il vient de l'API (`pnpm shared:sync`).
- Tests de bout en bout : `pnpm test:e2e` (Playwright, API simulée).
