<script setup lang="ts">
import type { Component } from 'vue';
import { LogOut, Monitor, Moon, Plus, Sun, Wallet } from '@lucide/vue';
import Avatar from '@/components/data/Avatar.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { NAV_ITEMS, navHref } from '@/lib/navigation';
import type { ThemePreference } from '@/composables/useTheme';

// Sidebar desktop (>= 1180px), port dari Opnamix Sidebar dalam versi selalu
// terbuka: gradien, item aktif kaca, tombol Catat transaksi dengan pintasan N.
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
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'system', label: 'Sistem', icon: Monitor },
  { value: 'dark', label: 'Gelap', icon: Moon },
] as const;

const NuxtLink = resolveComponent('NuxtLink');

const ITEM =
  'press grid h-9 w-full grid-cols-[2.75rem_1fr_auto] items-center rounded-[9px] text-label font-medium text-on-grad-2 hover:bg-glass hover:text-on-grad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-grad [&_svg]:size-4.5 [&_svg]:justify-self-center';
</script>

<template>
  <aside
    aria-label="Navigasi utama"
    class="fixed inset-y-0 left-0 z-45 hidden w-[232px] flex-col gap-2.5 bg-grad-side px-2.5 py-3 text-on-grad xl:flex"
  >
    <div class="grid h-11 shrink-0 grid-cols-[2.75rem_1fr] items-center">
      <span
        class="grid size-8.5 place-items-center justify-self-center rounded-[11px] bg-on-grad text-grad-ink shadow-card"
      >
        <Wallet class="size-4.5" stroke-width="2.4" aria-hidden="true" />
      </span>
      <span class="flex flex-col leading-tight">
        <b class="text-[15px] tracking-wide">Money Manager</b>
        <small class="text-xs text-on-grad-2">Buku {{ bookName }}</small>
      </span>
    </div>

    <button
      v-if="canAdd !== false"
      type="button"
      class="press mx-0.5 mb-1.5 mt-1 flex h-9.5 items-center justify-center gap-1.5 rounded-[10px] bg-on-grad text-label font-bold text-grad-ink"
      @click="emit('add')"
    >
      <Plus class="size-4" aria-hidden="true" />Catat transaksi
      <kbd class="rounded bg-grad-ink/10 px-1.5 py-px font-mono text-2xs font-semibold">N</kbd>
    </button>

    <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
      <div class="px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-widest text-on-grad-3">
        Menu
      </div>
      <NuxtLink
        v-for="item in NAV_ITEMS"
        :key="item.key"
        :to="navHref(base, item)"
        :aria-current="item.key === active ? 'page' : undefined"
        :class="[
          ITEM,
          'aria-[current=page]:bg-glass-2 aria-[current=page]:font-semibold aria-[current=page]:text-on-grad aria-[current=page]:ring-1 aria-[current=page]:ring-inset aria-[current=page]:ring-glass-line',
        ]"
      >
        <component :is="item.icon" aria-hidden="true" />
        {{ item.label }}
        <span />
      </NuxtLink>
      <template v-if="extras?.length">
        <div
          class="px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-widest text-on-grad-3"
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
          <small v-if="extra.count" class="mr-2.5 text-xs tabular-nums text-on-grad-3">{{
            extra.count
          }}</small>
        </component>
      </template>
    </nav>

    <div class="flex shrink-0 flex-col gap-2">
      <SegmentedControl
        v-model="theme"
        :options="THEMES"
        label="Tema"
        variant="on-grad"
        class="mx-0.5"
      />
      <div
        class="grid h-11 grid-cols-[2.75rem_1fr_auto] items-center rounded-xl border border-glass-line bg-glass"
      >
        <NuxtLink
          to="/settings/profile"
          class="col-span-2 grid grid-cols-[2.75rem_1fr] items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-grad"
          aria-label="Buka profil"
        >
          <Avatar
            :name="userName"
            :url="userAvatar"
            size="sm"
            class="justify-self-center bg-on-grad text-grad-ink"
          />
          <span class="flex min-w-0 flex-col leading-tight">
            <b class="truncate text-meta">{{ userName }}</b>
            <small class="truncate text-xs text-on-grad-2">{{ userRole }}</small>
          </span>
        </NuxtLink>
        <button
          type="button"
          aria-label="Keluar"
          class="press press-icon mr-1.5 grid size-7 place-items-center rounded-lg text-on-grad-2 hover:bg-glass-2 hover:text-on-grad"
          @click="emit('logout')"
        >
          <LogOut class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </aside>
</template>
