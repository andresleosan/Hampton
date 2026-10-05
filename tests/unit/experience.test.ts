import { describe, expect, it } from 'vitest';
import { commercialExamples, experienceAgents, experienceTour3d } from '../../src/data/experience.ts';

describe('documented Hampton team data', () => {
  it('contains only the two people observed in source S-04', () => {
    expect(experienceAgents.map(agent => [agent.name, agent.role])).toEqual([
      ['GILBERTO FRANCO', 'Managing Director'],
      ['JOSHUA FRANCO', 'Negotiator'],
    ]);
    expect(experienceAgents.every(agent => agent.source.ref === 'S-04')).toBe(true);
  });

  it('uses only the two verified Hampton portraits and does not invent biographies or direct email addresses', () => {
    expect(experienceAgents.map(agent => agent.phones)).toEqual([
      ['07797 718199', '01534 727582'],
      ['01534 727582'],
    ]);
    expect(experienceAgents.every(agent => agent.email.value === 'francopropertiesjersey@gmail.com')).toBe(true);
    expect(experienceAgents.every(agent => agent.email.kind === 'shared-office')).toBe(true);
    expect(experienceAgents.map(agent => agent.portrait?.public_path)).toEqual([
      '/preview-private/team-gilberto.jpg',
      '/preview-private/team-joshua.jpg',
    ]);
    expect(experienceAgents.map(agent => agent.portrait?.alt)).toEqual([
      'Gilberto Franco, Managing Director',
      'Joshua Franco, Negotiator',
    ]);
    expect(experienceAgents.every(agent => agent.biography === null)).toBe(true);
  });
});

describe('documented 3D example configuration', () => {
  it('keeps the approved credited model in the public configuration', () => {
    expect(experienceTour3d).toMatchObject({
      provider_origin: 'https://sketchfab.com', model_uid: '6fc3a756dacd40af8c6e4e3b8e674ea2',
      model_title: 'Small Villa', author: 'RenderRite',
      licence: 'CC BY 4.0', evidence_ref: 'R-12', label_en: 'Example - not this property',
    });
    expect(experienceTour3d.guided_stops.map(stop => stop.label_en)).toEqual([
      'Kitchen', 'Office', 'Bathroom', 'Laundry', 'Master Bedroom',
    ]);
    expect(experienceTour3d.transit_waypoints).toHaveLength(1);
    expect(experienceTour3d.transit_waypoints[0]?.after_stop).toBe('laundry');
  });
});

describe('documented commercial examples', () => {
  it('keeps real snapshots separate from fictional demo content and current availability claims', () => {
    expect(commercialExamples.map(listing => listing.title)).toEqual([
      'Princess Garden - Town Centre Restaurant',
      'Fish & Chip Takeaway',
    ]);
    for (const listing of commercialExamples) {
      expect(listing.contentKind).toBe('verified-snapshot');
      expect(listing.source.ref).toMatch(/^S-0[78]$/);
      expect(listing.source.url).toMatch(/^https:\/\/www\.hamptonestatesjersey\.com\/commercial-properties\//);
      expect(listing.snapshotLabel).toContain('2 October 2026');
      expect(listing.availabilityNotice).toBe('Snapshot for this demo - current availability is not verified.');
    }
  });

  it('labels ambiguous published figures without turning them into sale prices', () => {
    expect(commercialExamples.map(listing => listing.figures)).toEqual([
      [
        { type: 'other', label: 'As published – under review', displayText: '£90,000', period: null, underReview: true },
        { type: 'rent', label: 'Rent', displayText: '£60,000.00', period: 'per annum', underReview: false },
      ],
      [
        { type: 'other', label: 'As published – under review', displayText: '£35,000', period: null, underReview: true },
        { type: 'rent', label: 'Rent', displayText: '£21,000', period: 'per annum', underReview: false },
      ],
    ]);
    expect(commercialExamples.map(listing => listing.statusLiteral)).toEqual(['For sale', 'For Sale']);
    expect(commercialExamples.every(listing => listing.figures.every(figure => figure.type !== 'sale_price'))).toBe(true);
  });
});
