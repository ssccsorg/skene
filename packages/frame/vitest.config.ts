import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The tests were written against the alias the applications use, so the package keeps it for them. The source itself
// imports relatively, because a package cannot depend on a consumer's alias.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      // Where the tests reach today, less a margin. The global floor is low because there are no DOM tests: the
      // components are drawn by the example rather than asserted, and a floor above what they reach would be a
      // number nobody could honour without writing those tests. The two directories that hold the frame's decisions
      // carry a floor of their own, which is where a regression would matter.
      thresholds: {
        statements: 22,
        branches: 86,
        functions: 32,
        lines: 22,
        'src/lib/**': { statements: 44, branches: 91, functions: 43, lines: 44 },
        'src/stores/**': { statements: 57, branches: 79, functions: 43, lines: 57 },
      },
    },
  },
});
