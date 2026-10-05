export type Operation = 'sale' | 'rent' | 'lease' | 'premium' | 'unknown';
export type StatusNormalised = 'open' | 'closed' | 'none';
export type Geography = 'jersey' | 'international';
export type Section = 'residential' | 'commercial';
export type OriginSection = 'residential-listing' | 'international-listing' | 'commercial-sitemap';
export type FigureType = 'sale_price' | 'rent' | 'premium' | 'turnover' | 'other';
export type Period = 'month' | 'week' | 'year' | null;
export type Tab = 'for-sale' | 'to-let' | 'sold-let' | 'international';

export interface MoneyFigure {
  type: FigureType; amountPence: number | null; currency: string | null;
  period: Period; originalText: string; underReview: boolean;
}
export interface MediaRecord {
  sourceUrl: string; sourceFileName: string; width: number; height: number; position: number;
  localPath: string | null;   // 'media/<sha256 hex 64>.<jpg|png|webp>', relativo a data/; null si no hay archivo
  alt: string | null;
}
export interface ListingRecord {
  key: string;                 // 'wix:<itemId>' | 'url:<canonical>'
  originSection: OriginSection; presentationSection: Section; geography: Geography;
  sourceOrder: number;         // posición bruta en la fuente (regla en §5.3); NO se publica tal cual
  operation: Operation; statusLiteral: string; statusNormalised: StatusNormalised;
  title: string;               // literal; '' solo si la fuente lo publica vacío (§6.6, ReviewItem 'empty-in-source')
  locality: string | null; confidential: boolean;
  descriptionOriginal: string | null;           // privado
  bedrooms: number | null; bathrooms: number | null;
  figures: MoneyFigure[]; media: MediaRecord[];
  legalNotice: { disclaimer: string; aml: string } | null;
  sourceUrl: string; retrievedOn: string;       // YYYY-MM-DD
  notSeenInLastRun: boolean;
}
export interface AgentRecord {
  key: string; name: string;   // name: '' solo si la fuente lo publica vacío (§6.6)
  role: string;
  phones: string[];            // los publicados, en su orden; nunca unidos en una cadena
  email: string | null; portrait: MediaRecord | null; sourceUrl: string;
  notSeenInLastRun: boolean;   // D-073, AC-004-16: lo escribe 001 (fusión); 009 T4e no la exporta
}
export type ReviewKind = 'figure' | 'classification' | 'status-conflict' | 'confidential-field' | 'fetch'
                       | 'empty-in-source';   // D-091, 001/009-N2: campo obligatorio publicado vacío (§6.6)
export interface ReviewItem {
  id: string; entityKey: string; field: string; kind: ReviewKind;
  originalValue: string;       // '' admitido SOLO con kind 'empty-in-source' (es el original literal); en los demás, ≠ ''
  reason: string; sourceUrl: string; retrievedAt: string;
}
export interface Resolution {      // data/private/resolutions.json (privado)
  entityKey: string;
  field: 'title' | 'description' | 'alt' | 'media' | 'classification';
  originalSha256: string;          // si el original cambia, la resolución deja de valer (pendiente reabierto)
  decision: 'approve-original' | 'approve-text' | 'approve-media' | 'set-section';
  value?: string;                  // con 'set-section': 'residential' | 'commercial' | 'international'
  mediaSourceUrl?: string;
}
export interface StaleResolution {  // resolución que no se aplica; la calcula SOLO 001 (001/009 #4)
  entityKey: string; field: Resolution['field'];
  reason: 'original-changed' | 'orphan';   // hash distinto del original actual | entidad o foto inexistente
}
export interface ExportSource {     // lo produce readAcceptedSource (001 T13c); lo consume exportPublic (009 T4)
  datasetId: string; listings: ListingRecord[]; agents: AgentRecord[];
  reviewItems: ReviewItem[];        // solo abiertos
  resolutions: Resolution[];        // solo vigentes
  staleResolutions: StaleResolution[];
}
