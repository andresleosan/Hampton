import { lookup } from 'node:dns/promises';
import {
  DEFAULT_IMPORT_LIMITS,
  IMPORT_USER_AGENT,
  DestinationRejected,
  assertAllowedUrl,
  assertPublicAddresses,
  type RequestKind,
} from './policy.ts';

export interface ImportLimits {
  requestTimeoutMs: number;
  htmlMaxBytes: number;
  imageMaxBytes: number;
  retryDelaysMs: readonly number[];
  maxRedirects: number;
  maxRequests: number;
  totalMs: number;
  minIntervalMs: number;
}

export const DEFAULT_LIMITS: ImportLimits = DEFAULT_IMPORT_LIMITS;
export const USER_AGENT = IMPORT_USER_AGENT;
export const AGENT_TOKEN = 'HamptonDemoImporter';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type HttpFailureKind = 'budget' | 'destination' | 'network' | 'redirects' | 'robots' | 'size' | 'status' | 'timeout';

export class HttpFailure extends Error {
  readonly kind: HttpFailureKind;
  readonly url: string;
  readonly status?: number;

  constructor(kind: HttpFailureKind, url: string, message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpFailure';
    this.kind = kind;
    this.url = url;
    this.status = status;
  }
}

export interface HttpResult {
  url: string;
  status: number;
  headers: Headers;
  bytes: Uint8Array;
}

export interface HttpTextResult extends HttpResult {
  body: string;
}

export type RobotsAllows = (pathAndQuery: string) => boolean;

interface RobotsRule {
  allow: boolean;
  pattern: string;
  specificity: number;
  matches: (value: string) => boolean;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

function compileRobotsRule(field: string, rawPattern: string): RobotsRule | null {
  const pattern = rawPattern.trim();
  if (pattern === '') return null;
  const anchored = pattern.endsWith('$');
  const sourcePattern = anchored ? pattern.slice(0, -1) : pattern;
  const regexSource = sourcePattern
    .split('*')
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');
  const regex = new RegExp(`^${regexSource}${anchored ? '$' : ''}`);
  return {
    allow: field === 'allow',
    pattern,
    specificity: new TextEncoder().encode(sourcePattern.replaceAll('*', '')).byteLength,
    matches: (value) => regex.test(value),
  };
}

/** RFC 9309 matching for user-agent groups, Allow/Disallow, `*`, `$`, longest match and Allow ties. */
export function parseRobots(text: string, agentToken = AGENT_TOKEN): RobotsAllows {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let rulesStarted = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if ((field === 'allow' || field === 'disallow') && current) {
      rulesStarted = true;
      const rule = compileRobotsRule(field, value);
      if (rule) current.rules.push(rule);
    }
  }

  const token = agentToken.toLowerCase();
  const matches = groups
    .map((group) => ({
      group,
      specificity: Math.max(-1, ...group.agents.map((agent) => agent === '*' ? 0 : token.includes(agent) ? agent.length : -1)),
    }))
    .filter((candidate) => candidate.specificity >= 0);
  const bestSpecificity = Math.max(-1, ...matches.map((candidate) => candidate.specificity));
  const rules = matches
    .filter((candidate) => candidate.specificity === bestSpecificity)
    .flatMap((candidate) => candidate.group.rules);

  return (pathAndQuery: string): boolean => {
    const matching = rules.filter((rule) => rule.matches(pathAndQuery));
    if (matching.length === 0) return true;
    const longest = Math.max(...matching.map((rule) => rule.specificity));
    return matching.some((rule) => rule.specificity === longest && rule.allow);
  };
}

export interface HttpClient {
  get(url: string | URL, kind: RequestKind): Promise<HttpResult>;
  getText(url: string | URL, kind: Exclude<RequestKind, 'image'> | 'image'): Promise<HttpTextResult>;
  setRobots(origin: string, allows: RobotsAllows): void;
}

export interface HttpClientOptions {
  fetch?: FetchLike;
  resolve?: (hostname: string) => Promise<readonly { address: string; family: number }[]>;
  limits?: Partial<ImportLimits>;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  userAgent?: string;
  agentToken?: string;
}

function isRetryable(error: HttpFailure): boolean {
  return error.kind === 'network'
    || error.kind === 'timeout'
    || (error.kind === 'status' && error.status !== undefined
      && (error.status === 408 || error.status === 429 || error.status >= 500));
}

