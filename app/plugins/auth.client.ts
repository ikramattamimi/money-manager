import { useAuth } from '@/features/auth/useAuth';

// Muat sesi dari penyimpanan lokal sebelum middleware rute berjalan.
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['vue-query'],
  async setup() {
    await useAuth().init();
  },
});
