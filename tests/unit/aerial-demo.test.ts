import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/AerialDemo.astro';
const conceptImagePath = 'public/media/aerial-concept.png';

describe('illustrative aerial demo', () => {
  it('keeps every invented area visibly labelled by type and demo status', () => {
    expect(existsSync(componentPath), 'AerialDemo component exists').toBe(true);
    if (!existsSync(componentPath)) return;

    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('Illustrative aerial example - not this property');
    expect(source).toMatch(/Plot area[\s\S]*428 m&sup2;[\s\S]*demo value/);
    expect(source).toMatch(/Internal floor area[\s\S]*118 m&sup2;[\s\S]*demo value/);
    expect(source).toContain('Not a legal boundary or survey.');
    expect(source).toContain('AI-generated concept image - not a photograph');
  });

  it('associates the accessible concept with its description and invented values', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('aria-labelledby="aerial-demo-title"');
    expect(source).toContain(
      'aria-describedby="aerial-demo-description aerial-demo-plot aerial-demo-internal"',
    );
    expect(source).toContain('id="aerial-demo-plot"');
    expect(source).toContain('id="aerial-demo-internal"');
    expect(source).toContain('src="/media/aerial-concept.png"');
  });

  it('uses a local conceptual image without claiming a real location or property', () => {
    expect(existsSync(conceptImagePath), 'local aerial concept image exists').toBe(true);

    const source = readFileSync(componentPath, 'utf8');
    expect(source).not.toMatch(/Hampton|Victoria Street|Playa D.Or|Trinity/i);
    expect(source).toContain('generic, invented country home');
    expect(source).not.toMatch(/(?:href|src)=["']https?:/i);
  });
});
