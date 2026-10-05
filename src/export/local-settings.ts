import { experienceAgents, experienceTour3d } from '../data/experience.ts';
import type { PublicAgent } from '../domain/public-contract.ts';
import type { ListingRecord } from '../domain/types.ts';

export const ACCEPTED_DATABASE_SHA256 = '201d531ef95abe02adebab25bf78ed02c84ceae6967bcbf419af133cab216f01';

export const localAgents: PublicAgent[] = experienceAgents.map(agent => ({
  public_id: agent.id,
  name: agent.name,
  role: agent.role,
  phones: [...agent.phones],
  email: agent.email.value,
  portrait: agent.portrait ? { ...agent.portrait } : null,
}));

export const localTour3d = experienceTour3d;

export function localListingOverrides(
  listings: readonly ListingRecord[],
): Record<string, Partial<Pick<ListingRecord, 'presentationSection' | 'geography' | 'operation'>>> {
  const overrides: Record<string, Partial<Pick<ListingRecord, 'presentationSection' | 'geography' | 'operation'>>> = {};
  for (const listing of listings) {
    if (listing.title === 'Pontac Hotel' || listing.title === 'Guest House') {
      overrides[listing.key] = { presentationSection: 'commercial' };
    } else if (listing.title === 'Pathfield Road, Streatham, London') {
      overrides[listing.key] = { geography: 'international' };
    } else if (listing.title === 'Trinity rental') {
      overrides[listing.key] = { operation: 'rent' };
    }
  }
  return overrides;
}
