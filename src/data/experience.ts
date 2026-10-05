import type { PublicMedia, PublicTour3D } from '../domain/public-contract.ts';

export interface ExperienceSource {
  ref: 'S-04' | 'S-07' | 'S-08';
  url: string;
  checkedAt: string;
}

export interface ExperienceAgent {
  id: string;
  name: string;
  role: string;
  phones: string[];
  email: { value: string; kind: 'shared-office' };
  biography: null;
  portrait: PublicMedia | null;
  source: ExperienceSource;
}

export interface CommercialFigure {
  type: 'sale_price' | 'rent' | 'premium' | 'turnover' | 'other';
  label: 'Sale price' | 'Rent' | 'Premium' | 'Turnover' | 'Figure as published' | 'As published – under review';
  displayText: string;
  period: 'per month' | 'per week' | 'per annum' | null;
  underReview: boolean;
}

export interface CommercialExample {
  id: string;
  contentKind: 'verified-snapshot';
  title: string;
  locationPublished: string;
  statusLiteral: string;
  propertyType: string;
  figures: CommercialFigure[];
  snapshotLabel: string;
  availabilityNotice: string;
  source: ExperienceSource;
}

const sharedOfficeEmail = {
  value: 'francopropertiesjersey@gmail.com',
  kind: 'shared-office',
} as const;

const teamSource: ExperienceSource = {
  ref: 'S-04',
  url: 'https://www.hamptonestatesjersey.com/meet-the-team',
  checkedAt: '2026-10-02T23:22:05Z',
};

export const experienceAgents: ExperienceAgent[] = [
  {
    id: 'gilberto-franco',
    name: 'GILBERTO FRANCO',
    role: 'Managing Director',
    phones: ['07797 718199', '01534 727582'],
    email: sharedOfficeEmail,
    biography: null,
    portrait: {
      public_path: '/preview-private/team-gilberto.jpg',
      width: 284,
      height: 268,
      alt: 'Gilberto Franco, Managing Director',
    },
    source: teamSource,
  },
  {
    id: 'joshua-franco',
    name: 'JOSHUA FRANCO',
    role: 'Negotiator',
    phones: ['01534 727582'],
    email: sharedOfficeEmail,
    biography: null,
    portrait: {
      public_path: '/preview-private/team-joshua.jpg',
      width: 283,
      height: 271,
      alt: 'Joshua Franco, Negotiator',
    },
    source: teamSource,
  },
];

export const experienceTour3d: PublicTour3D = {
  provider_origin: 'https://sketchfab.com',
  embed_url: 'https://sketchfab.com/models/6fc3a756dacd40af8c6e4e3b8e674ea2/embed?dnt=1',
  model_uid: '6fc3a756dacd40af8c6e4e3b8e674ea2',
  model_title: 'Small Villa',
  author: 'RenderRite',
  author_url: 'https://sketchfab.com/3d-models/small-villa-6fc3a756dacd40af8c6e4e3b8e674ea2',
  licence: 'CC BY 4.0',
  licence_url: 'https://creativecommons.org/licenses/by/4.0/',
  evidence_ref: 'R-12',
  label_en: 'Example - not this property',
  guided_stops: [
    {
      id: 'kitchen', label_en: 'Kitchen',
      eye: [8.25580423150107, 9.382430095397412, 2.5048608996703736],
      target: [7.633829116821289, 10.372058866798312, 1.8075980370216995],
    },
    {
      id: 'office', label_en: 'Office',
      eye: [10.94138759308494, 9.82666635007771, 2.061231501346832],
      target: [10.195893176284622, 9.243845664935188, 1.7293951521987645],
    },
    {
      id: 'bathroom', label_en: 'Bathroom',
      eye: [10.774574918809732, 9.623196695936981, 2.375141243767048],
      target: [12.432980950806076, 8.29112077457784, 1.0260039567947388],
    },
    {
      id: 'laundry', label_en: 'Laundry',
      eye: [10.774574918809732, 9.623196695936981, 2.375141243767048],
      target: [12.711393777137562, 9.282104208441256, 1.8700034618377686],
    },
    {
      id: 'master-bedroom', label_en: 'Master Bedroom',
      eye: [9.916367353194616, 9.0250351511187, 4.132579287403914],
      target: [11.474254025664205, 9.343121245039875, 3.7200043201446533],
    },
  ],
  transit_waypoints: [{
    after_stop: 'laundry',
    eye: [9.833590821526824, 8.107527623186751, 2.7168127651083074],
    target: [9.550029754638672, 8.416084194122718, 2.4501172243589524],
  }],
};

const snapshotLabel = 'Hampton commercial listing snapshot - checked 2 October 2026';
const availabilityNotice = 'Snapshot for this demo - current availability is not verified.';

export const commercialExamples: CommercialExample[] = [
  {
    id: 'princess-garden-town-centre-restaurant',
    contentKind: 'verified-snapshot',
    title: 'Princess Garden - Town Centre Restaurant',
    locationPublished: 'Halkett Street - St Helier',
    statusLiteral: 'For sale',
    propertyType: 'Commercial',
    figures: [
      { type: 'other', label: 'As published – under review', displayText: '£90,000', period: null, underReview: true },
      { type: 'rent', label: 'Rent', displayText: '£60,000.00', period: 'per annum', underReview: false },
    ],
    snapshotLabel,
    availabilityNotice,
    source: {
      ref: 'S-07',
      url: 'https://www.hamptonestatesjersey.com/commercial-properties/princess-garden---town-centre-restaurant',
      checkedAt: '2026-10-02T23:23:21Z',
    },
  },
  {
    id: 'fish-and-chip-takeaway',
    contentKind: 'verified-snapshot',
    title: 'Fish & Chip Takeaway',
    locationPublished: 'Hill Street, St Helier, Jersey',
    statusLiteral: 'For Sale',
    propertyType: 'Restaurant',
    figures: [
      { type: 'other', label: 'As published – under review', displayText: '£35,000', period: null, underReview: true },
      { type: 'rent', label: 'Rent', displayText: '£21,000', period: 'per annum', underReview: false },
    ],
    snapshotLabel,
    availabilityNotice,
    source: {
      ref: 'S-08',
      url: 'https://www.hamptonestatesjersey.com/commercial-properties/sold---fish-%26-chip-takeaway',
      checkedAt: '2026-10-02T23:23:21Z',
    },
  },
];
