import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/Tour3D.astro';
function componentSource(): string {
  expect(existsSync(componentPath), 'Tour3D component exists').toBe(true);
  return existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
}

function initialMarkup(source: string): string {
  const templateStart = source.indexOf('---', 3) + 3;
  const scriptStart = source.indexOf('<script>', templateStart);
  return source.slice(templateStart, scriptStart === -1 ? undefined : scriptStart);
}

describe('on-demand 3D tour example', () => {
  it('renders no iframe or remote src before the visitor activates the tour', () => {
    const source = componentSource();
    const markup = initialMarkup(source);

    expect(markup).not.toMatch(/<iframe\b/i);
    expect(markup).not.toMatch(/\bsrc\s*=\s*["']https?:/i);
    expect(source).toContain('Load 3D tour (example)');
    expect(source).toContain("document.createElement('iframe')");
    expect(source).toContain("document.createElement('script')");
    expect(source).toContain('https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js');
    expect(source).toContain('iframe.tabIndex = 0');
    expect(source).toContain('iframe.focus()');
    expect(source).toContain('tour.embed_url');
    expect(markup).not.toContain('data-model-uid');
    expect(source).toContain('const embedUrl = root.dataset.embedUrl');
    expect(source).toContain("embed.pathname.match(/^\\/models\\/([a-f0-9]{32})\\/embed$/)");
  });

  it('provides an automatic guided sequence with pause, resume and manual room controls', () => {
    const source = componentSource();
    const markup = initialMarkup(source);

    expect(markup).toContain('data-tour3d-toggle');
    expect(markup).toContain('data-tour3d-room');
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-pressed="false"');
    expect(source).toContain('setCameraLookAt');
    expect(source).toContain('getCameraLookAt((error, camera) =>');
    expect(source).toContain('if (error || !camera)');
    expect(source).toContain('setUserInteraction');
    expect(source).toContain('tour.guided_stops');
    expect(source).toContain('tour.transit_waypoints');
    expect(source).toContain('SEGMENT_MS = 100');
    expect(source).toContain("api.addEventListener('camerastop'");
    expect(source).toContain('initialCameraSettled');
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('Guided tour paused. Manual controls enabled.');
  });

  it('keeps the example boundary, author and CC BY 4.0 attribution visible without loading the embed', () => {
    const markup = initialMarkup(componentSource());

    expect(markup).toContain('{tour.label_en}');
    expect(markup).toContain('{tour.author}');
    expect(markup).toContain('href={tour.licence_url}');
    expect(markup).toContain("under{' '}");
    expect(markup).toContain('{tour.licence}');
    expect(markup).toContain('href={tour.author_url}');
  });

  it('exposes load progress and a fallback without granting device permissions', () => {
    const source = componentSource();
    const markup = initialMarkup(source);

    expect(markup).toMatch(/role="status"[^>]*aria-live="polite"/);
    expect(markup).toContain('Open the credited example on Sketchfab');
    expect(source).toContain('Loading 3D tour…');
    expect(source).toContain('3D tour loaded.');
    expect(source).toContain('taking longer than expected');
    expect(source).not.toMatch(/\ballow\s*=/i);
    expect(source).not.toMatch(/iframe\.allow\b/i);
  });
});
