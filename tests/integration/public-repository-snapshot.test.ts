import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PublicData } from '../../src/domain/public-contract.ts';

const snapshotPath = 'src/data/public-snapshot.json';

function publicSnapshot(): PublicData {
  expect(existsSync(snapshotPath), `${snapshotPath} exists`).toBe(true);
  return JSON.parse(readFileSync(snapshotPath, 'utf8')) as PublicData;
}

describe('public repository snapshot', () => {
  it('contains the approved filtered catalogue, team and demo configuration', () => {
    const data = publicSnapshot();

    expect(data.listings).toHaveLength(42);
    expect(data.agents).toHaveLength(2);
    expect(data.tour3d).not.toBeNull();
  });

  it('references exactly the 45 approved versioned photographs and no private path', () => {
    const data = publicSnapshot();
    const paths = [
      ...data.listings.flatMap(listing => listing.media.map(media => media.public_path)),
      ...data.agents.flatMap(agent => agent.portrait ? [agent.portrait.public_path] : []),
    ];
    const photographs = [...new Set(paths.filter(path => !path.startsWith('/illustrations/')))];

    expect(photographs).toHaveLength(45);
    for (const path of photographs) {
      expect(path).toMatch(/^\/media\/(?:listings|team)\/[a-z0-9.-]+$/);
      expect(path).not.toContain('preview-private');
      expect(existsSync(`public${path}`), `public${path} exists`).toBe(true);
    }
  });

  it('keeps the committed pnpm configuration portable', () => {
    const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');

    expect(workspace).not.toMatch(/\bstoreDir\s*:/);
    expect(workspace).not.toMatch(/[A-Za-z]:\\/);
  });
});
