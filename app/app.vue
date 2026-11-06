<script setup lang="ts">
import LockScreen from '@/components/base/LockScreen.vue';
import { useAuth } from '@/features/auth/useAuth';
import { useLock } from '@/features/lock/useLock';

// Kunci PIN menutupi semua halaman, termasuk halaman form tanpa layout
const { isLoggedIn } = useAuth();
const { locked } = useLock();
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPwaManifest />
  <!-- Sumber warna status bar. iOS 26+ mewarnai status bar opak dari elemen
       fixed di tepi atas halaman (bukan theme-color); tanpa ini bisa jadi hitam.
       Warnanya sama dengan header (kartu) di HP, latar halaman di md+. -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-x-0 top-0 z-[44] h-px bg-card md:bg-background"
  />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <LockScreen v-if="locked && isLoggedIn" />
  </ClientOnly>
</template>
