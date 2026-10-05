import { isIP } from 'node:net';

export type RequestKind = 'page' | 'image' | 'robots';

export const IMPORT_USER_AGENT = 'HamptonDemoImporter/0.1 (+manual demo import; contact via site owner)';

export const DEFAULT_IMPORT_LIMITS = Object.freeze({
  requestTimeoutMs: 20_000,
  htmlMaxBytes: 5 * 1024 * 1024,
  imageMaxBytes: 15 * 1024 * 1024,
  retryDelaysMs: [2_000, 4_000] as readonly number[],
  maxRedirects: 3,
  maxRequests: 300,
  totalMs: 20 * 60_000,
  minIntervalMs: 1_000,
});

const HOSTS_BY_KIND: Readonly<Record<RequestKind, readonly string[]>> = Object.freeze({
  page: Object.freeze(['www.hamptonestatesjersey.com', 'hamptonestatesjersey.com']),
  image: Object.freeze(['static.wixstatic.com']),
  robots: Object.freeze(['www.hamptonestatesjersey.com', 'hamptonestatesjersey.com', 'static.wixstatic.com']),
});

export class DestinationRejected extends Error {
  readonly url: string;

  constructor(url: string, reason: string) {
    super(`Destination rejected: ${reason} (${url})`);
    this.name = 'DestinationRejected';
    this.url = url;
  }
}

export function assertAllowedUrl(input: string | URL, kind: RequestKind): URL {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(input);
  } catch {
    throw new DestinationRejected(String(input), 'invalid URL');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new DestinationRejected(url.href, 'HTTPS is required');
  if (url.username || url.password) throw new DestinationRejected(url.href, 'credentials are forbidden');
  if (!HOSTS_BY_KIND[kind].includes(host)) throw new DestinationRejected(url.href, `host is not allowed for ${kind}`);
  if (isIP(host) !== 0 || host === 'localhost') throw new DestinationRejected(url.href, 'literal or local hosts are forbidden');
  if (kind === 'robots' && url.pathname !== '/robots.txt') {
    throw new DestinationRejected(url.href, 'robots requests are restricted to /robots.txt');
  }
  return url;
}

function blockedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts as [number, number, number, number];
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && c === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

export function isBlockedAddress(address: string, family?: number): boolean {
  const detected = family === 4 || family === 6 ? family : isIP(address);
  if (detected === 4) return blockedIpv4(address);
  if (detected !== 6) return true;
  const value = address.toLowerCase();
  if (value.startsWith('::ffff:')) return blockedIpv4(value.slice('::ffff:'.length));
  return value === '::'
    || value === '::1'
    || value.startsWith('fc')
    || value.startsWith('fd')
    || /^fe[89ab]/.test(value)
    || value.startsWith('ff')
    || value.startsWith('2001:db8:');
}

export function assertPublicAddresses(addresses: readonly { address: string; family: number }[]): void {
  if (addresses.length === 0) throw new DestinationRejected('(resolved host)', 'no resolved addresses');
  for (const result of addresses) {
    if (isBlockedAddress(result.address, result.family)) {
      throw new DestinationRejected(result.address, 'address is local, private, link-local or reserved');
    }
  }
}
