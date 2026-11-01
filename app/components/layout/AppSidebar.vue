<script setup lang="ts">
import type { Component } from 'vue';
import { LogOut, Plus, Wallet } from '@lucide/vue';
import Avatar from '@/components/data/Avatar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { NAV_ITEMS, navHref } from '@/lib/navigation';
import type { ThemePreference } from '@/composables/useTheme';

// Sidebar desktop (>= 1180px) gaya sidebar iPadOS/macOS: latar kartu solid,
// baris dengan sorotan aksen lembut, tombol Catat transaksi dengan pintasan N,
// pilihan tema, profil.
export interface SidebarExtra {
  label: string;
  icon: Component;
  count?: number;
  /** Ada = tautan ke halaman ini; tanpa ini tombol belum aktif (fitur fase berikutnya) */
  to?: string;
}

defineProps<{
  base: string;
  active: string;
  bookName: string;
  userName: string;
  userAvatar?: string | null;
  userRole: string;
  extras?: SidebarExtra[];
  canAdd?: boolean;
}>();
const emit = defineEmits<{ add: []; logout: [] }>();

const { preference, setTheme } = useTheme();
const theme = computed({
  get: () => preference.value,
  set: (value: ThemePreference) => setTheme(value),
});
const THEMES = [
  { value: 'light', label: 'Terang' },
  { value: 'system', label: 'Sistem' },
  { value: 'dark', label: 'Gelap' },
] as const;

const NuxtLink = resolveComponent('NuxtLink');

const ITEM =
  'grid h-10 w-full grid-cols-[2.5rem_1fr_auto] items-center rounded-[10px] text-body font-medium text-foreground transition-[background-color] duration-[120ms] hover:bg-fill-press active:bg-fill-press focus-visible:outline-2 focus-visible:outline-primary-accent [&_svg]:size-[19px] [&_svg]:justify-self-center [&_svg]:text-primary-accent';
</script>

<template>
  <aside
    aria-label="Navigasi utama"
    class="fixed inset-y-0 left-0 z-45 hidden w-[232px] flex-col gap-2.5 bg-card px-2.5 py-3 shadow-[0.5px_0_0_var(--sep)] xl:flex"
  >
    <div class="grid h-11 shrink-0 grid-cols-[2.5rem_1fr] items-center">
      <span
        class="grid size-8 place-items-center justify-self-center rounded-[9px] bg-primary text-primary-foreground"
      >
        <Wallet class="size-[18px]" stroke-width="2.2" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-col leading-tight">
        <b class="text-body font-semibold tracking-[-0.01em]">Money Manager</b>
        <small class="truncate text-xs text-muted-foreground">Buku {{ bookName }}</small>
      </span>
    </div>

    <button
      v-if="canAdd !== false"
      type="button"
      class="press mx-0.5 mb-1.5 mt-1 flex h-10 items-center justify-center gap-1.5 rounded-[11px] bg-primary text-body font-semibold text-primary-foreground"
      @click="emit('add')"
    >
      <Plus class="size-[18px]" stroke-width="2.4" aria-hidden="true" />Catat transaksi
      <kbd
        class="rounded bg-primary-foreground/20 px-1.5 py-px font-mono text-2xs font-semibold"
        >N</kbd
      >
    </button>

    <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
      <NuxtLink
        v-for="item in NAV_ITEMS"
        :key="item.key"
        :to="navHref(base, item)"
        :aria-current="item.key === active ? 'page' : undefined"
        :class="[
          ITEM,
          'aria-[current=page]:bg-[var(--tab-on)] aria-[current=page]:font-semibold aria-[current=page]:text-primary-accent',
        ]"
      >
        <component :is="item.icon" aria-hidden="true" />
        {{ item.label }}
        <span />
      </NuxtLink>
      <template v-if="extras?.length">
        <div
          class="px-3 pb-1 pt-4 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
        >
          Input cepat
        </div>
        <component
          :is="extra.to ? NuxtLink : 'button'"
          v-for="extra in extras"
          :key="extra.label"
          :type="extra.to ? undefined : 'button'"
          :to="extra.to"
          :class="ITEM"
        >
          <component :is="extra.icon" aria-hidden="true" />
          <span class="text-left">{{ extra.label }}</span>
          <small v-if="extra.count" class="mr-2.5 text-xs text-muted-foreground">{{
            extra.count
          }}</small>
        </component>
      </template>
    </nav>

    <div class="flex shrink-0 flex-col gap-2">
      <Segmented v-model="theme" :options="THEMES" label="Tema" class="mx-0.5" />
      <div class="grid h-12 grid-cols-[2.75rem_1fr_auto] items-center rounded-xl bg-background">
        <NuxtLink
          to="/settings/profile"
          class="col-span-2 grid grid-cols-[2.75rem_1fr] items-center rounded-xl focus-visible:outline-2 focus-visible:outline-primary-accent"
          aria-label="Buka profil"
        >
          <Avatar
            :name="userName"
            :url="userAvatar"
            size="sm"
            class="justify-self-center bg-primary text-primary-foreground"
          />
          <span class="flex min-w-0 flex-col leading-tight">
            <b class="truncate text-meta font-semibold">{{ userName }}</b>
            <small class="truncate text-xs text-muted-foreground">{{ userRole }}</small>
          </span>
        </NuxtLink>
        <button
          type="button"
          aria-label="Keluar"
          class="press press-icon mr-1.5 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-fill-press hover:text-foreground"
          @click="emit('logout')"
        >
          <LogOut class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </aside>
</template>
