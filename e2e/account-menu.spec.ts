import { expect, test } from '@playwright/test';
import { mockApi, skipOnboarding } from './mock-api';

test('le compte est en haut à droite : profil, paramètres et déconnexion', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await skipOnboarding(page);
  await page.goto('/bibliotheque');

  const account = page.getByRole('button', { name: /compte de camille/i });
  const box = await account.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThan(viewport.width * 0.75);
  expect(box!.y).toBeLessThan(80);

  // « Profil » n'encombre plus la navigation principale.
  await expect(page.getByRole('link', { name: 'Profil', exact: true })).toHaveCount(0);

  await account.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Mon profil',
    'Paramètres',
    'Se déconnecter',
  ]);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await account.click();
  await menu.getByRole('menuitem', { name: 'Mon profil' }).click();
  await expect(page).toHaveURL(/\/profil$/);
});

test('un visiteur voit « Se connecter » à la place du compte', async ({ page }) => {
  await mockApi(page);
  await skipOnboarding(page);
  await page.goto('/decouvrir');
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
});
