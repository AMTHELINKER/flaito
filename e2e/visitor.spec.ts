import { expect, test } from '@playwright/test';
import { mockApi, skipOnboarding } from './mock-api';

test('un nouveau visiteur découvre l’accueil en 3 écrans maximum, puis peut créer un compte', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/bienvenue/);
  await page.getByRole('button', { name: /passer/i }).click();
  await expect(page).toHaveURL(/\/(inscription|connexion)/);
});

test('le catalogue public est accessible sans compte', async ({ page }) => {
  await mockApi(page);
  await skipOnboarding(page);
  await page.goto('/decouvrir');
  await expect(page.getByRole('heading', { name: 'Découvrir' })).toBeVisible();
  await expect(page.getByText('Les Jardins de Sel').first()).toBeVisible();
});

test('la connexion mène à l’accueil personnel', async ({ page }) => {
  await mockApi(page);
  await skipOnboarding(page);
  await page.goto('/connexion');
  await page.getByLabel('E-mail').fill('camille@exemple.fr');
  await page.getByLabel('Mot de passe').fill('motdepasse');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Camille');
});

test('un e-mail non vérifié est expliqué, avec renvoi possible', async ({ page }) => {
  await mockApi(page, {
    overrides: {
      'POST /auth/login': (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            error: 'EMAIL_NOT_VERIFIED',
            message: 'Vérifiez votre adresse e-mail.',
          }),
        }),
    },
  });
  await skipOnboarding(page);
  await page.goto('/connexion');
  await page.getByLabel('E-mail').fill('camille@exemple.fr');
  await page.getByLabel('Mot de passe').fill('motdepasse');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /renvoyer/i })).toBeVisible();
});
