import en from './en.json';
import es from './es.json';

export type Locale = 'en' | 'es';

export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

const translations: Record<Locale, typeof en> = { en, es };

/**
 * Copy for a locale. Both files share the same shape, so `Locale` is the only
 * thing a caller has to pick.
 */
export function getT(locale: Locale): typeof en {
  return translations[locale];
}

/**
 * Path for a locale, honouring Astro's `base` so the demo also works when it is
 * served from a subpath. The one locale prefix is `/en` or `/es`, like the
 * product.
 */
export function localePath(locale: Locale): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${locale}/`;
}
