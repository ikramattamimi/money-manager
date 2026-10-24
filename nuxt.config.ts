// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  // App wajib login, jadi tidak butuh SSR/SEO. Server route Nitro tetap jalan
  // (impor, AI) dan di-deploy bersama aset ke satu Cloudflare Worker.
  ssr: false,

  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt', '@vite-pwa/nuxt'],

  // DM Sans (teks) dan DM Mono (contoh format ketikan) di-host sendiri
  fonts: {
    families: [
      { name: 'DM Sans', provider: 'google', weights: ['400 700'] },
      { name: 'DM Mono', provider: 'google', weights: [500] },
    ],
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Money Manager',
      meta: [
        // viewport-fit=cover supaya konten bisa memakai seluruh layar iPhone;
        // jaraknya diatur dengan env(safe-area-inset-*).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Money' },
        // Diperbarui useTheme sesuai tema aktif
        { name: 'theme-color', content: '#f2f4f9' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/icons/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-180x180.png' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      // Diisi lewat NUXT_PUBLIC_SUPABASE_URL dan NUXT_PUBLIC_SUPABASE_ANON_KEY
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: '~/components/ui',
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Money Manager',
      short_name: 'Money',
      description: 'Catat keuangan harian dengan cepat.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f2f4f9',
      theme_color: '#f2f4f9',
      icons: [
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // ssr: false di preset Worker tidak menghasilkan index.html statis untuk
      // di-precache; navigasi ditangani rule NetworkFirst di bawah.
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
        },
        {
          urlPattern: ({ request }) =>
            ['style', 'script', 'image', 'font'].includes(request.destination),
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'assets' },
        },
      ],
    },
    client: {
      installPrompt: false,
    },
    devOptions: {
      enabled: false,
    },
  },

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: false,
      nodeCompat: true,
    },
  },
});
