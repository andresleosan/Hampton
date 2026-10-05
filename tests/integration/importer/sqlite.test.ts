import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEmbeddedListings } from '../../../src/importer/parser.ts';
import {
  promoteProvisional,
  readSnapshot,
  writeProvisionalSnapshot,
} from '../../../src/importer/sqlite.ts';

const fixturePath = new URL('../../fixtures/importer/embedded-listings.html', import.meta.url);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function parsedSnapshot() {
  const parsed = parseEmbeddedListings(readFileSync(fixturePath, 'utf8'), {
    sourceUrl: 'https://www.hamptonestatesjersey.com/properties',
    retrievedAt: '2026-10-04T12:00:00.000Z',
    originSection: 'residential-listing',
  });
  if (!parsed.ok) throw new Error(parsed.cause);
  return { listings: parsed.records, reviewItems: parsed.review };
}

describe('provisional SQLite promotion', () => {
  it('writes the provisional database transactionally and promotes it as the accepted snapshot', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hampton-importer-'));
    roots.push(root);
    const provisionalPath = join(root, 'run-1.provisional.sqlite');
    const acceptedPath = join(root, 'accepted.sqlite');

    writeProvisionalSnapshot(provisionalPath, parsedSnapshot(), {
      id: 'run-1',
      startedAt: '2026-10-04T12:00:00.000Z',
      finishedAt: '2026-10-04T12:00:01.000Z',
    });
    await promoteProvisional({ provisionalPath, acceptedPath });

    const accepted = readSnapshot(acceptedPath);
    expect(accepted.listings.map((listing) => listing.key)).toEqual([
      'wix:victoria-street-demo',
      'wix:trinity-rental-demo',
    ]);
    expect(accepted.listings[1]?.figures[0]?.amountPence).toBe(190_000);
  });

  it('backs up an existing accepted database before atomically replacing it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hampton-importer-'));
    roots.push(root);
    const acceptedPath = join(root, 'accepted.sqlite');
    const provisionalPath = join(root, 'run-2.provisional.sqlite');
    const backupPath = join(root, 'accepted.before-run-2.sqlite');
    const first = parsedSnapshot();
    writeProvisionalSnapshot(acceptedPath, first, {
      id: 'run-1', startedAt: '2026-10-04T12:00:00.000Z', finishedAt: '2026-10-04T12:00:01.000Z',
    });
    const second = parsedSnapshot();
    second.listings[0] = { ...second.listings[0]!, statusLiteral: 'SOLD', statusNormalised: 'closed' };
    writeProvisionalSnapshot(provisionalPath, second, {
      id: 'run-2', startedAt: '2026-10-04T13:00:00.000Z', finishedAt: '2026-10-04T13:00:01.000Z',
    });

    await promoteProvisional({ provisionalPath, acceptedPath, backupPath });

    expect(readSnapshot(backupPath).listings[0]?.statusLiteral).toBe('FOR SALE');
    expect(readSnapshot(acceptedPath).listings[0]?.statusLiteral).toBe('SOLD');
  });

  it('leaves the accepted database byte-for-byte unchanged when provisional validation fails', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hampton-importer-'));
    roots.push(root);
    const acceptedPath = join(root, 'accepted.sqlite');
    const provisionalPath = join(root, 'broken.provisional.sqlite');
    writeProvisionalSnapshot(acceptedPath, parsedSnapshot(), {
      id: 'run-1', startedAt: '2026-10-04T12:00:00.000Z', finishedAt: '2026-10-04T12:00:01.000Z',
    });
    const before = readFileSync(acceptedPath);
    writeFileSync(provisionalPath, 'not sqlite');

    await expect(promoteProvisional({ provisionalPath, acceptedPath, backupPath: join(root, 'unused.sqlite') })).rejects.toThrow();
    expect(readFileSync(acceptedPath)).toEqual(before);
  });
});
