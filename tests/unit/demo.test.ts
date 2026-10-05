import { describe, expect, it } from 'vitest';
import type { PublicData } from '../../src/domain/public-contract.ts';
import { demoData } from '../../src/data/demo.ts';
import { validateDemoContact } from '../../src/domain/demo-contact.ts';

describe('synthetic public demo data', () => {
  it('offers the fictional harbour house through the existing public contract', () => {
    const data: PublicData = demoData;
    expect(data, 'demo data is available').toBeDefined();
    expect(data!.listings.map(item => item.public_id)).toContain('harbour-light-house');
    expect(data!.agents).toEqual([]);
    expect(data!.tour3d).toBeNull();
    for (const listing of data!.listings) {
      expect(listing.description_public).toContain('Demo property — fictional');
      expect(listing.source).toBeNull();
      expect(listing.demo).toEqual({ aerial: null, tour3d: false });
      expect(listing.media.every(media => media.public_path.startsWith('/illustrations/'))).toBe(true);
      expect(listing.figures.every(figure => figure.currency === 'GBP')).toBe(true);
    }
  });
});

describe('local demo contact validation', () => {
  it('requires a name, valid email and message with visible English errors', () => {
    expect(validateDemoContact({ name: ' ', email: 'wrong', message: '' })).toEqual({
      name: 'Enter your name.', email: 'Enter a valid email address.', message: 'Enter a message.',
    });
  });
  it('accepts trimmed valid input without returning or storing personal data', () => {
    expect(validateDemoContact({ name: ' Visitor ', email: 'visitor@example.test ', message: ' A demo viewing please. ' })).toEqual({});
  });
  it('rejects an email without a domain and an overlong message', () => {
    expect(validateDemoContact({ name: 'Visitor', email: 'visitor@', message: 'x'.repeat(2001) })).toEqual({
      email: 'Enter a valid email address.', message: 'Use 2,000 characters or fewer.',
    });
  });
});
