import type { Page, Route } from '@playwright/test';
import {
  DEFAULT_READING_PREFERENCES,
  type AuthResponse,
  type BookDto,
  type MeDto,
  type Paginated,
} from '../src/shared';

export const me: MeDto = {
  id: '01900000-0000-7000-8000-000000000001',
  email: 'camille@exemple.fr',
  role: 'user',
  emailVerified: true,
  profile: {
    userId: '01900000-0000-7000-8000-000000000001',
    username: 'camille',
    displayName: 'Camille',
    avatarUrl: null,
    bio: null,
    links: [],
  },
  settings: {
    locale: 'fr',
    theme: 'parchment',
    notificationsEnabled: true,
    onboardingCompleted: true,
    readingPreferences: DEFAULT_READING_PREFERENCES,
  },
};

export const book: BookDto = {
  id: '01900000-0000-7000-8000-0000000000b1',
  authorId: me.id,
  title: 'Les Jardins de Sel',
  slug: 'les-jardins-de-sel',
  summary: 'Une maison oubliée par la mer.',
  coverUrl: null,
  genre: 'roman',
  tags: [],
  status: 'in_progress',
  visibility: 'private',
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  chapterCount: 1,
  wordCount: 120,
  author: { userId: me.id, username: 'camille', displayName: 'Camille', avatarUrl: null },
};

interface MockOptions {
  /** Session déjà ouverte (refresh accepté). */
  loggedIn?: boolean;
  /** Réponses spécifiques, clé « MÉTHODE /chemin » sans le préfixe /api/v1. */
  overrides?: Record<string, (route: Route) => unknown>;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Simule l'API v1. Toute route non prévue répond 404, pour repérer un appel inattendu. */
export async function mockApi(page: Page, { loggedIn = false, overrides = {} }: MockOptions = {}) {
  const auth: AuthResponse = { accessToken: 'jeton-de-test', user: me };
  let state = { ...book };
  const catalog: Paginated<BookDto> = {
    items: [{ ...book, visibility: 'public' }],
    nextCursor: null,
  };

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const key = `${method} ${path}`;
    if (overrides[key]) return overrides[key](route);

    switch (key) {
      case 'POST /auth/refresh':
        return loggedIn
          ? json(route, auth)
          : json(route, { statusCode: 401, message: 'Session expirée' }, 401);
      case 'POST /auth/login':
        loggedIn = true;
        return json(route, auth);
      case 'POST /auth/logout':
        return route.fulfill({ status: 204 });
      case 'GET /books/mine':
        return json(route, [state]);
      case `GET /books/${book.id}`:
        return json(route, state);
      case `PATCH /books/${book.id}`:
        state = { ...state, ...route.request().postDataJSON() };
        return json(route, state);
      case `GET /books/${book.id}/chapters`:
        return json(route, []);
      case 'GET /read/progress':
      case 'GET /share/with-me':
      case 'GET /share/links':
      case 'GET /share/grants':
      case 'GET /friends':
        return json(route, []);
      case 'GET /catalog':
        return json(route, catalog);
      case 'GET /catalog/genres':
        return json(route, [{ genre: 'roman', count: 1 }]);
      default:
        return json(route, { statusCode: 404, message: `Non simulé : ${key}` }, 404);
    }
  });
}

/** Évite l'écran d'accueil (onboarding) pour les tests qui ne le concernent pas. */
export async function skipOnboarding(page: Page) {
  await page.addInitScript(() => localStorage.setItem('laito.onboarded', 'true'));
}
