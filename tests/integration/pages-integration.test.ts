import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  expect(existsSync(path), `${path} exists`).toBe(true);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('complete demo page integration', () => {
  it('offers the editorial collections, team and a valid demo contact route in the primary navigation', () => {
    const layout = source('src/layouts/SiteLayout.astro');

    expect(layout).toContain('<aside class="demo-banner" aria-label="Demo status">');
    expect(layout).toContain("current?: 'home' | 'residential' | 'commercial'");
    expect(layout).toContain('contactHref?: string');
    expect(layout).toContain('href="/"');
    expect(layout).toContain('href="/residential/"');
    expect(layout).toContain('href="/commercial/"');
    expect(layout).toContain('href="/#team"');
    expect(layout).toContain('href={contactHref}');
    expect(layout).toContain('class="nav-contact"');
    expect(layout).toContain("current === 'commercial' ? 'page' : undefined");
  });

  it('builds an editorial home with explicit real-or-synthetic provenance and section routes', () => {
    const home = source('src/pages/index.astro');

    expect(home).toContain('listingLabel(listing)');
    expect(home).toContain('photographLabel(listing)');
    expect(home).toContain('href="/residential/"');
    expect(home).toContain('href="/commercial/"');
    expect(home).toContain("import TeamSection from '../components/TeamSection.astro'");
    expect(home).toContain('<TeamSection agents={data.agents} />');
    expect(home).toContain('featuredResidential(data.listings)');
    expect(home).toContain('contactHref={`/property/${listing.public_id}/#booking`}');
    expect(home).toContain('heroCanCover');
    expect(home).toContain('feature--intrinsic');
  });

  it('renders projected commercial listings on their own labelled page', () => {
    const commercial = source('src/pages/commercial/index.astro');

    expect(commercial).toContain("import CommercialPreview from '../../components/CommercialPreview.astro'");
    expect(commercial).toContain('current="commercial"');
    expect(commercial).toContain('commercialListings(data.listings)');
    expect(commercial).toContain('<CommercialPreview listings={listings} />');
    expect(commercial).toContain('current availability is not verified');
    expect(commercial).toContain('contactHref={contactHref}');
  });

  it('offers the four approved residential catalogue filters over projected listings', () => {
    const residential = source('src/pages/residential/index.astro');

    for (const tab of ['for-sale', 'to-let', 'sold-let', 'international']) {
      expect(residential).toContain(`data-filter="${tab}"`);
    }
    expect(residential).toContain('data-residential-card');
    expect(residential).toContain('listing.tab');
    expect(residential).toContain('No properties to show in this section.');
    expect(residential).toContain('contactHref={contactHref}');
  });

  it('makes the single approved 3D example discoverable without enabling it on every listing', () => {
    const home = source('src/pages/index.astro');
    const residential = source('src/pages/residential/index.astro');
    const card = source('src/components/PropertyCard.astro');

    for (const page of [home, residential]) {
      expect(page).toContain('data.tour3d');
      expect(page).toContain('listing.demo.tour3d');
      expect(page).toContain('#external-example');
      expect(page).toContain('3D example - not this property');
    }
    expect(residential).toContain('showTour={Boolean(data.tour3d && listing.demo.tour3d)}');
    expect(home).toContain("the{' '}{tourListing.title}");
    expect(card).toContain('showTour');
    expect(card).toContain('Separate 3D example available');
  });

  it('composes one unambiguous property journey without Price History', () => {
    const property = source('src/pages/property/[id].astro');

    for (const component of [
      'AerialDemo',
      'MortgageCalculator',
      'SimilarProperties',
      'Tour3D',
      'BookingFlow',
      'TeamSection',
    ]) {
      expect(property, `integrates ${component}`).toContain(`<${component}`);
    }
    expect(property).not.toMatch(/Price History/i);
    expect(property).not.toContain('id="demo-contact"');
    expect(property).toContain('listingLabel(listing)');
    expect(property).toContain('Illustrative property tools');
    expect(property).toContain('External example');
    expect(property).toContain('listing.demo.tour3d && tour3d');
    expect(property).toContain('<Tour3D tour={tour3d} />');
    expect(property).toContain('<BookingFlow agents={agents} />');
    expect(property).toContain('<TeamSection agents={agents} />');
    expect(property).toContain("listing.section === 'commercial' ? '/commercial/' : '/residential/'");
    expect(property).toContain('contactHref="#booking"');
    expect(property).toContain('property-art--cover');
    expect(property).toContain('property-art--intrinsic');
  });

  it('avoids stacking page-section and component padding around the property team', () => {
    const property = source('src/pages/property/[id].astro');
    const css = source('src/styles/global.css');

    expect(property).toContain('class="experience-section experience-section--team"');
    expect(css).toMatch(/\.experience-section--team \.team-section\s*\{[^}]*padding-block:\s*0/);
  });

  it('uses the closed public calculator field rather than re-deriving eligibility in the page', () => {
    const property = source('src/pages/property/[id].astro');

    expect(property).toContain('<MortgageCalculator calculator={listing.calculator} />');
    expect(property).not.toContain('eligibleSalePrice');
  });

  it('renders every commercial figure with a normalised optional period', () => {
    const property = source('src/pages/property/[id].astro');

    expect(property).toContain("listing.section === 'commercial'");
    expect(property).toContain('listing.figures.map');
    expect(property).toContain('figurePeriodLabel(figure)');
  });

  it('provides responsive page-section spacing without weakening focus or reduced-motion rules', () => {
    const css = source('src/styles/global.css');

    expect(css).toContain('.home-paths');
    expect(css).toContain('.property-experience');
    expect(css).toContain('.commercial-page');
    expect(css).toContain('--font-display:');
    expect(css).toContain('--font-body:');
    expect(css).toContain('.media--cover');
    expect(css).toContain('.media--intrinsic');
    expect(css).toContain('.nav-contact');
    expect(css).toMatch(/\.footer-links a\s*\{[^}]*display:\s*inline-flex/);
    expect(css).toMatch(/@media\s*\(max-width:\s*599px\)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('.legal-note p:not(.eyebrow) + p');
  });
});
