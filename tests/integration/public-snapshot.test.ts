import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPublicSnapshot } from '../../src/export/build-public-snapshot.ts';
import { writeProvisionalSnapshot } from '../../src/importer/sqlite.ts';

const hash = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');

describe('deterministic public snapshot build', () => {
  it('reads SQLite without modifying it and atomically writes repeatable public data and a private report', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hampton-public-snapshot-'));
    const databasePath = join(root, 'source.sqlite');
    const curatedPath = join(root, 'curated.json');
    const outputPath = join(root, 'public-snapshot.json');
    const reportPath = join(root, 'public-snapshot-report.json');
    writeProvisionalSnapshot(databasePath, {
      listings: [{
        key: 'private-key', originSection: 'residential-listing', presentationSection: 'residential',
        geography: 'jersey', sourceOrder: 0, operation: 'sale', statusLiteral: 'FOR SALE',
        statusNormalised: 'open', title: 'Snapshot Home', locality: 'St Helier', confidential: false,
        descriptionOriginal: 'PRIVATE_SOURCE_DESCRIPTION', bedrooms: 2, bathrooms: 1,
        figures: [{ type: 'sale_price', amountPence: 500_000_00, currency: 'GBP', period: null, originalText: '£500,000', underReview: false }],
        media: [], legalNotice: null, sourceUrl: 'https://www.hamptonestatesjersey.com/residential-properties',
        retrievedOn: '2026-10-04', notSeenInLastRun: false,
      }],
      reviewItems: [],
    }, { id: 'run-1', startedAt: '2026-10-04T00:00:00Z', finishedAt: '2026-10-04T00:01:00Z' });
    await writeFile(curatedPath, JSON.stringify({ listings: [], agents: [], tour3d: null }), 'utf8');
    const before = await hash(databasePath);

    const options = {
      databasePath, curatedPath, outputPath, reportPath,
      agents: [{ public_id: 'agent-one', name: 'Agent One', role: 'Negotiator', phones: [], email: null, portrait: null }],
    };
    await expect(buildPublicSnapshot({
      ...options,
      outputPath,
      reportPath: outputPath,
    })).rejects.toThrow('Projection outputs must use distinct files');
    if (process.platform === 'win32') {
      await expect(buildPublicSnapshot({
        ...options,
        outputPath: databasePath.toUpperCase(),
      })).rejects.toThrow('source database cannot be used as a projection output');
    }
    await expect(buildPublicSnapshot({
      ...options,
      expectedDatabaseSha256: '0'.repeat(64),
    })).rejects.toThrow('Accepted SQLite hash mismatch');
    await buildPublicSnapshot(options);
    const first = await readFile(outputPath, 'utf8');
    await buildPublicSnapshot(options);
    const second = await readFile(outputPath, 'utf8');

    expect(await hash(databasePath)).toBe(before);
    expect(second).toBe(first);
    expect(first.endsWith('\n')).toBe(true);
    expect(JSON.parse(first)).toMatchObject({ agents: [{ public_id: 'agent-one' }], listings: [{ title: 'Snapshot Home' }] });
    expect(first).not.toContain('PRIVATE_SOURCE_DESCRIPTION');
    expect(JSON.parse(await readFile(reportPath, 'utf8'))).toEqual({ excluded: [], omittedValues: [] });
  });
});
