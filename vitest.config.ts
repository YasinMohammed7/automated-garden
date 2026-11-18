import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      // Table schemas are declarative: their check/index/FK callbacks are
      // evaluated only by drizzle-kit, never at runtime, so they are excluded.
      exclude: ['**/*.schema.ts'],
    },
  },
});
