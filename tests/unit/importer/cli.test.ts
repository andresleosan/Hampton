import { describe, expect, it, vi } from 'vitest';
import { main, parseCliArgs } from '../../../src/importer/cli.ts';
import type { ImportSummary } from '../../../src/importer/run.ts';

function summary(complete: boolean): ImportSummary {
  return {
    complete,
    cause: complete ? null : 'commercial: missing pages',
    outputPath: 'data/provisional.sqlite',
    runId: 'run-2026-10-04T12-00-00-000Z',
    sources: { residential: 'complete', commercial: complete ? 'complete' : 'failed', team: 'complete' },
    counts: { listings: complete ? 5 : 0, residential: 2, commercial: 3, pending: 0, errors: complete ? 0 : 1 },
    errors: complete ? [] : ['commercial: missing pages'],
  };
}

describe('importer CLI', () => {
  it('requires explicit sources and forwards repeated commercial URLs without credentials', async () => {
    const run = vi.fn(async () => summary(true));
    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await main([
      '--output', 'data/provisional.sqlite',
      '--residential', 'https://www.hamptonestatesjersey.com/residential-properties',
      '--commercial', 'https://www.hamptonestatesjersey.com/commercial-properties?page=1',
      '--commercial', 'https://www.hamptonestatesjersey.com/commercial-properties?page=2',
      '--team', 'https://www.hamptonestatesjersey.com/meet-the-team',
    ], { runImport: run, stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line) });

    expect(code).toBe(0);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      outputPath: 'data/provisional.sqlite',
      sources: {
        residentialUrl: 'https://www.hamptonestatesjersey.com/residential-properties',
        commercialUrls: [
          'https://www.hamptonestatesjersey.com/commercial-properties?page=1',
          'https://www.hamptonestatesjersey.com/commercial-properties?page=2',
        ],
        teamUrl: 'https://www.hamptonestatesjersey.com/meet-the-team',
      },
    }));
    expect(stdout.join('\n')).toContain('Import complete');
    expect(stderr).toEqual([]);
  });

  it('prints an incomplete summary and exits one', async () => {
    const stdout: string[] = [];
    const code = await main([
      '--output', 'data/provisional.sqlite',
      '--residential', 'https://www.hamptonestatesjersey.com/residential-properties',
    ], { runImport: async () => summary(false), stdout: (line) => stdout.push(line), stderr: () => undefined });

    expect(code).toBe(1);
    expect(stdout.join('\n')).toContain('Import INCOMPLETE');
  });

  it.each([
    { argv: [] },
    { argv: ['--output', 'data/provisional.sqlite'] },
    { argv: ['--output', 'data/provisional.sqlite', '--residential', 'https://user:secret@www.hamptonestatesjersey.com/residential-properties'] },
    { argv: ['--output', 'data/provisional.sqlite', '--residential', 'https://example.com/residential-properties'] },
    { argv: ['--output', 'data/provisional.sqlite', '--residential', 'https://www.hamptonestatesjersey.com/residential-properties', '--unknown', 'value'] },
  ])('rejects unsafe or incomplete arguments without running an import: $argv', async ({ argv }) => {
    const run = vi.fn(async () => summary(true));
    const stderr: string[] = [];

    const code = await main(argv, { runImport: run, stdout: () => undefined, stderr: (line) => stderr.push(line) });

    expect(code).toBe(1);
    expect(run).not.toHaveBeenCalled();
    expect(stderr.join('\n')).toContain('Usage:');
  });

  it('returns parsed options without retaining any URL credentials', () => {
    expect(parseCliArgs([
      '--output', 'snapshot.sqlite',
      '--residential', 'https://www.hamptonestatesjersey.com/residential-properties',
    ])).toEqual({
      ok: true,
      options: {
        outputPath: 'snapshot.sqlite',
        sources: { residentialUrl: 'https://www.hamptonestatesjersey.com/residential-properties' },
      },
    });
  });
});
