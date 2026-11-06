// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  // App wajib login, jadi tidak butuh SSR/SEO. Server route Nitro tetap jalan
  // (impor, AI) dan di-deploy bersama aset ke satu Cloudflare Worker.
  ssr: false,

  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt', '@vite-pwa/nuxt'],

  // Font sistem (SF) di perangkat Apple; Inter di-host sendiri untuk Windows/Android
  fonts: {
    families: [{ name: 'Inter', provider: 'google', weights: ['400 800'] }],
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
        // Sengaja tanpa black-translucent: iOS 26.1+ memburamkan konten di bawah
        // status bar transparan pada web app home screen, dan tidak ada CSS yang
        // bisa mematikannya. Dengan default, halaman mulai di bawah status bar
        // yang opak (safe-area-inset-top jadi 0). iOS membaca nilai ini saat app
        // ditambahkan, jadi app di home screen perlu dihapus lalu ditambah ulang.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Money' },
        // Diperbarui useTheme sesuai tema aktif
        { name: 'theme-color', content: '#f2f2f7' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/icons/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-180x180.png' },
      ],
    },
  },

  runtimeConfig: {
    // Hanya di server. Email undangan buku lewat Resend (NUXT_RESEND_API_KEY);
    // kosong = undangan tetap dibuat, link dibagikan manual.
    resendApiKey: '',
    mailFrom: 'Money Manager <noreply@ikrm.dev>',
    // Baca foto struk/screenshot (fase 11): NUXT_ANTHROPIC_API_KEY sebagai secret
    // Worker; kosong = fitur nonaktif. Model dan kuota harian per user bisa diganti.
    anthropicApiKey: '',
    ocrModel: 'claude-haiku-5-5',
    ocrDailyLimit: 30,
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
      background_color: '#f2f2f7',
      theme_color: '#f2f2f7',
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
