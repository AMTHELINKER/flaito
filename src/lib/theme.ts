import type { ThemeName } from '@laito/shared';

export type UiTheme = 'parchment' | 'light' | 'night';

export function toUiTheme(t: ThemeName): UiTheme {
  return t === 'sepia' ? 'parchment' : t;
}

export function applyTheme(t: ThemeName) {
  const ui = toUiTheme(t);
  document.documentElement.dataset.theme = ui;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', ui === 'night' ? '#1d1611' : '#3E2A1E');
  try {
    localStorage.setItem('laito.theme', ui);
  } catch {
    /* stockage indisponible */
  }
}

export function storedTheme(): UiTheme {
  const t = document.documentElement.dataset.theme as UiTheme | undefined;
  return t ?? 'parchment';
}

/** Taille de texte de l'interface (réglable, accessibilité). */
export function applyUiFontSize(px: number) {
  document.documentElement.style.fontSize = `${px}px`;
  try {
    localStorage.setItem('laito.uiFontSize', String(px));
  } catch {
    /* ignore */
  }
}

/** Active la version allégée de l'effet verre sur les appareils peu puissants. */
export function detectLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low =
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
  document.documentElement.classList.toggle('lite-glass', !!low);
}
