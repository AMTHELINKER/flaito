import { expect, test } from '@playwright/test';
import { mockApi, skipOnboarding } from './mock-api';

test.beforeEach(async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await skipOnboarding(page);
});

test('la messagerie est dans la navigation, avec les non-lus', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /Messages/ }).first();
  await expect(link).toContainText('1');
  await link.click();
  await expect(page).toHaveURL(/\/messages$/);
  await expect(page.getByRole('link', { name: /Léa Martin/ })).toBeVisible();
});

test('ouvrir une conversation et envoyer un message (Entrée)', async ({ page }) => {
  await page.goto('/messages');
  await page.getByRole('link', { name: /Léa Martin/ }).click();
  const log = page.getByRole('log');
  await expect(log.getByText('Tu me fais lire le brouillon ?')).toBeVisible();
  await page.getByLabel('Votre message').fill('Bien sûr, je te l’envoie ce soir.');
  await page.keyboard.press('Enter');
  await expect(log.getByText('Bien sûr, je te l’envoie ce soir.')).toBeVisible();
  await expect(page.getByLabel('Votre message')).toHaveValue('');
});

test('une seule action pour démarrer : choisir un ami, ou plusieurs pour un groupe', async ({
  page,
}) => {
  await page.goto('/messages');
  await page.getByRole('button', { name: 'Nouvelle' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Choisissez un ami' })).toBeDisabled();
  await dialog.getByText('Léa Martin').click();
  await expect(dialog.getByRole('button', { name: 'Écrire à Léa Martin' })).toBeEnabled();
  // Le nom de groupe n'apparaît qu'à partir de deux amis.
  await expect(dialog.getByLabel('Nom du groupe')).toHaveCount(0);
});

test("l'ajout d'amis se fait depuis l'onglet Amis de la messagerie", async ({ page }) => {
  await page.goto('/messages?onglet=amis');
  await page.getByRole('searchbox', { name: 'Ajouter un ami' }).fill('hug');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Demande envoyée.')).toBeVisible();
});
