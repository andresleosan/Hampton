import { resolve } from 'node:path';
import { readSnapshot } from '../importer/sqlite.ts';
import { buildPublicSnapshot } from './build-public-snapshot.ts';
import { ACCEPTED_DATABASE_SHA256, localAgents, localListingOverrides, localTour3d } from './local-settings.ts';
import { availablePrimaryMedia, readPrimaryMediaManifest } from './primary-media.ts';

const databasePath = resolve('data/private/hampton-source-20261004.sqlite');
const curatedPath = resolve('data/private/demo-preview.json');
const outputPath = resolve('data/private/public-snapshot.json');
const reportPath = resolve('data/private/public-snapshot-report.json');
const mediaManifestPath = resolve('data/private/primary-media-cache.json');
const mediaOutputDirectory = resolve('public/preview-private/projected');

const snapshot = readSnapshot(databasePath);
const overrides = localListingOverrides(snapshot.listings);

const mediaManifest = await readPrimaryMediaManifest(mediaManifestPath);
await buildPublicSnapshot({
  databasePath, curatedPath, outputPath, reportPath, agents: localAgents, overrides,
  cachedMedia: availablePrimaryMedia(mediaManifest, mediaOutputDirectory),
  expectedDatabaseSha256: ACCEPTED_DATABASE_SHA256,
  tour3d: localTour3d,
});
console.log(`Projected ${outputPath} from the accepted private SQLite source.`);
