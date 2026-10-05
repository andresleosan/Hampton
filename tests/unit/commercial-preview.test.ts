import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/CommercialPreview.astro';

function componentSource(): string {
  expect(existsSync(componentPath), 'CommercialPreview component exists').toBe(true);
  return existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
}

describe('commercial snapshot preview', () => {
  it('renders projected commercial listings and keeps every published figure in its own row', () => {
    const source = componentSource();

    expect(source).toContain("import type { PublicListing } from '../domain/public-contract.ts'");
    expect(source).toContain('listings.map');
    expect(source).toContain('listing.figures.map');
    expect(source).toContain('<dl class="figure-list">');
    expect(source).toContain('<div class="figure-row">');
    expect(source).toContain('{figure.label_en}');
    expect(source).toContain('{figure.display_text}');
    expect(source).toContain('figurePeriodLabel(figure)');
  });

  it('shows snapshot, demo, availability and confidentiality boundaries', () => {
    const source = componentSource();

    expect(source).toContain('current availability is not verified');
    expect(source).toContain('Verified public snapshots shown for this demo.');
    expect(source).toContain('Confidential locations and descriptions are withheld.');
  });

  it('uses only source URLs from the projected public contract', () => {
    const source = componentSource();

    expect(source).toContain('href={listing.source.url}');
    expect(source).not.toMatch(/href=["']https?:/i);
  });

  it('leads each public commercial card with its available photograph and local detail route', () => {
    const source = componentSource();

    expect(source).toContain('const image = listing.media[0]');
    expect(source).toContain('mediaCanCover(image)');
    expect(source).toContain('src={image.public_path}');
    expect(source).toContain('width={image.width}');
    expect(source).toContain('height={image.height}');
    expect(source).toContain("'media--cover'");
    expect(source).toContain("'media--intrinsic'");
    expect(source).toContain('href={`/property/${listing.public_id}/`}');
  });
});
