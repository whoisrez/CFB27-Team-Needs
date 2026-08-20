import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    // Forge packages renderer assets from the project-level .vite directory.
    // Because this renderer uses src/ as its Vite root, explicitly step back
    // to the project root so production builds land where Electron expects.
    outDir: '../.vite/renderer/main_window',
    emptyOutDir: true,
  },
});
