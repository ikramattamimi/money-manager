<script setup lang="ts">
import {
  BookOpen,
  Download,
  Landmark,
  LogOut,
  Mic,
  Monitor,
  Moon,
  Repeat,
  Sun,
  Tag,
  Upload,
  Users,
  Zap,
} from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import SettingRow from '@/components/data/SettingRow.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import type { ThemePreference } from '@/composables/useTheme';

definePageMeta({ layout: 'prototype' });

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

const SECTION =
  'px-2.5 pb-1.5 pt-3.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground';
</script>

<template>
  <div class="mx-auto md:max-w-[620px]">
    <PageHeader title="Lainnya" />

    <div :class="SECTION">Buku</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow :icon="BookOpen" tone="primary" title="Pribadi" subtitle="Buku aktif · Pemilik" />
      <SettingRow
        :icon="Users"
        title="Anggota & undangan"
        subtitle="Berbagi buku dengan orang lain"
      />
    </Card>

    <div :class="SECTION">Input cepat</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow :icon="Zap" tone="warn" title="Template" subtitle="5 template" />
      <SettingRow
        :icon="Repeat"
        tone="ok"
        title="Transaksi berulang"
        subtitle="3 aktif · berikutnya 1 Nov"
      />
      <SettingRow :icon="Mic" tone="primary" title="Shortcut Siri" subtitle="“Catat pengeluaran”" />
    </Card>

    <div :class="SECTION">Data</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow
        :icon="Download"
        tone="primary"
        title="Impor dari Realbyte"
        subtitle="File .xlsx ekspor Money Manager"
      />
      <SettingRow :icon="Landmark" title="Impor mutasi bank" subtitle="BCA, Jago, Seabank" />
      <SettingRow :icon="Upload" title="Ekspor Excel" />
      <SettingRow :icon="Tag" title="Kategori" />
    </Card>

    <div :class="SECTION">Tampilan</div>
    <SegmentedControl v-model="theme" :options="THEMES" label="Tema" />

    <Card class="mt-3.5 p-1">
      <SettingRow :icon="LogOut" title="Keluar" danger />
    </Card>
    <p class="mt-3.5 text-center text-xs text-faint">Prototipe desain · data tiruan</p>
  </div>
</template>
