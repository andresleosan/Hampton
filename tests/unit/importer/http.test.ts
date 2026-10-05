import { describe, expect, it, vi } from 'vitest';
import {
  createHttpClient,
  parseRobots,
} from '../../../src/importer/http.ts';

const origin = 'https://www.hamptonestatesjersey.com';
const publicResolve = async () => [{ address: '93.184.216.34', family: 4 }];

function response(body: BodyInit | null, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers });
}

describe('parseRobots', () => {
  it('uses the most specific user-agent group and longest matching rule, with Allow winning a tie', () => {
    const allows = parseRobots(`
      User-agent: *
      Disallow: /private

      User-agent: HamptonDemoImporter
      Disallow: /documents/*.pdf$
      Allow: /documents/public.pdf$
    `, 'HamptonDemoImporter');

    expect(allows('/private')).toBe(true);
    expect(allows('/documents/terms.pdf')).toBe(false);
    expect(allows('/documents/terms.pdf?download=1')).toBe(true);
    expect(allows('/documents/public.pdf')).toBe(true);
  });
});

describe('createHttpClient', () => {
  it('rejects a private DNS resolution before the real transport can fetch', async () => {
    const fetch = vi.fn(async () => response('<html>must not load</html>'));
    const client = createHttpClient({
      fetch,
      resolve: async () => [{ address: '127.0.0.1', family: 4 }],
      limits: { retryDelaysMs: [] },
    });

    await expect(client.getText(`${origin}/residential-properties`, 'page'))
      .rejects.toMatchObject({ kind: 'robots' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats an unavailable 403 robots file as allow-all', async () => {
    const hits: string[] = [];
    const fetch = async (input: string | URL): Promise<Response> => {
      const url = String(input);
      hits.push(url);
      return url.endsWith('/robots.txt') ? response('', 403) : response('<html>ok</html>');
    };
    let time = 0;
    const client = createHttpClient({
      fetch,
      resolve: publicResolve,
      now: () => time,
      sleep: async (ms) => { time += ms; },
    });

    const result = await client.getText(`${origin}/residential-properties`, 'page');

    expect(result.body).toBe('<html>ok</html>');
    expect(hits).toEqual([`${origin}/robots.txt`, `${origin}/residential-properties`]);
  });

  it.each(['status', 'network'] as const)('blocks the origin when robots is unreachable by %s after retries', async (failure) => {
    const hits: string[] = [];
    const fetch = async (input: string | URL): Promise<Response> => {
      hits.push(String(input));
      if (failure === 'network') throw new TypeError('socket unavailable');
      return response('temporary failure', 503);
    };
    let time = 0;
    const client = createHttpClient({
      fetch,
      resolve: publicResolve,
      now: () => time,
      sleep: async (ms) => { time += ms; },
      limits: { retryDelaysMs: [0, 0] },
    });

    await expect(client.getText(`${origin}/residential-properties`, 'page')).rejects.toMatchObject({ kind: 'robots' });
    expect(hits).toHaveLength(3);
    expect(hits.every((url) => url.endsWith('/robots.txt'))).toBe(true);
  });

  it('enforces at least one second between requests and retries transient page failures', async () => {
    const requestTimes: number[] = [];
    let pageAttempts = 0;
    let time = 0;
    const fetch = async (input: string | URL): Promise<Response> => {
      requestTimes.push(time);
      if (String(input).endsWith('/robots.txt')) return response('', 404);
      pageAttempts += 1;
      return pageAttempts < 3 ? response('retry', 503) : response('done');
    };
    const client = createHttpClient({
      fetch,
      resolve: publicResolve,
      now: () => time,
      sleep: async (ms) => { time += ms; },
      limits: { minIntervalMs: 1, retryDelaysMs: [0, 0] },
    });

    const result = await client.getText(`${origin}/residential-properties`, 'page');

    expect(result.body).toBe('done');
    expect(requestTimes).toEqual([0, 1_000, 2_000, 3_000]);
  });

  it('validates every redirect against the allowlist before fetching it', async () => {
    const hits: string[] = [];
    const fetch = async (input: string | URL): Promise<Response> => {
      const url = String(input);
      hits.push(url);
      if (url.endsWith('/robots.txt')) return response('', 404);
      return response(null, 302, { location: 'https://example.com/private' });
    };
    let time = 0;
    const client = createHttpClient({ fetch, resolve: publicResolve, now: () => time, sleep: async (ms) => { time += ms; } });

    await expect(client.getText(`${origin}/start`, 'page')).rejects.toMatchObject({ kind: 'destination' });
    expect(hits).toEqual([`${origin}/robots.txt`, `${origin}/start`]);
  });

  it('stops before a response exceeds the configured byte limit', async () => {
    const fetch = async (input: string | URL): Promise<Response> => String(input).endsWith('/robots.txt')
      ? response('', 404)
      : response('12345', 200, { 'content-length': '5' });
    let time = 0;
    const client = createHttpClient({
      fetch,
      resolve: publicResolve,
      now: () => time,
      sleep: async (ms) => { time += ms; },
      limits: { htmlMaxBytes: 4 },
    });

    await expect(client.getText(`${origin}/large`, 'page')).rejects.toMatchObject({ kind: 'size' });
  });

  it('applies the request timeout while the response body is still streaming', async () => {
    const fetch = async (input: string | URL): Promise<Response> => {
      if (String(input).endsWith('/robots.txt')) return response('', 404);
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode('late'));
            controller.close();
          }, 25);
        },
      });
      return response(body);
    };
    let time = 0;
    const client = createHttpClient({
      fetch,
      resolve: publicResolve,
      now: () => time,
      sleep: async (ms) => { time += ms; },
      limits: { requestTimeoutMs: 5, retryDelaysMs: [] },
    });

    await expect(client.getText(`${origin}/slow-body`, 'page')).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('aborts a response that crosses the total import deadline', async () => {
    const fetch = async (): Promise<Response> => response(new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode('too late'));
          controller.close();
        }, 25);
      },
    }));
    const client = createHttpClient({
      fetch,
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      limits: { totalMs: 5, requestTimeoutMs: 1_000, retryDelaysMs: [] },
    });
    client.setRobots(origin, () => true);

    await expect(client.getText(`${origin}/slow-total`, 'page')).rejects.toMatchObject({ kind: 'budget' });
  });
});
