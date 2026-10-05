import { existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import type { ListingRecord, MoneyFigure, ReviewItem } from '../domain/types.ts';

export interface ImportSnapshot {
  listings: ListingRecord[];
  reviewItems: ReviewItem[];
}

export interface ImportRunRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
}

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = DELETE;
  CREATE TABLE listing (
    key TEXT PRIMARY KEY,
    origin_section TEXT NOT NULL,
    presentation_section TEXT NOT NULL,
    geography TEXT NOT NULL,
    source_order INTEGER NOT NULL,
    operation TEXT NOT NULL,
    status_literal TEXT NOT NULL,
    status_normalised TEXT NOT NULL,
    title TEXT NOT NULL,
    locality TEXT,
    confidential INTEGER NOT NULL CHECK (confidential IN (0, 1)),
    description_original TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    legal_notice_json TEXT,
    source_url TEXT NOT NULL,
    retrieved_on TEXT NOT NULL,
    not_seen INTEGER NOT NULL CHECK (not_seen IN (0, 1))
  ) STRICT;
  CREATE TABLE money_figure (
    listing_key TEXT NOT NULL REFERENCES listing(key) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount_pence INTEGER,
    currency TEXT,
    period TEXT,
    original_text TEXT NOT NULL,
    under_review INTEGER NOT NULL CHECK (under_review IN (0, 1)),
    PRIMARY KEY (listing_key, position)
  ) STRICT;
  CREATE TABLE media (
    listing_key TEXT NOT NULL REFERENCES listing(key) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    source_url TEXT NOT NULL,
    source_file_name TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    local_path TEXT,
    alt TEXT,
    PRIMARY KEY (listing_key, position)
  ) STRICT;
  CREATE TABLE review_item (
    id TEXT PRIMARY KEY,
    entity_key TEXT NOT NULL,
    field TEXT NOT NULL,
    kind TEXT NOT NULL,
    original_value TEXT NOT NULL CHECK (original_value <> '' OR kind = 'empty-in-source'),
    reason TEXT NOT NULL CHECK (reason <> ''),
    source_url TEXT NOT NULL CHECK (source_url <> ''),
    retrieved_at TEXT NOT NULL CHECK (retrieved_at <> '')
  ) STRICT;
  CREATE TABLE import_run (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    complete INTEGER NOT NULL CHECK (complete = 1)
  ) STRICT;
