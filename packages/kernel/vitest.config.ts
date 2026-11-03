import { defineConfig } from 'vitest/config';

// The kernel is pure, so its tests run without a DOM, an alias or a setup file. What is asserted here is the boundary
// itself: that nothing above it has leaked down.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
