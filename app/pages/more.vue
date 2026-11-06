<script setup lang="ts">
import type { Component } from 'vue';
import {
  ChartPie,
  CloudUpload,
  Download,
  History,
  LockKeyhole,
  LogOut,
  Palette,
  Repeat,
  Settings,
  Shapes,
  Sigma,
  Smartphone,
  Star,
  Upload,
  Wallet,
} from '@lucide/vue';
import Avatar from '@/components/data/Avatar.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { IosTone } from '@/components/data/tone';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveBook } from '@/features/books/useActiveBook';
import { ROLE_LABEL, useBookMembers } from '@/features/books/useBookAdmin';
import { useCategories } from '@/features/categories/useCategories';
import { useImportHistory } from '@/features/import/useImport';
import { useLock } from '@/features/lock/useLock';
import { useProfile } from '@/features/profile/useProfile';
import { useRecurringRules } from '@/features/recurring/useRecurring';
import { useTemplates } from '@/features/templates/useTemplates';

// Lainnya (mockup more): judul besar, baris buku di atas, lalu grup
// pengaturan dengan ikon solid berwarna seperti Pengaturan iOS. Nilai kanan
// diambil dari data yang sudah dimuat. Baris yang belum ada fiturnya (Tag,
// Mata uang, Ikon aplikasi) tidak ditampilkan.
definePageMeta({ layout: 'app' });
useHead({ title: 'Lainnya · Money Manager' });

const auth = useAuth();
const profile = useProfile();
const { book, bookId, role } = useActiveBook();
const members = useBookMembers(bookId);
const lock = useLock();
const categories = useCategories();
const accounts = useAccounts();
const rules = useRecurringRules();
const templates = useTemplates();
const history = useImportHistory();
const { preference } = useTheme();

const THEME_LABEL = { light: 'Terang', dark: 'Gelap', system: 'Sistem' } as const;
const count = (n: number | undefined, unit = '') => (n ? `${n}${unit}` : '');

const bookCaption = computed(() =>
  [
    role.value ? ROLE_LABEL[role.value] : '',
    members.data.value ? `${members.data.value.length} anggota` : '',
    'ganti buku, undang',
  ]
    .filter(Boolean)
    .join(' · '),
);

interface Row {
  icon: Component;
  tone: IosTone;
  label: string;
  value?: string;
  to: string;
}
const groups = computed<{ label: string; rows: Row[] }[]>(() => [
  {
    label: 'Transaksi',
    rows: [
      { icon: Settings, tone: 'gray', label: 'Pengaturan transaksi', to: '/settings/transactions' },
      {
        icon: Repeat,
        tone: 'purple',
        label: 'Ulangi & cicilan',
        value: count(rules.data.value?.filter((r) => r.active).length, ' aktif'),
        to: '/settings/recurring',
      },
      {
        icon: Star,
        tone: 'orange',
        label: 'Bookmark',
        value: count(templates.data.value?.length),
        to: '/settings/templates',
      },
    ],
  },
  {
    label: 'Data',
    rows: [
      {
        icon: Wallet,
        tone: 'blue',
        label: 'Akun & grup akun',
        value: count(accounts.active.value.length, ' akun'),
        to: '/accounts/groups',
      },
      {
        icon: Sigma,
        tone: 'indigo',
        label: 'Total akun',
        value: count(accounts.totalViews.value.length, ' total'),
        to: '/accounts/totals',
      },
      {
        icon: Shapes,
        tone: 'green',
        label: 'Kategori',
        value: count((categories.data.value ?? []).filter((c) => !c.archived).length),
        to: '/settings/categories',
      },
      { icon: ChartPie, tone: 'red', label: 'Budget', to: '/stats/budget' },
    ],
  },
  {
    label: 'Tampilan & keamanan',
    rows: [
      {
        icon: Palette,
        tone: 'pink',
        label: 'Gaya & warna',
        value: THEME_LABEL[preference.value],
        to: '/settings/appearance',
      },
      {
        icon: LockKeyhole,
        tone: 'gray',
        label: 'Kode sandi',
        value: lock.active.value ? 'PIN' : 'Mati',
        to: '/settings/lock',
      },
    ],
  },
  {
    label: 'Cadangan & impor',
    rows: [
      {
        icon: Download,
        tone: 'green',
        label: 'Impor data',
        value: '3 sumber',
        to: '/settings/import',
      },
      {
        icon: History,
        tone: 'orange',
        label: 'Riwayat impor',
        value: count(history.data.value?.length, ' impor'),
        to: '/settings/import/history',
      },
      {
        icon: CloudUpload,
        tone: 'blue',
        label: 'Backup & pulihkan',
        value: 'File',
        to: '/settings/backup',
      },
      { icon: Upload, tone: 'teal', label: 'Ekspor Excel', to: '/settings/export' },
      { icon: Smartphone, tone: 'blue', label: 'Pintasan iOS', to: '/settings/shortcuts' },
    ],
  },
]);

async function logout() {
  await auth.signOut();
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <!-- Bar kartu biasa seperti tab lain (bukan judul besar di atas latar halaman),
         supaya status bar opak yang diwarnai dari tepi atas menyatu dengan header -->
    <NavBar title="Lainnya" line class="sticky top-0 md:static" />

    <div class="pb-6">
      <GroupedList class="mt-6">
        <GroupRow to="/settings/books" chevron class="min-h-[72px]" :inset="80">
          <template #icon>
            <span
              class="grid size-[52px] shrink-0 place-items-center rounded-full bg-primary text-sheet font-bold text-primary-foreground"
              aria-hidden="true"
            >
              {{ (book?.name ?? '?').slice(0, 2).toUpperCase() }}
            </span>
          </template>
          <b class="truncate text-[18px] font-semibold tracking-[-0.01em]">{{
            book?.name ?? 'Buku'
          }}</b>
          <span class="truncate text-meta text-muted-foreground">{{ bookCaption }}</span>
        </GroupRow>
      </GroupedList>

      <GroupedList v-for="g in groups" :key="g.label" :label="g.label">
        <GroupRow
          v-for="r in g.rows"
          :key="r.label"
          :to="r.to"
          :title="r.label"
          :value="r.value"
          chevron
        >
          <template #icon><ToneIcon :icon="r.icon" :tone="r.tone" size="sm" solid /></template>
        </GroupRow>
      </GroupedList>

      <GroupedList label="Profil">
        <GroupRow to="/settings/profile" chevron :inset="64">
          <template #icon>
            <Avatar :name="profile.displayName.value" :url="profile.avatarUrl.value" />
          </template>
          <b class="truncate text-row font-medium tracking-[-0.01em]">{{
            profile.displayName.value
          }}</b>
          <span class="truncate text-meta text-muted-foreground">{{
            auth.user.value?.email ?? 'Profil'
          }}</span>
        </GroupRow>
      </GroupedList>

      <GroupedList class="mt-[18px]">
        <GroupRow @click="logout">
          <template #icon><ToneIcon :icon="LogOut" tone="red" size="sm" solid /></template>
          <b class="text-row font-medium text-exp">Keluar</b>
        </GroupRow>
      </GroupedList>
    </div>
  </div>
</template>