`;

function openWritable(path: string): DatabaseSync {
  const db = new DatabaseSync(path, { timeout: 5_000 });
  db.exec(SCHEMA);
  return db;
}

export function writeProvisionalSnapshot(path: string, snapshot: ImportSnapshot, run: ImportRunRecord): void {
  if (existsSync(path)) throw new Error(`Refusing to overwrite provisional database: ${path}`);
  const db = openWritable(path);
  try {
    db.exec('BEGIN IMMEDIATE');
    const insertListing = db.prepare(`INSERT INTO listing VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertFigure = db.prepare(`INSERT INTO money_figure VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertMedia = db.prepare(`INSERT INTO media VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertReview = db.prepare(`INSERT INTO review_item VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const listing of snapshot.listings) {
      insertListing.run(
        listing.key, listing.originSection, listing.presentationSection, listing.geography, listing.sourceOrder,
        listing.operation, listing.statusLiteral, listing.statusNormalised, listing.title, listing.locality,
        Number(listing.confidential), listing.descriptionOriginal, listing.bedrooms, listing.bathrooms,
        listing.legalNotice ? JSON.stringify(listing.legalNotice) : null, listing.sourceUrl, listing.retrievedOn,
        Number(listing.notSeenInLastRun),
      );
      listing.figures.forEach((figure, position) => {
        insertFigure.run(listing.key, position, figure.type, figure.amountPence, figure.currency, figure.period, figure.originalText, Number(figure.underReview));
      });
      listing.media.forEach((media) => {
        insertMedia.run(listing.key, media.position, media.sourceUrl, media.sourceFileName, media.width, media.height, media.localPath, media.alt);
      });
    }
    for (const item of snapshot.reviewItems) {
      insertReview.run(item.id, item.entityKey, item.field, item.kind, item.originalValue, item.reason, item.sourceUrl, item.retrievedAt);
    }
    db.prepare('INSERT INTO import_run VALUES (?, ?, ?, 1)').run(run.id, run.startedAt, run.finishedAt);
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* transaction may already be closed */ }
    db.close();
    rmSync(path, { force: true });
    throw error;
  }
  db.close();
}

type DbRow = Record<string, string | number | null>;

function figuresFor(db: DatabaseSync, listingKey: string): MoneyFigure[] {
  return (db.prepare('SELECT * FROM money_figure WHERE listing_key = ? ORDER BY position').all(listingKey) as DbRow[]).map((row) => ({
    type: row.type as MoneyFigure['type'],
    amountPence: row.amount_pence as number | null,
    currency: row.currency as string | null,
    period: row.period as MoneyFigure['period'],
    originalText: row.original_text as string,
    underReview: row.under_review === 1,
  }));
}

export function readSnapshot(path: string): ImportSnapshot {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const listings = (db.prepare('SELECT * FROM listing ORDER BY source_order, key').all() as DbRow[]).map((row): ListingRecord => ({
      key: row.key as string,
      originSection: row.origin_section as ListingRecord['originSection'],
      presentationSection: row.presentation_section as ListingRecord['presentationSection'],
      geography: row.geography as ListingRecord['geography'],
      sourceOrder: row.source_order as number,
      operation: row.operation as ListingRecord['operation'],
      statusLiteral: row.status_literal as string,
      statusNormalised: row.status_normalised as ListingRecord['statusNormalised'],
      title: row.title as string,
      locality: row.locality as string | null,
      confidential: row.confidential === 1,
      descriptionOriginal: row.description_original as string | null,
      bedrooms: row.bedrooms as number | null,
      bathrooms: row.bathrooms as number | null,
      figures: figuresFor(db, row.key as string),
      media: (db.prepare('SELECT * FROM media WHERE listing_key = ? ORDER BY position').all(row.key) as DbRow[]).map((media) => ({
        sourceUrl: media.source_url as string,
        sourceFileName: media.source_file_name as string,
        width: media.width as number,
        height: media.height as number,
        position: media.position as number,
        localPath: media.local_path as string | null,
        alt: media.alt as string | null,
      })),
      legalNotice: row.legal_notice_json ? JSON.parse(row.legal_notice_json as string) as ListingRecord['legalNotice'] : null,
      sourceUrl: row.source_url as string,
      retrievedOn: row.retrieved_on as string,
      notSeenInLastRun: row.not_seen === 1,
    }));
    const reviewItems = (db.prepare('SELECT * FROM review_item ORDER BY id').all() as DbRow[]).map((row): ReviewItem => ({
      id: row.id as string,
      entityKey: row.entity_key as string,
      field: row.field as string,
      kind: row.kind as ReviewItem['kind'],
      originalValue: row.original_value as string,
      reason: row.reason as string,
      sourceUrl: row.source_url as string,
      retrievedAt: row.retrieved_at as string,
    }));
    return { listings, reviewItems };
  } finally {
    db.close();
  }
}

function validateDatabase(path: string): void {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const row = db.prepare('PRAGMA integrity_check').get() as Record<string, unknown> | undefined;
    if (!row || Object.values(row)[0] !== 'ok') throw new Error(`SQLite integrity check failed for ${path}`);
    const count = db.prepare('SELECT COUNT(*) AS count FROM listing').get() as { count: number };
    if (count.count < 1) throw new Error('A provisional import cannot promote an empty listing set.');
  } finally {
    db.close();
  }
}

function canonicalSnapshot(path: string): string {
  return JSON.stringify(readSnapshot(path));
}

export async function promoteProvisional(options: {
  provisionalPath: string;
  acceptedPath: string;
  backupPath?: string;
}): Promise<void> {
  const provisionalPath = resolve(options.provisionalPath);
  const acceptedPath = resolve(options.acceptedPath);
  if (provisionalPath === acceptedPath) throw new Error('Provisional and accepted paths must differ.');
  if (dirname(provisionalPath) !== dirname(acceptedPath)) throw new Error('Atomic promotion requires both databases in the same directory.');
  validateDatabase(provisionalPath);

  if (existsSync(acceptedPath)) {
    if (!options.backupPath) throw new Error('A verified backup path is required before replacing an accepted database.');
    const backupPath = resolve(options.backupPath);
    if (existsSync(backupPath)) throw new Error(`Refusing to overwrite backup: ${backupPath}`);
    const accepted = new DatabaseSync(acceptedPath, { readOnly: true });
    try {
      await backup(accepted, backupPath);
    } finally {
      accepted.close();
    }
    validateDatabase(backupPath);
    if (canonicalSnapshot(backupPath) !== canonicalSnapshot(acceptedPath)) {
      rmSync(backupPath, { force: true });
      throw new Error('The mandatory backup does not match the accepted database.');
    }
  }

  renameSync(provisionalPath, acceptedPath);
}
