import { expect, test } from '@playwright/test';
import { mockApi, skipOnboarding } from './mock-api';

test('un membre peut signaler un profil, en choisissant un motif', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await skipOnboarding(page);
  await page.goto('/u/lea');
  await page.getByRole('button', { name: 'Signaler ce profil' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Envoyer le signalement' })).toBeDisabled();
  await dialog.getByText('Spam ou publicité').click();
  await dialog.getByRole('button', { name: 'Envoyer le signalement' }).click();
  await expect(page.getByText('Notre équipe va examiner ce signalement.')).toBeVisible();
});

test("l'administration n'apparaît pas pour un membre, et son adresse le renvoie à l'accueil", async ({
  page,
}) => {
  await mockApi(page, { loggedIn: true });
  await skipOnboarding(page);
  await page.goto('/');
  await page.getByRole('button', { name: /compte de/i }).click();
  await expect(page.getByRole('menuitem', { name: 'Administration' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
});

test('un modérateur traite un signalement depuis l’administration', async ({ page }) => {
  await mockApi(page, { loggedIn: true, role: 'moderator' });
  await skipOnboarding(page);
  await page.goto('/');
  await page.getByRole('button', { name: /compte de/i }).click();
  await page.getByRole('menuitem', { name: 'Administration' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Liens publicitaires partout')).toBeVisible();
  await expect(page.getByText('2 signalements')).toBeVisible();
  await page.getByRole('button', { name: 'Masquer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Masquer' }).click();
  await expect(page.getByText('Contenu masqué.')).toBeVisible();
});
