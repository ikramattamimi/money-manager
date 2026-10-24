import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

export default defineNuxtPlugin((nuxtApp) => {
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
});
