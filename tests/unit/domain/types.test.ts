import { expectTypeOf, test } from 'vitest';
import type {
  AgentRecord,
  ExportSource,
  ListingRecord,
  MediaRecord,
  MoneyFigure,
  Resolution,
  ReviewItem,
  ReviewKind,
  StaleResolution,
} from '../../../src/domain/types.ts';

// expectTypeOf no hace nada en ejecución: estas aserciones las comprueba `npm run typecheck`.

test('MoneyFigure.amountPence es number | null', () => {
  expectTypeOf<MoneyFigure['amountPence']>().toEqualTypeOf<number | null>();
});

test('ListingRecord separa statusLiteral y statusNormalised', () => {
  expectTypeOf<ListingRecord['statusLiteral']>().toEqualTypeOf<string>();
  expectTypeOf<ListingRecord['statusNormalised']>().toEqualTypeOf<'open' | 'closed' | 'none'>();
});

test('notSeenInLastRun es boolean en ListingRecord y AgentRecord', () => {
  expectTypeOf<ListingRecord['notSeenInLastRun']>().toEqualTypeOf<boolean>();
  expectTypeOf<AgentRecord['notSeenInLastRun']>().toEqualTypeOf<boolean>();
});

test('AgentRecord.phones es string[] y portrait admite null', () => {
  expectTypeOf<AgentRecord['phones']>().toEqualTypeOf<string[]>();
  expectTypeOf<AgentRecord['portrait']>().toEqualTypeOf<MediaRecord | null>();
});

test('ReviewItem tiene sourceUrl y retrievedAt', () => {
  expectTypeOf<ReviewItem>().toHaveProperty('sourceUrl').toEqualTypeOf<string>();
  expectTypeOf<ReviewItem>().toHaveProperty('retrievedAt').toEqualTypeOf<string>();
});

test("ReviewKind incluye 'empty-in-source'", () => {
  expectTypeOf<'empty-in-source'>().toExtend<ReviewKind>();
});

test('Resolution.originalSha256 es string', () => {
  expectTypeOf<Resolution['originalSha256']>().toEqualTypeOf<string>();
});

test('ExportSource.staleResolutions es StaleResolution[] y su reason es cerrado', () => {
  expectTypeOf<ExportSource['staleResolutions']>().toEqualTypeOf<StaleResolution[]>();
  expectTypeOf<StaleResolution['reason']>().toEqualTypeOf<'original-changed' | 'orphan'>();
});
