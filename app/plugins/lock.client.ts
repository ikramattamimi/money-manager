import { installLock } from '@/features/lock/useLock';

// Kunci PIN (fase 11 T2): setelah sesi login dimuat, kunci app kalau PIN aktif.
export default defineNuxtPlugin({
  name: 'lock',
  dependsOn: ['auth'],
  setup() {
    installLock();
  },
});
