import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMPORT_LIMITS,
  IMPORT_USER_AGENT,
  assertAllowedUrl,
  assertPublicAddresses,
} from '../../../src/importer/policy.ts';

describe('import destination policy', () => {
  it.each([
    ['https://www.hamptonestatesjersey.com/property/demo', 'page'],
    ['https://hamptonestatesjersey.com/properties', 'page'],
    ['https://static.wixstatic.com/media/demo.jpg', 'image'],
    ['https://static.wixstatic.com/robots.txt', 'robots'],
  ] as const)('allows %s as %s', (url, kind) => {
    expect(assertAllowedUrl(url, kind).href).toBe(url);
  });

  it.each([
    ['http://www.hamptonestatesjersey.com/property/demo', 'page'],
    ['https://example.com/property/demo', 'page'],
    ['https://static.wixstatic.com/media/demo.jpg', 'page'],
    ['https://www.hamptonestatesjersey.com/property/demo', 'image'],
    ['https://static.wixstatic.com/not-robots.txt', 'robots'],
    ['https://localhost/property/demo', 'page'],
    ['https://127.0.0.1/property/demo', 'page'],
  ] as const)('rejects %s as %s', (url, kind) => {
    expect(() => assertAllowedUrl(url, kind)).toThrow(/destination/i);
  });

  it.each(['127.0.0.1', '10.0.0.8', '169.254.1.1', '192.168.1.2', '::1', 'fe80::1', 'fc00::1'])(
    'rejects a host if any resolved address is not public: %s',
    (address) => {
      expect(() => assertPublicAddresses([{ address, family: address.includes(':') ? 6 : 4 }])).toThrow(/address/i);
    },
  );

  it('expresses finite request, response, retry, redirect, run and rate limits', () => {
    expect(DEFAULT_IMPORT_LIMITS).toEqual({
      requestTimeoutMs: 20_000,
      htmlMaxBytes: 5 * 1024 * 1024,
      imageMaxBytes: 15 * 1024 * 1024,
      retryDelaysMs: [2_000, 4_000],
      maxRedirects: 3,
      maxRequests: 300,
      totalMs: 20 * 60_000,
      minIntervalMs: 1_000,
    });
    expect(IMPORT_USER_AGENT).toContain('HamptonDemoImporter/0.1');
  });
});