function asHttpFailure(error: unknown, url: string): HttpFailure {
  if (error instanceof HttpFailure) return error;
  if (error instanceof DestinationRejected) {
    return new HttpFailure('destination', url, error.message, undefined, { cause: error });
  }
  return new HttpFailure('network', url, `Network request failed for ${url}`, undefined, {
    cause: error instanceof Error ? error : undefined,
  });
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const resolve = options.resolve
    ?? (async (hostname: string) => lookup(hostname, { all: true, verbatim: true }));
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const limits: ImportLimits = { ...DEFAULT_LIMITS, ...options.limits };
  const minIntervalMs = Math.max(1_000, limits.minIntervalMs);
  const startedAt = now();
  let lastRequestAt: number | null = null;
  let requestCount = 0;
  const robots = new Map<string, Promise<RobotsAllows>>();

  function checkBudget(url: string): void {
    if (requestCount >= limits.maxRequests || now() - startedAt >= limits.totalMs) {
      throw new HttpFailure('budget', url, `Import request budget exhausted before ${url}`);
    }
  }

  async function waitForTurn(url: string): Promise<void> {
    checkBudget(url);
    if (lastRequestAt !== null) {
      const remaining = minIntervalMs - (now() - lastRequestAt);
      if (remaining > 0) await sleep(remaining);
    }
    checkBudget(url);
    lastRequestAt = now();
    requestCount += 1;
  }

  async function readBytes(response: Response, maxBytes: number, url: string): Promise<Uint8Array> {
    const declared = response.headers.get('content-length');
    if (declared !== null && Number(declared) > maxBytes) {
      throw new HttpFailure('size', url, `Response exceeds ${maxBytes} bytes: ${url}`, response.status);
    }
    if (!response.body) return new Uint8Array();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        total += item.value.byteLength;
        if (total > maxBytes) throw new HttpFailure('size', url, `Response exceeds ${maxBytes} bytes: ${url}`, response.status);
        chunks.push(item.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  async function fetchOne(url: URL, maxBytes: number): Promise<{ response: Response; bytes: Uint8Array }> {
    await waitForTurn(url.href);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const remainingBudgetMs = limits.totalMs - (now() - startedAt);
      if (remainingBudgetMs <= 0) throw new HttpFailure('budget', url.href, `Import request budget exhausted before ${url.href}`);
      const timeoutMs = Math.min(limits.requestTimeoutMs, remainingBudgetMs);
      const timeoutKind: HttpFailureKind = remainingBudgetMs <= limits.requestTimeoutMs ? 'budget' : 'timeout';
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new HttpFailure(timeoutKind, url.href,
            timeoutKind === 'budget' ? `Import time budget exhausted during ${url.href}` : `Request timed out: ${url.href}`));
        }, timeoutMs);
      });
      const requestAndBody = (async () => {
        assertPublicAddresses(await resolve(url.hostname));
        if (controller.signal.aborted) throw new HttpFailure(timeoutKind, url.href, `Request deadline passed: ${url.href}`);
        const response = await fetchImpl(url.href, {
          headers: { 'user-agent': options.userAgent ?? USER_AGENT },
          redirect: 'manual',
          signal: controller.signal,
        });
        const bytes = await readBytes(response, maxBytes, url.href);
        checkBudget(url.href);
        return { response, bytes };
      })();
      return await Promise.race([requestAndBody, timeout]);
    } catch (error) {
      throw asHttpFailure(error, url.href);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function robotsFor(origin: string): Promise<RobotsAllows> {
    const existing = robots.get(origin);
    if (existing) return existing;
    const promise = (async () => {
      const robotsUrl = new URL('/robots.txt', origin);
      try {
        const result = await requestWithRetries(robotsUrl, 'robots', false);
        if (result.status >= 400 && result.status < 500) return () => true;
        return parseRobots(new TextDecoder().decode(result.bytes), options.agentToken ?? AGENT_TOKEN);
      } catch (error) {
        const failure = asHttpFailure(error, robotsUrl.href);
        throw new HttpFailure('robots', robotsUrl.href, `robots.txt is unreachable for ${origin}: ${failure.kind}`, failure.status, { cause: failure });
      }
    })();
    robots.set(origin, promise);
    return promise;
  }

  async function requestOnce(initialUrl: URL, kind: RequestKind, applyRobots: boolean): Promise<HttpResult> {
    let current = initialUrl;
    const maxBytes = kind === 'image' ? limits.imageMaxBytes : limits.htmlMaxBytes;
    for (let hop = 0; ; hop += 1) {
      try {
        current = assertAllowedUrl(current, kind);
      } catch (error) {
        throw new HttpFailure('destination', current.href, `Rejected destination: ${current.href}`, undefined, {
          cause: error instanceof Error ? error : undefined,
        });
      }
      if (applyRobots) {
        const allows = await robotsFor(current.origin);
        if (!allows(current.pathname + current.search)) {
          throw new HttpFailure('robots', current.href, `robots.txt disallows ${current.href}`);
        }
      }
      const { response, bytes } = await fetchOne(current, maxBytes);
      if (response.status >= 300 && response.status < 400) {
        if (hop >= limits.maxRedirects) throw new HttpFailure('redirects', current.href, `Too many redirects from ${initialUrl.href}`);
        const location = response.headers.get('location');
        if (!location) throw new HttpFailure('status', current.href, `Redirect has no Location header: ${current.href}`, response.status);
        current = new URL(location, current);
        continue;
      }
      if (response.status === 408 || response.status === 429 || response.status >= 500) {
        throw new HttpFailure('status', current.href, `HTTP ${response.status} for ${current.href}`, response.status);
      }
      return { url: current.href, status: response.status, headers: response.headers, bytes };
    }
  }

  async function requestWithRetries(url: URL, kind: RequestKind, applyRobots: boolean): Promise<HttpResult> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await requestOnce(url, kind, applyRobots);
      } catch (error) {
        const failure = asHttpFailure(error, url.href);
        if (!isRetryable(failure) || attempt >= limits.retryDelaysMs.length) throw failure;
        const delay = limits.retryDelaysMs[attempt] ?? 0;
        if (delay > 0) await sleep(delay);
      }
    }
  }

  return {
    async get(url, kind) {
      let allowed: URL;
      try {
        allowed = assertAllowedUrl(url, kind);
      } catch (error) {
        throw new HttpFailure('destination', String(url), `Rejected destination: ${String(url)}`, undefined, {
          cause: error instanceof Error ? error : undefined,
        });
      }
      return requestWithRetries(allowed, kind, kind !== 'robots');
    },
    async getText(url, kind) {
      const result = await this.get(url, kind);
      return { ...result, body: new TextDecoder().decode(result.bytes) };
    },
    setRobots(origin, allows) {
      robots.set(new URL(origin).origin, Promise.resolve(allows));
    },
  };
}
