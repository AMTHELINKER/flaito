import { expect, test } from '@playwright/test';
import { book, mockApi, skipOnboarding } from './mock-api';

test.beforeEach(async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await skipOnboarding(page);
});

test('les réglages ne présentent qu’un onglet à la fois, avec une seule action principale', async ({
  page,
}) => {
  await page.goto(`/livres/${book.id}/reglages`);
  const save = page.getByRole('button', { name: 'Enregistrer' });
  await expect(save).toBeDisabled();
  await page.getByLabel('Titre').fill('Les Jardins de Sel, tome 1');
  await expect(save).toBeEnabled();
  // Le partage est dans l'autre onglet.
  await expect(page.getByText('Qui peut lire ce livre ?')).toBeHidden();
  await page.getByRole('tab', { name: 'Partage' }).click();
  await expect(page.getByText('Qui peut lire ce livre ?')).toBeVisible();
  await expect(page).toHaveURL(/onglet=partage/);
});

test('les liens privés n’apparaissent qu’en visibilité « Lien privé »', async ({ page }) => {
  await page.goto(`/livres/${book.id}/reglages?onglet=partage`);
  await expect(page.getByRole('heading', { name: 'Liens privés' })).toBeHidden();
  await page.getByText('Lien privé', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Liens privés' })).toBeVisible();
});

test('rendre un livre public demande une confirmation', async ({ page }) => {
  await page.goto(`/livres/${book.id}/reglages?onglet=partage`);
  await page.getByText('Public', { exact: true }).last().click();
  await expect(page.getByRole('dialog')).toContainText('Rendre ce livre public ?');
});
