import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function componentSource(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('team section component', () => {
  const source = componentSource('src/components/TeamSection.astro');

  it('renders every agent from the public snapshot rather than importing another source', () => {
    expect(source).toContain("import type { PublicAgent } from '../domain/public-contract.ts'");
    expect(source).toMatch(/agents\.map\(\(agent\) =>/);
    expect(source).not.toContain('experienceAgents');
    expect(source).toContain('{agent.name}');
    expect(source).toContain('{agent.role}');
  });

  it('renders verified portraits with a text fallback and keeps published contact details inert', () => {
    expect(source).toContain('data-agent-monogram');
    expect(source).toContain('agent.portrait ?');
    expect(source).toMatch(/<img\b/i);
    expect(source).toContain('src={agent.portrait.public_path}');
    expect(source).toContain('width={agent.portrait.width}');
    expect(source).toContain('height={agent.portrait.height}');
    expect(source).toContain('alt={agent.portrait.alt}');
    expect(source).toContain('filter: grayscale(1)');
    expect(source).toContain('agent.phones.map');
    expect(source).toContain('agent.email');
    expect(source).not.toMatch(/href=["'](?:mailto|tel|sms):/i);
  });

  it('labels the snapshot and explains why contact details are not links', () => {
    expect(source).toContain('Team snapshot');
    expect(source).toContain('Demo');
    expect(source).toContain('shown as text');
  });
});

describe('booking flow component', () => {
  const source = componentSource('src/components/BookingFlow.astro');

  it('provides the approved four-step booking flow and fictional confirmation', () => {
    expect(source).toContain('data-booking-flow');
    expect(source).toContain('1. Agent');
    expect(source).toContain('2. Date and time');
    expect(source).toContain('3. Your details');
    expect(source).toContain('4. Review');
    expect(source).toContain('Demo - nothing has been sent');
    expect(source).toContain('agents.map');
    expect(source).not.toContain('experienceAgents');
  });

  it('uses non-submitting controls with accessible personal-detail fields', () => {
    expect(source).toMatch(/<form\b[^>]*\bnovalidate\b/);
    expect(source).not.toMatch(/<form\b[^>]*\baction=/);
    expect(source).not.toMatch(/<button(?![^>]*\btype=["']button["'])[^>]*>/);
    expect(source).toContain('autocomplete="name"');
    expect(source).toContain('autocomplete="email"');
    expect(source).toContain('autocomplete="tel"');
    expect(source).toContain('aria-live="polite"');
  });

  it('initialises the in-memory controller without embedding a network or storage boundary', () => {
    expect(source).toContain("import { initBookingFlows } from './booking-flow.ts'");
    expect(source).toContain('initBookingFlows();');
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|caches)\b/);
  });
});
