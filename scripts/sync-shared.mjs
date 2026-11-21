#!/usr/bin/env node
/**
 * Synchronise src/shared depuis le dépôt de l'API (blaito), qui en est la source de vérité.
 *
 *   pnpm shared:sync    copie les fichiers de blaito dans src/shared
 *   pnpm shared:check   échoue (code 1) si src/shared diffère de blaito
 *
 * Source, par ordre de priorité :
 *   1. SHARED_SOURCE=/chemin/vers/blaito  (clone local, pour tester avant de pousser)
 *   2. ../api (disposition recommandée : api/ et web/ côte à côte), ou ../blaito
 *   3. GitHub : branche SHARED_REF (main par défaut) de AMTHELINKER/blaito
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['index.ts', 'text.ts'];
const REPO = process.env.SHARED_REPO ?? 'AMTHELINKER/blaito';
const REF = process.env.SHARED_REF ?? 'main';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'src', 'shared');
const check = process.argv.includes('--check');

function localSource() {
  if (process.env.SHARED_SOURCE) return resolve(process.env.SHARED_SOURCE);
  // En CI, on compare toujours avec GitHub pour ne pas dépendre d'un dossier voisin.
  if (process.env.CI) return null;
  for (const name of ['api', 'blaito']) {
    const sibling = resolve(root, '..', name);
    if (existsSync(join(sibling, 'src', 'shared', 'index.ts'))) return sibling;
  }
  return null;
}

async function fetchFile(name) {
  const local = localSource();
  if (local) return readFile(join(local, 'src', 'shared', name), 'utf8');
  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/src/shared/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de lire ${url} (HTTP ${res.status})`);
  return res.text();
}

const local = localSource();
console.log(`Source : ${local ?? `github.com/${REPO}@${REF}`}`);

const drift = [];
for (const name of FILES) {
  const upstream = await fetchFile(name);
  const path = join(target, name);
  const current = existsSync(path) ? await readFile(path, 'utf8') : null;
  if (current === upstream) continue;
  drift.push(name);
  if (!check) await writeFile(path, upstream);
}

if (!drift.length) {
  console.log('src/shared est à jour.');
} else if (check) {
  console.error(
    `src/shared diffère de blaito : ${drift.join(', ')}.\n` +
      'Lancez « pnpm shared:sync », vérifiez (pnpm typecheck && pnpm test) puis commitez.',
  );
  process.exit(1);
} else {
  console.log(`Mis à jour : ${drift.join(', ')}. Vérifiez avec « pnpm typecheck && pnpm test », puis commitez.`);
}
