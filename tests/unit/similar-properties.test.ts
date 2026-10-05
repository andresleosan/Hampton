import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/SimilarProperties.astro';

function componentSource(): string {
  expect(existsSync(componentPath), 'SimilarProperties component exists').toBe(true);
  return existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
}

describe('similar properties component', () => {
  it('resolves the approved public ids in order and limits presentation to three', () => {
    const source = componentSource();

    expect(source).toContain("import { resolveEligibleSimilarListings } from '../domain/similar.ts'");
    expect(source).toMatch(/import type \{[^}]*PublicListing[^}]*\} from '\.\.\/domain\/public-contract\.ts'/);
    expect(source).toMatch(/resolveEligibleSimilarListings\(listing,\s*listing\.similar_ids,\s*listings\)/);
    expect(source).not.toMatch(/similar_ids\.slice\(0, 3\)/);
  });

  it('omits the whole section when no compatible public listing was resolved', () => {
    const source = componentSource();

    expect(source).toMatch(/matches\.length > 0\s*&&\s*\(/);
    expect(source).toContain('aria-labelledby="similar-properties-title"');
    expect(source).toContain('id="similar-properties-title"');
    expect(source).toContain('Similar prices');
  });

  it('renders accessible linked property summaries without inventing missing facts', () => {
    const source = componentSource();

    expect(source).toContain('href={`/property/${candidate.public_id}/`}');
    expect(source).toContain('alt={image.alt}');
    expect(source).toMatch(/candidate\.bedrooms !== null/);
    expect(source).toMatch(/candidate\.bathrooms !== null/);
    expect(source).toMatch(/comparableFigure\(candidate\)/);
    expect(source).toContain('Prices are compared within the same property section and sale or rental terms.');
  });

  it('uses a compact frame for the photograph-unavailable illustration without changing real photos', () => {
    const source = componentSource();

    expect(source).toContain("image.public_path === '/illustrations/photograph-unavailable.svg'");
    expect(source).toContain("placeholder && 'card-image--placeholder'");
    expect(source).toMatch(/\.card-image--placeholder\s*\{[^}]*min-height:/);
    expect(source).toMatch(/\.card-image--placeholder img\s*\{[^}]*height:\s*8rem !important/);
  });
});
