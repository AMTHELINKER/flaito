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

test('mobile : une discussion ouverte prend tout l’écran, comme Instagram', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile', 'comportement propre au mobile');
  await page.goto('/messages');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav).toBeVisible();
  await page.getByRole('link', { name: /Léa Martin/ }).click();

  // Ni barre du haut ni navigation du bas : seul le fil occupe l'écran.
  await expect(nav).toBeHidden();
  await expect(page.getByRole('button', { name: /compte de/i })).toBeHidden();
  const viewport = page.viewportSize()!;
  const composer = await page.getByLabel('Votre message').boundingBox();
  expect(composer!.y + composer!.height).toBeGreaterThan(viewport.height - 70);

  // Le bouton d'envoi n'apparaît qu'avec du texte.
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  await page.getByLabel('Votre message').fill('Coucou');
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeEnabled();

  await page.getByRole('link', { name: 'Retour aux conversations' }).click();
  await expect(nav).toBeVisible();
});

test('bureau : la discussion reste à côté de la liste', async ({ page }, info) => {
  test.skip(info.project.name !== 'bureau', 'comportement propre au bureau');
  await page.goto('/messages');
  await page.getByRole('link', { name: /Léa Martin/ }).click();
  await expect(
    page.getByRole('navigation', { name: 'Navigation principale' }).first(),
  ).toBeVisible();
  // La liste reste visible à côté du fil.
  await expect(
    page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Léa Martin/ }),
  ).toBeVisible();
  await expect(page.getByRole('log')).toBeVisible();
});
