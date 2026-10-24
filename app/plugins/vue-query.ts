import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

export default defineNuxtPlugin({
  name: 'vue-query',
  setup(nuxtApp) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          // Data diperbarui saat app dibuka lagi dari latar belakang
          refetchOnWindowFocus: true,
        },
      },
    });

    nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });

    // Untuk kode di luar komponen (mis. useAuth().signOut membersihkan cache)
    return { provide: { queryClient } };
  },
});
