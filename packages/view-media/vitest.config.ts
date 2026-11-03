import { defineConfig } from 'vitest/config';

// The kind's own tests. The frame is reached by its package name, so a test here reads the frame the way a deployment
// does and cannot reach a module the frame does not export.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
