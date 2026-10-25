<script setup lang="ts">
import {
  BookOpen,
  Camera,
  Download,
  History,
  Landmark,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Tag,
  Repeat,
  Smartphone,
  Upload,
  Wallet,
  Zap,
} from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import SettingRow from '@/components/data/SettingRow.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import type { ThemePreference } from '@/composables/useTheme';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { useLock } from '@/features/lock/useLock';

definePageMeta({ layout: 'app' });
useHead({ title: 'Lainnya · Money Manager' });

const { active: pinActive } = useLock();

const auth = useAuth();
const { book, role } = useActiveBook();
const categories = useCategories();

const ROLE_LABEL = { owner: 'Pemilik', editor: 'Editor', viewer: 'Hanya lihat' } as const;
const categoryCount = computed(
  () => (categories.data.value ?? []).filter((c) => !c.archived).length,
);

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

async function logout() {
  await auth.signOut();
  await navigateTo('/login', { replace: true });
}

const SECTION =
  'px-2.5 pb-1.5 pt-3.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground';
</script>

<template>
  <div class="mx-auto md:max-w-[620px]">
    <PageHeader title="Lainnya" />

    <div :class="SECTION">Buku</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow
        :icon="BookOpen"
        tone="primary"
        :title="book?.name ?? '…'"
        :subtitle="`Buku aktif${role ? ` · ${ROLE_LABEL[role]}` : ''} · ganti, undang anggota`"
        @click="navigateTo('/settings/books')"
      />
    </Card>

    <div :class="SECTION">Input cepat</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow
        :icon="Zap"
        tone="warn"
        title="Template"
        subtitle="Transaksi yang sering dicatat, satu tap"
        @click="navigateTo('/settings/templates')"
      />
      <SettingRow
        :icon="Repeat"
        tone="ok"
        title="Transaksi berulang"
        subtitle="Langganan, kos, cicilan: tercatat otomatis"
        @click="navigateTo('/settings/recurring')"
      />
      <SettingRow
        :icon="Smartphone"
        tone="primary"
        title="Shortcut iPhone"
        subtitle="Catat dari layar utama, Back Tap, atau Siri"
        @click="navigateTo('/settings/shortcuts')"
      />
    </Card>

    <div :class="SECTION">Data</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow
        :icon="Wallet"
        title="Akun"
        subtitle="Saldo, grup, urutan"
        @click="navigateTo('/accounts')"
      />
      <SettingRow
        :icon="Tag"
        title="Kategori"
        :subtitle="categoryCount ? `${categoryCount} kategori aktif` : undefined"
        @click="navigateTo('/settings/categories')"
      />
      <SettingRow
        :icon="Download"
        tone="primary"
        title="Impor dari Realbyte"
        subtitle="File .xlsx ekspor Money Manager"
        @click="navigateTo('/settings/import')"
      />
      <SettingRow
        :icon="Landmark"
        tone="primary"
        title="Impor mutasi bank"
        subtitle="PDF SeaBank atau Jago, dicocokkan otomatis"
        @click="navigateTo('/settings/import/bank')"
      />
      <SettingRow
        :icon="Camera"
        tone="primary"
        title="Baca foto struk"
        subtitle="Struk atau screenshot GoPay, ShopeePay, dibaca AI"
        @click="navigateTo('/settings/import/photo')"
      />
      <SettingRow
        :icon="History"
        title="Riwayat impor"
        subtitle="Lihat atau batalkan impor"
        @click="navigateTo('/settings/import/history')"
      />
      <SettingRow
        :icon="Upload"
        title="Ekspor Excel"
        subtitle="Unduh transaksi sebagai .xlsx"
        @click="navigateTo('/settings/export')"
      />
    </Card>

    <div :class="SECTION">Keamanan</div>
    <Card class="flex flex-col gap-0.5 p-1">
      <SettingRow
        :icon="LockKeyhole"
        title="Kunci PIN"
        :subtitle="pinActive ? 'Aktif di perangkat ini' : 'Minta PIN saat app dibuka'"
        @click="navigateTo('/settings/lock')"
      />
    </Card>

    <div :class="SECTION">Tampilan</div>
    <SegmentedControl v-model="theme" :options="THEMES" label="Tema" />

    <Card class="mt-3.5 p-1">
      <SettingRow :icon="LogOut" title="Keluar" danger @click="logout" />
    </Card>
  </div>
</template>
