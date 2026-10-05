import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PublicData, PublicListing } from '../domain/public-contract.ts';

export const DEFAULT_PUBLIC_SNAPSHOT_PATH = 'src/data/public-snapshot.json';

export async function loadPreviewData(
  read: () => Promise<string> = () => readFile(resolve(DEFAULT_PUBLIC_SNAPSHOT_PATH), 'utf8'),
  fallback?: PublicData,
): Promise<PublicData> {
  let json: string;
  try { json = await read(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && fallback) return fallback;
    throw error;
  }
  return JSON.parse(json) as PublicData;
}

export function listingLabel(listing: PublicListing): string {
  return listing.source
    ? 'Real Hampton listing snapshot · checked 4 October 2026 · demo preview'
    : 'Demo property — fictional';
}

export function photographLabel(listing: PublicListing): string {
  if (!listing.source) return 'Demo illustration · fictional property, not a photograph';
  return listing.media[0]?.public_path === '/illustrations/photograph-unavailable.svg'
    ? 'Property photograph unavailable in this demo preview'
    : 'Verified listing snapshot · checked 4 October 2026';
}
