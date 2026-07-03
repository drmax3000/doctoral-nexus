/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * DOCTORAL NEXUS — DATA LAYER (SQLite vía node:sqlite, Node >= 22.5)
 *
 * CJS a propósito: este módulo lo consumen DOS runtimes:
 *   1. Rutas API de Expo Router (bundle de servidor Metro, corre en Node).
 *   2. Scripts de ingestión puros (node scripts/ingest_knowledge.js).
 *
 * createRequire con anclaje en process.cwd() garantiza que 'node:sqlite'
 * se resuelva en runtime Node real, fuera del grafo estático de Metro.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('node:module');

const nodeRequire = createRequire(path.join(process.cwd(), '__nexus_anchor__.js'));
const { DatabaseSync } = nodeRequire('node:sqlite');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nexus.db');

const DIMENSIONS = ['THEORETICAL', 'METHODOLOGICAL', 'EMPIRICAL', 'ANALYTICAL'];

let _db = null;
let _fts = false;

/* ═══════════════════════════════ BOOTSTRAP ═══════════════════════════════ */

function getDb() {
  if (_db) return _db;

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  // WAL: lecturas concurrentes (API) + escritor único (ingestión/agentes) sin bloqueo.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      author        TEXT,
      capitulo      TEXT,
      tema          TEXT,
      enfoque       TEXT,
      content       TEXT NOT NULL DEFAULT '',
      content_hash  TEXT NOT NULL DEFAULT '',
      confidence    REAL NOT NULL DEFAULT 1.0,
      version       INTEGER NOT NULL DEFAULT 1,
      status        TEXT NOT NULL DEFAULT 'offline_ready'
                    CHECK (status IN ('offline_ready','processing','cloud_sync','error')),
      trace_id      TEXT,
      last_agent_id TEXT,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS observations (
      id         TEXT PRIMARY KEY,
      text       TEXT NOT NULL CHECK (length(trim(text)) > 0),
      dimension  TEXT NOT NULL CHECK (dimension IN ('THEORETICAL','METHODOLOGICAL','EMPIRICAL','ANALYTICAL')),
      node_id    TEXT REFERENCES nodes(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_observations_created ON observations (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_observations_node    ON observations (node_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_author         ON nodes (author);
  `);

  // FTS5 con degradación elegante: si el build de SQLite no lo trae, caemos a LIKE.
  try {
    const uv = db.prepare('PRAGMA user_version').get();
    if (Number(uv.user_version) < 1) {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
          title, author, capitulo, tema, enfoque, content,
          content='nodes', content_rowid='rowid',
          tokenize='unicode61 remove_diacritics 2'
        );
        CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
          INSERT INTO nodes_fts(rowid, title, author, capitulo, tema, enfoque, content)
          VALUES (new.rowid, new.title, new.author, new.capitulo, new.tema, new.enfoque, new.content);
        END;
        CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
          INSERT INTO nodes_fts(nodes_fts, rowid, title, author, capitulo, tema, enfoque, content)
          VALUES ('delete', old.rowid, old.title, old.author, old.capitulo, old.tema, old.enfoque, old.content);
        END;
        CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
          INSERT INTO nodes_fts(nodes_fts, rowid, title, author, capitulo, tema, enfoque, content)
          VALUES ('delete', old.rowid, old.title, old.author, old.capitulo, old.tema, old.enfoque, old.content);
          INSERT INTO nodes_fts(rowid, title, author, capitulo, tema, enfoque, content)
          VALUES (new.rowid, new.title, new.author, new.capitulo, new.tema, new.enfoque, new.content);
        END;
        INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild');
        PRAGMA user_version = 1;
      `);
    }
    _fts = true;
  } catch (e) {
    _fts = false;
    console.warn('[nexus-db] FTS5 unavailable, falling back to LIKE search:', e.message);
  }

  _db = db;
  return db;
}

function hasFts() {
  getDb();
  return _fts;
}

/* ═══════════════════════════════ MAPPERS ═══════════════════════════════ */

function rowToNode(r, withContent) {
  const base = {
    id: r.id,
    title: r.title,
    author: r.author,
    capitulo: r.capitulo,
    tema: r.tema,
    enfoque: r.enfoque,
    status: r.status,
    confidence: r.confidence,
    version: r.version,
    traceId: r.trace_id,
    lastAgentId: r.last_agent_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
  if (withContent) base.content = r.content;
  else base.excerpt = r.excerpt != null ? r.excerpt : undefined;
  return base;
}

function rowToObservation(r) {
  return {
    id: r.id,
    text: r.text,
    dimension: r.dimension,
    createdAt: r.created_at,
    source: r.node_id
      ? { nodeId: r.node_id, title: r.src_title, author: r.src_author, capitulo: r.src_capitulo }
      : undefined,
  };
}

/* ═══════════════════════════════ NODES ═══════════════════════════════ */

const NODE_LIST_COLS = `
  id, title, author, capitulo, tema, enfoque, status, confidence, version,
  trace_id, last_agent_id, created_at, updated_at,
  substr(content, 1, 220) AS excerpt
`;

// Lista SIN content masivo: el payload de la Library se mantiene liviano.
// El detalle (getNodeById) entrega el texto completo.
function listNodes(q) {
  const db = getDb();

  if (q && q.trim()) {
    if (_fts) {
      // Tokens con prefijo entrecomillados: inmune a sintaxis MATCH maliciosa.
      const match = q
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(t => `"${t}"*`)
        .join(' ');
      if (match) {
        const rows = db.prepare(`
          SELECT ${NODE_LIST_COLS}
          FROM nodes
          WHERE rowid IN (SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?)
          ORDER BY updated_at DESC
        `).all(match);
        return rows.map(r => rowToNode(r, false));
      }
    }
    const like = `%${q.trim()}%`;
    const rows = db.prepare(`
      SELECT ${NODE_LIST_COLS}
      FROM nodes
      WHERE title LIKE ?1 OR author LIKE ?1 OR capitulo LIKE ?1
         OR tema LIKE ?1 OR enfoque LIKE ?1 OR content LIKE ?1
      ORDER BY updated_at DESC
    `).all(like);
    return rows.map(r => rowToNode(r, false));
  }

  const rows = db.prepare(
    `SELECT ${NODE_LIST_COLS} FROM nodes ORDER BY author, capitulo, title`
  ).all();
  return rows.map(r => rowToNode(r, false));
}

function getNodeById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  return row ? rowToNode(row, true) : null;
}

/**
 * Upsert idempotente para el motor de ingestión y los agentes.
 * - Nodo nuevo → INSERT (version 1).
 * - Hash de contenido idéntico → skip (re-ejecutar la ingestión es gratis).
 * - Hash distinto → UPDATE + version++.
 */
function upsertNode(n) {
  const db = getDb();
  const contentHash = n.contentHash
    || crypto.createHash('sha1').update(n.content, 'utf8').digest('hex');

  const existing = db.prepare('SELECT content_hash FROM nodes WHERE id = ?').get(n.id);

  if (!existing) {
    db.prepare(`
      INSERT INTO nodes (id, title, author, capitulo, tema, enfoque, content,
                         content_hash, confidence, status, trace_id, last_agent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      n.id, n.title, n.author ?? null, n.capitulo ?? null, n.tema ?? null,
      n.enfoque ?? null, n.content, contentHash,
      n.confidence ?? 1.0, n.status ?? 'offline_ready',
      n.traceId ?? null, n.lastAgentId ?? null,
    );
    return 'inserted';
  }

  if (existing.content_hash === contentHash) return 'skipped';

  db.prepare(`
    UPDATE nodes
    SET title = ?, author = ?, capitulo = ?, tema = ?, enfoque = ?,
        content = ?, content_hash = ?, confidence = ?,
        version = version + 1, status = ?,
        trace_id = ?, last_agent_id = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(
    n.title, n.author ?? null, n.capitulo ?? null, n.tema ?? null, n.enfoque ?? null,
    n.content, contentHash, n.confidence ?? 1.0, n.status ?? 'offline_ready',
    n.traceId ?? null, n.lastAgentId ?? null, n.id,
  );
  return 'updated';
}

/* ═══════════════════════════ OBSERVATIONS ═══════════════════════════ */

const OBS_JOIN = `
  SELECT o.id, o.text, o.dimension, o.node_id, o.created_at,
         n.title AS src_title, n.author AS src_author, n.capitulo AS src_capitulo
  FROM observations o
  LEFT JOIN nodes n ON n.id = o.node_id
`;

function listObservations() {
  const db = getDb();
  return db.prepare(`${OBS_JOIN} ORDER BY o.created_at DESC`).all().map(rowToObservation);
}

function createObservation({ text, dimension, nodeId }) {
  const db = getDb();

  if (!text || !text.trim()) {
    const err = new Error('OBSERVATION_TEXT_EMPTY'); err.status = 400; throw err;
  }
  if (!DIMENSIONS.includes(dimension)) {
    const err = new Error('INVALID_DIMENSION'); err.status = 400; throw err;
  }

  // FK suave: si el nodo de origen no existe, se guarda sin vínculo — la
  // observación del doctorante jamás se rechaza por un id huérfano.
  let validNodeId = null;
  if (nodeId) {
    const hit = db.prepare('SELECT 1 AS ok FROM nodes WHERE id = ?').get(nodeId);
    validNodeId = hit ? nodeId : null;
  }

  const id = `obs-${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO observations (id, text, dimension, node_id) VALUES (?, ?, ?, ?)'
  ).run(id, text.trim(), dimension, validNodeId);

  const row = db.prepare(`${OBS_JOIN} WHERE o.id = ?`).get(id);
  return rowToObservation(row);
}

/* ═══════════════════════════════ EXPORTS ═══════════════════════════════ */

module.exports = {
  getDb,
  hasFts,
  DB_PATH,
  DIMENSIONS,
  listNodes,
  getNodeById,
  upsertNode,
  listObservations,
  createObservation,
};
