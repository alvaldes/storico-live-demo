/**
 * Regenerates src/i18n/{en,es}.json.
 *
 * The wording is copied verbatim from the product's own catalogues
 * (~/Developer/storico/frontend/src/i18n), so the demo and the product say the
 * same words for the same things. Only `demo.*` is written here: it is copy the
 * product does not have, because the product has no demo.
 *
 * Run with: node scripts/gen-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(process.env.HOME, 'Developer/storico/frontend/src/i18n');

/** Sections and keys borrowed from the product. `kanban.columns` is nested. */
const SPEC = {
  app: ['name', 'tagline'],
  nav: [
    'dashboard',
    'projects',
    'allProjects',
    'stories',
    'kanban',
    'export',
    'settings',
    'account',
    'login',
    'logout',
    'navigation',
  ],
  common: ['edit', 'delete', 'cancel'],
  sidebar: ['workspaces', 'newWorkspace'],
  stories: [
    'raw_text_label',
    'detail_parts',
    'actor_label',
    'feature_label',
    'benefit_label',
    'detail_tasks_title',
    'detail_extract',
    'extraction_pending',
    'extraction_complete',
    'extraction_tasks_in_progress',
    'detail_tasks_empty',
    'detail_back_to_stories',
    'detail_back_to_project',
    'detail_created',
    'keyword_as_a',
    'keyword_i_want',
    'keyword_so_that',
    'keyword_validation',
    'keyword_valid',
    'status_pending_extraction',
    'status_extracting',
    'status_extracted',
    'status_failed_extraction',
  ],
  kanban: ['title', 'empty_board', 'empty_board_hint', 'empty_column', 'total_tasks', 'invalid_drop_title', 'invalid_drop'],
  exportPage: [
    'title',
    'description',
    'format_label',
    'format_json',
    'format_markdown',
    'download',
    'no_tasks',
  ],
  taskEditor: ['title', 'description', 'title_label', 'description_label', 'status_label', 'labels_label', 'dependencies_label', 'cancel'],
  theme: ['toggle', 'dark', 'light', 'system'],
};

/** Copy that only the demo has. */
const DEMO = {
  en: {
    badge: 'Live demo',
    title: 'From a user story to Kanban tasks',
    subtitle:
      'A simulation of Storico: the story types itself and the tasks come from a prepared catalog. Nothing here calls an LLM or a backend.',
    storyHint: 'Standard format: As a(n) ..., I want ..., so that ...',
    footerNote:
      'Demo data, prepared for this exercise. No request leaves your browser.',
    userName: 'Demo User',
    taskDetailTitle: 'Task',
    taskDetailHint: 'This is the task the extraction produced. Move it with the status field.',
  },
  es: {
    badge: 'Demo en vivo',
    title: 'De una historia de usuario a tareas Kanban',
    subtitle:
      'Una simulación de Storico: la historia se escribe sola y las tareas salen de un catálogo preparado. Nada aquí llama a un LLM ni a un backend.',
    storyHint: 'Formato estándar, en inglés: As a(n) ..., I want ..., so that ...',
    footerNote:
      'Datos de demo, preparados para este ejercicio. Ninguna petición sale de tu navegador.',
    userName: 'Usuario demo',
    taskDetailTitle: 'Tarea',
    taskDetailHint: 'Esta es la tarea que produjo la extracción. Movela desde el estado.',
  },
};

for (const locale of ['en', 'es']) {
  const product = JSON.parse(fs.readFileSync(path.join(SRC, `${locale}.json`), 'utf8'));
  const out = {
    demo: { ...DEMO[locale] },
    language: { label: locale === 'es' ? 'Idioma' : 'Language' },
  };
  const missing = [];

  for (const [section, keys] of Object.entries(SPEC)) {
    const source = product[section];
    if (!source) {
      missing.push(section);
      continue;
    }
    out[section] = {};
    for (const key of keys) {
      if (key in source) out[section][key] = source[key];
      else missing.push(`${section}.${key}`);
    }
  }

  // `columns` is nested, so it is attached after the flat keys the loop read.
  out.kanban = { ...(out.kanban ?? {}), columns: { ...product.kanban?.columns } };

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'i18n', `${locale}.json`),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  console.log(`${locale}: ${Object.keys(out).join(', ')}`);
  if (missing.length) console.log(`  missing in the product: ${missing.join(', ')}`);
}
