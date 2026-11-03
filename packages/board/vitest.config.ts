import { defineConfig } from 'vitest/config';

// The geometry's own tests. What is asserted here is arithmetic, so the floor is held where a change to a projection
// would show: a line that stops being reached is a projection nobody would notice breaking in a picture.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      // Where the tests reach today, less a margin. Branches are nearly all reached because the projection is a set of
      // decisions; the exported helpers are not all exercised, and a floor above what they reach would be a number nobody
      // could honour without writing a test for each one.
      thresholds: { statements: 42, branches: 89, functions: 34, lines: 42 },
    },
  },
});
