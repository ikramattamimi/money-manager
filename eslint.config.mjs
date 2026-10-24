// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    ignores: ['app/lib/database.types.ts', '.ai/**', '.wrangler/**'],
  },
  {
    // Komponen hasil generator shadcn-vue: prop opsional memang tanpa default.
    files: ['app/components/ui/**/*.vue'],
    rules: { 'vue/require-default-prop': 'off' },
  },
);
