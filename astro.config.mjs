// Astro config for the Storico live demo.
//
// Static on purpose: the demo has no backend, no API and no runtime data model.
// Every byte it serves is built ahead of time, so it can live on any static host
// without a Node runtime.
//
// Versions are pinned to the ones the product's frontend runs (see package.json),
// because this project copies the product's CSS pipeline and design tokens.
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://alvaldes.github.io',
  base: '/storico-live-demo',

  // Locale routes mirror the product (/en/ and /es/), both written out at build
  // time. With every page static there is nothing to negotiate at runtime: the
  // switch is a plain link.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: true,
      strategy: 'pathname',
    },
  },

  // The product's frontend already owns 4321 in development.
  server: { port: 4322 },

  // `site` is intentionally unset: the demo has no domain yet. The deploy
  // decision and its trigger live in the vault, in "Cuándo el demo necesita un
  // despliegue".
});
