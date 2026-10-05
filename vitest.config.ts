import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 30_000 } });
