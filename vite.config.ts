import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: false, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
