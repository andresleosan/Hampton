import type { FigureType, Geography, Operation, Period, Section, StatusNormalised, Tab } from './types.ts';

export interface PublicMedia { public_path: string; width: number; height: number; alt: string }
export interface PublicFigure {
  type: FigureType; amount: number | null; currency: string | null; period: Period;
  label_en: string; display_text: string; under_review: boolean;
}
export interface PublicArea { kind: 'plot' | 'internal'; value_m2: number; label_en: string }
export interface PublicAerialRef {
  image: PublicMedia; image_is_this_property: boolean; credit: string; licence: string;
  licence_url: string; source_url: string; polygon: [number, number][]; areas: PublicArea[]; boundary_label_en: string;
}
export interface PublicDemo { aerial: PublicAerialRef | null; tour3d: boolean }
export interface PublicListing {
  public_id: string; section: Section; geography: Geography; tab: Tab | null; source_order: number;
  operation: Operation; status_literal: string; status_normalised: StatusNormalised;
  title: string; locality: string | null; description_public: string | null; description_withheld: boolean;
  bedrooms: number | null; bathrooms: number | null; figures: PublicFigure[]; media: PublicMedia[];
  legal_notice: { disclaimer: string; aml: string } | null; source: { url: string; retrieved_on: string } | null;
  similar_ids: string[]; calculator: { price_gbp: number } | null; demo: PublicDemo;
}
export interface PublicAgent {
  public_id: string; name: string; role: string; phones: string[]; email: string | null; portrait: PublicMedia | null;
}
export type PublicTourVector = [number, number, number];
export type PublicTourStopId = 'kitchen' | 'office' | 'bathroom' | 'laundry' | 'master-bedroom';
export interface PublicTourStop {
  id: PublicTourStopId;
  label_en: 'Kitchen' | 'Office' | 'Bathroom' | 'Laundry' | 'Master Bedroom';
  eye: PublicTourVector;
  target: PublicTourVector;
}
export interface PublicTourTransitWaypoint {
  after_stop: PublicTourStopId;
  eye: PublicTourVector;
  target: PublicTourVector;
}
export interface PublicTour3D {
  provider_origin: string; embed_url: string; model_uid: string; model_title: string; author: string;
  author_url: string; licence: string; licence_url: string; evidence_ref: string; label_en: 'Example - not this property';
  guided_stops: PublicTourStop[]; transit_waypoints: PublicTourTransitWaypoint[];
}
export interface PublicData { listings: PublicListing[]; agents: PublicAgent[]; tour3d: PublicTour3D | null }
