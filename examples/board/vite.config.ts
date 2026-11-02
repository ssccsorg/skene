import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The board is read at run time, so a build has to carry it beside the assets.
const board = {
  name: 'the-board-into-the-build',
  apply: 'build' as const,
  async closeBundle() {
    await copyFile(here('./projects.json'), here('./dist/projects.json'));
    await cp(here('./scenario'), here('./dist/scenario'), { recursive: true });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), board],
  server: { port: 5290, strictPort: true },
  preview: { port: 5291, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
