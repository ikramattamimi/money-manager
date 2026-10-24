import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit test untuk fungsi murni (format, parser, fisika gestur).
// Test komponen yang butuh runtime Nuxt ditambahkan nanti lewat @nuxt/test-utils.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    include: ['app/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
  },
});
