import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { PublicAgent, PublicData, PublicTour3D } from '../domain/public-contract.ts';
import type { ListingRecord } from '../domain/types.ts';
import { readSnapshot } from '../importer/sqlite.ts';
import { projectPublicSnapshot } from './public-snapshot.ts';

type ListingOverride = Partial<Pick<ListingRecord, 'presentationSection' | 'geography' | 'operation'>>;

export interface BuildPublicSnapshotOptions {
  databasePath: string;
  curatedPath: string;
  outputPath: string;
  reportPath: string;
  agents: readonly PublicAgent[];
  cachedMedia?: Readonly<Record<string, PublicData['listings'][number]['media'][number]>>;
  expectedDatabaseSha256?: string;
  overrides?: Readonly<Record<string, ListingOverride>>;
  tour3d?: PublicTour3D | null;
}

export async function assertAcceptedDatabase(path: string, expectedSha256: string): Promise<void> {
  const actual = createHash('sha256').update(await readFile(path)).digest('hex');
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error('Accepted SQLite hash mismatch; projection aborted.');
  }
}

async function readCurated(path: string): Promise<PublicData> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!value || typeof value !== 'object' || !Array.isArray((value as PublicData).listings)) {
    throw new Error(`Curated preview is not valid public data: ${path}`);
  }
  return value as PublicData;
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const destination = resolve(path);
  const temporary = `${destination}.tmp-${process.pid}`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function sameLocalPath(left: string, right: string): boolean {
  return process.platform === 'win32'
    ? left.toLocaleLowerCase('en-US') === right.toLocaleLowerCase('en-US')
    : left === right;
}

export async function buildPublicSnapshot(options: BuildPublicSnapshotOptions): Promise<void> {
  const databasePath = resolve(options.databasePath);
  const outputPath = resolve(options.outputPath);
  const reportPath = resolve(options.reportPath);
  if (sameLocalPath(databasePath, outputPath) || sameLocalPath(databasePath, reportPath)) {
    throw new Error('The source database cannot be used as a projection output.');
  }
  if (sameLocalPath(outputPath, reportPath)) throw new Error('Projection outputs must use distinct files.');
  if (options.expectedDatabaseSha256) {
    await assertAcceptedDatabase(databasePath, options.expectedDatabaseSha256);
  }
  const snapshot = readSnapshot(databasePath);
  const curated = await readCurated(resolve(options.curatedPath));
  const result = projectPublicSnapshot(snapshot, {
    agents: options.agents,
    cachedMedia: options.cachedMedia,
    curatedListings: curated.listings,
    overrides: options.overrides,
    tour3d: options.tour3d === undefined ? curated.tour3d : options.tour3d,
  });
  await atomicJson(outputPath, result.data);
  await atomicJson(reportPath, result.report);
}
