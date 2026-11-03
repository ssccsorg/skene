import { defineConfig } from 'vitest/config';

// The example's own tests: what this board declares, held to the run it names. The frame's rules live with the frame.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
