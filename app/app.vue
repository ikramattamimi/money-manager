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
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <LockScreen v-if="locked && isLoggedIn" />
  </ClientOnly>
</template>
