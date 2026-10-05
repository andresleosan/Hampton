import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('raster images stay within original dimensions', () => {
  it('supplies the original width to every property image surface', () => {
    for (const file of ['src/pages/index.astro', 'src/pages/property/[id].astro', 'src/components/PropertyCard.astro']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toContain('--image-width:${image.width}px');
    }
  });
  it('bounds intrinsic display width and uses a 3:2 property frame with reduced-motion-safe magnification', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain('width:min(100%,var(--image-width))');
    expect(css).toMatch(/\.property-photo-frame[^}]*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/);
    expect(css).toContain('scale(1.02)');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('uses source resolution to choose cover or intrinsic presentation for listing imagery', () => {
    for (const file of [
      'src/pages/index.astro',
      'src/pages/property/[id].astro',
      'src/components/PropertyCard.astro',
      'src/components/SimilarProperties.astro',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toMatch(/(?:heroCanCover|propertyCanCover|mediaCanCover)/);
      expect(source, file).toMatch(/media--cover|art--cover|feature--cover/);
      expect(source, file).toMatch(/media--intrinsic|art--intrinsic|feature--intrinsic/);
    }
  });

  it('builds the property gallery only from additional authorised media', () => {
    const source = readFileSync('src/pages/property/[id].astro', 'utf8');

    expect(source).toContain('class="property-gallery"');
    expect(source).toContain('class="property-thumbnails"');
    expect(source).toContain('listing.media.slice(1).map');
    expect(source).toContain('property-summary');
  });
});
