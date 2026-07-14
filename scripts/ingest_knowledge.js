#!/usr/bin/env node
/**
 * DOCTORAL NEXUS — MOTOR DE INGESTIÓN
 *
 * Uso:   node scripts/ingest_knowledge.js [carpeta]     (default: ./conocimientos)
 *        npm run ingest
 *
 * Pipeline:
 *   [*.md|*.txt] --> frontmatter --> split por headings --> nodos --> upsert SQLite
 *
 * Idempotente: re-ejecutar no duplica nada. Contenido cambiado → version++.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, upsertNode, DB_PATH } = require('../src/server/db.js');

const KNOWLEDGE_DIR = path.resolve(process.argv[2] || path.join(process.cwd(), 'conocimientos'));
const MIN_SECTION_CHARS = 400;   // secciones menores se fusionan con la anterior
const TRACE_ID = `ingest-${new Date().toISOString()}`;
const AGENT_ID = 'ingest-engine-v1';

/* ─────────────────────────── Parsers ─────────────────────────── */

/** Frontmatter YAML-lite: bloque --- key: value --- al inicio. Sin dependencias. */
function parseFrontmatter(raw) {
  const meta = {};
  if (!raw.startsWith('---')) return { meta, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta, body: raw };

  raw.slice(3, end).split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.+?)\s*$/);
    if (m) meta[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '');
  });
  return { meta, body: raw.slice(end + 4).replace(/^\s*\n/, '') };
}

/** Headings de PDFs extraídos vienen con **bold**, `code`, etc. — se limpian. */
const cleanHeading = (h) =>
  h.replace(/[*_`#]+/g, '').replace(/\s+/g, ' ').trim();

/** Divide el cuerpo en secciones por headings ## (fallback: #, fallback: doc entero). */
function splitSections(body) {
  // Extraer el primer H1 como título del capítulo (no genera sección propia).
  let chapterTitle = null;
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) chapterTitle = cleanHeading(h1[1]);

  const splitBy = (level) => {
    const re = new RegExp(`^#{${level}}\\s+(.+)$`, 'gm');
    const marks = [...body.matchAll(re)];
    if (marks.length < 2) return null;
    const sections = [];
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].index;
      const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
      sections.push({ heading: cleanHeading(marks[i][1]), content: body.slice(start, end).trim() });
    }
    // Preámbulo antes del primer heading (abstract, intro del capítulo).
    const preamble = body.slice(0, marks[0].index).trim();
    if (preamble.replace(/^#\s+.+$/m, '').trim().length > MIN_SECTION_CHARS) {
      sections.unshift({ heading: chapterTitle || 'Preamble', content: preamble });
    }
    return sections;
  };

  let sections = splitBy(2) || splitBy(1);
  if (!sections) sections = [{ heading: chapterTitle, content: body.trim() }];

  // Fusión de secciones raquíticas: un nodo debe valer una lectura.
  const merged = [];
  for (const s of sections) {
    if (merged.length > 0 && s.content.length < MIN_SECTION_CHARS) {
      merged[merged.length - 1].content += '\n\n' + s.content;
    } else {
      merged.push({ ...s });
    }
  }
  return { chapterTitle, sections: merged };
}

const humanize = (name) =>
  name.replace(/\.(md|txt)$/i, '').replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase()).trim();

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(md|txt)$/i.test(entry.name)) yield full;
  }
}

/* ─────────────────────────── Motor ─────────────────────────── */

function main() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`✗ Knowledge folder not found: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  const db = getDb();
  const files = [...walk(KNOWLEDGE_DIR)];
  if (files.length === 0) {
    console.error(`✗ No .md/.txt files in ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  console.log(`\nDOCTORAL NEXUS · INGESTION ENGINE`);
  console.log(`  source : ${KNOWLEDGE_DIR}`);
  console.log(`  target : ${DB_PATH}`);
  console.log(`  trace  : ${TRACE_ID}\n`);

  const totals = { inserted: 0, updated: 0, skipped: 0, nodes: 0 };

  db.exec('BEGIN');
  try {
    for (const file of files) {
      const relPath = path.relative(KNOWLEDGE_DIR, file).split(path.sep).join('/');
      const raw = fs.readFileSync(file, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const { chapterTitle, sections } = splitSections(body);

      const fileTitle = humanize(path.basename(file));
      const parentDir = path.dirname(relPath);
      const bookTema = meta.tema || (parentDir !== '.' ? humanize(path.basename(parentDir)) : null);

      const results = { inserted: 0, updated: 0, skipped: 0 };

      sections.forEach((section, i) => {
        // Id determinista: mismo archivo + misma posición → mismo nodo entre corridas.
        const id = 'node-' + crypto.createHash('sha1')
          .update(`${relPath}::${i}`).digest('hex').slice(0, 12);

        const title = section.heading || (sections.length > 1 ? `${fileTitle} — Part ${i + 1}` : fileTitle);
        // Hash sobre título+contenido: cambios de metadata también bumpean version.
        const contentHash = crypto.createHash('sha1')
          .update(`${title} ${section.content} ${meta.author || ''}`, 'utf8').digest('hex');

        const outcome = upsertNode({
          id,
          title,
          contentHash,
          author: meta.author || null,
          capitulo: meta.capitulo || chapterTitle || fileTitle,
          tema: bookTema,
          enfoque: meta.enfoque || 'Documentary',
          content: section.content,
          confidence: meta.confidence ? Number(meta.confidence) : 1.0,
          status: 'offline_ready',
          traceId: TRACE_ID,
          lastAgentId: AGENT_ID,
        });

        results[outcome]++;
        totals[outcome]++;
        totals.nodes++;
      });

      console.log(
        `  [${String(sections.length).padStart(3)}] ${relPath}` +
        `  (+${results.inserted} ~${results.updated} =${results.skipped})`
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(`\n✗ ROLLBACK — ingestion aborted: ${e.message}`);
    process.exit(1);
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM nodes').get();
  console.log(
    `\n  RESULT  inserted=${totals.inserted}  updated=${totals.updated}` +
    `  skipped=${totals.skipped}  |  nodes in db: ${count.n}\n`
  );
}

main();
