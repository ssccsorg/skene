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
      // carry a floor of their own, which is where a regression would matter, and it is held high enough that a module
      // losing its own assertions is a build that fails rather than a deployment that notices later.
      // Where the tests reach today, less a margin. The floors moved down when the board, the window kinds and the
      // cockpit left with their tests: what stayed is the pane's own decisions, and the numbers are that set's. A change
      // that loses a branch of a frame decision still fails, which is what the floor is for.
      thresholds: {
        statements: 29,
        branches: 80,
        functions: 42,
        lines: 29,
        'src/lib/**': { statements: 69, branches: 82, functions: 62, lines: 69 },
        'src/stores/**': { statements: 57, branches: 78, functions: 41, lines: 57 },
      },
    },
  },
});
