import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/AerialDemo.astro';
const illustrationPath = 'public/illustrations/aerial-demo.svg';

describe('illustrative aerial demo', () => {
  it('keeps every invented area visibly labelled by type and demo status', () => {
    expect(existsSync(componentPath), 'AerialDemo component exists').toBe(true);
    if (!existsSync(componentPath)) return;

    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('Illustrative boundary · demo');
    expect(source).toMatch(/Plot area[\s\S]*428 m²[\s\S]*illustrative · demo/);
    expect(source).toMatch(/Internal floor area[\s\S]*118 m²[\s\S]*illustrative · demo/);
    expect(source).toContain('Not a legal boundary or survey.');
    expect(source).toContain('Original demo illustration');
  });

  it('associates the accessible schematic with its description and invented values', () => {
    expect(existsSync(componentPath), 'AerialDemo component exists').toBe(true);
    if (!existsSync(componentPath)) return;

    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('aria-labelledby="aerial-demo-title"');
    expect(source).toContain(
      'aria-describedby="aerial-demo-description aerial-demo-plot aerial-demo-internal"',
    );
    expect(source).toContain('id="aerial-demo-plot"');
    expect(source).toContain('id="aerial-demo-internal"');
    expect(source).toContain('src="/illustrations/aerial-demo.svg"');
  });

  it('uses an original local SVG without an external image or real location', () => {
    expect(existsSync(illustrationPath), 'local aerial demo SVG exists').toBe(true);
    if (!existsSync(illustrationPath)) return;

    const svg = readFileSync(illustrationPath, 'utf8');
    expect(svg).toMatch(/<title\b[^>]*>Generic aerial-style site plan<\/title>/);
    expect(svg).toMatch(/<desc\b[^>]*>Original schematic illustration of an invented plot/);
    expect(svg).not.toMatch(/<(?:image|use)\b/i);
    expect(svg).not.toMatch(/(?:href|src)=["']https?:/i);
    expect(svg).not.toMatch(/Hampton|Victoria Street|Playa D.Or|Trinity/i);
  });
});
