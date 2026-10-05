import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PublicData } from '../domain/public-contract.ts';
import { createHttpClient } from '../importer/http.ts';
import { readSnapshot } from '../importer/sqlite.ts';
import { assertAcceptedDatabase } from './build-public-snapshot.ts';
import { ACCEPTED_DATABASE_SHA256, localAgents, localListingOverrides, localTour3d } from './local-settings.ts';
import { downloadPrimaryMedia } from './primary-media.ts';
import { projectPublicSnapshot, publicIdForKey } from './public-snapshot.ts';

const databasePath = resolve('data/private/hampton-source-20261004.sqlite');
const curatedPath = resolve('data/private/demo-preview.json');
const outputDirectory = resolve('public/preview-private/projected');
const manifestPath = resolve('data/private/primary-media-cache.json');

await assertAcceptedDatabase(databasePath, ACCEPTED_DATABASE_SHA256);
const snapshot = readSnapshot(databasePath);
const curated = JSON.parse(await readFile(curatedPath, 'utf8')) as PublicData;
const projection = projectPublicSnapshot(snapshot, {
  agents: localAgents,
  curatedListings: curated.listings,
  overrides: localListingOverrides(snapshot.listings),
  tour3d: localTour3d,
});
const projectedIds = new Set(projection.data.listings.map(listing => listing.public_id));
const eligibleKeys = new Set(snapshot.listings
  .filter(listing => projectedIds.has(publicIdForKey(listing.key)))
  .map(listing => listing.key));
const http = createHttpClient({
  limits: {
    maxRequests: 100,
    totalMs: 15 * 60_000,
    minIntervalMs: 1_000,
  },
});
const manifest = await downloadPrimaryMedia({
  snapshot,
  curatedListings: curated.listings,
  eligibleKeys,
  outputDirectory,
  manifestPath,
  http,
});

console.log(`Primary photograph cache: ${Object.keys(manifest.media).length} cached, ${manifest.failures.length} failed.`);
await import('./cli.ts');
