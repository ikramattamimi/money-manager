<script setup lang="ts">
import { ChartPie, Coffee, Download, Filter, Gift, Plus, Search, Settings, Star, Wallet } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import Chip from '@/components/ios/Chip.vue';
import Dock from '@/components/ios/Dock.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import MonthNav from '@/components/ios/MonthNav.vue';
import MonthPickerSheet from '@/components/ios/MonthPickerSheet.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import SubTabs from '@/components/ios/SubTabs.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';

// Katalog komponen iOS (redesign R1). Bandingkan dengan design/ios/ios.css
// dan kanvas mockup, di tema terang dan gelap (ganti dari sidebar/Lainnya).
definePageMeta({ layout: 'prototype' });

const toast = useToast();
const alert = useAlert();
const view = ref<'daily' | 'calendar' | 'weekly' | 'monthly' | 'summary'>('daily');
const kind = ref<'income' | 'expense' | 'account'>('expense');
const carry = ref(true);
const time = ref(false);
const sheetOpen = ref(false);
const dockOpen = ref(false);

const VIEWS = [
  { value: 'daily', label: 'Harian' },
  { value: 'calendar', label: 'Kalender' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'summary', label: 'Ringkasan' },
] as const;
const KINDS = [
  { value: 'income', label: 'Masuk' },
  { value: 'expense', label: 'Keluar' },
  { value: 'account', label: 'Akun' },
] as const;
const TONES: Tone[] = [
  'blue',
  'orange',
  'green',
  'amber',
  'pink',
  'purple',
  'teal',
  'indigo',
  'red',
  'gray',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Contoh geser bulan dengan data tiruan (batas maju Desember 2026)
const demoYear = ref(2026);
const demoMonth = ref(11);
const pickerOpen = ref(false);
const demoMax = 2026 * 12 + 11;
const demoIndex = computed(() => demoYear.value * 12 + demoMonth.value - 1);
function demoShift(dir: number) {
  const i = demoIndex.value + dir;
  if (i > demoMax) return;
  demoYear.value = Math.floor(i / 12);
  demoMonth.value = (i % 12) + 1;
}

async function askDelete() {
  const ok = await alert.confirm({
    title: 'Batalkan impor?',
    body: '2.987 transaksi dari impor ini akan dihapus. Tindakan ini tidak bisa diurungkan.',
    okLabel: 'Batalkan impor',
    danger: true,
  });
  toast.show(ok ? 'Contoh: impor dibatalkan' : 'Contoh: tidak jadi');
}
</script>

<template>
  <div class="-mx-3 flex flex-col pb-10 md:mx-0">
    <NavBar title="Komponen" back="Lainnya" line>
      <template #right>
        <IconButton label="Cari"><Search aria-hidden="true" /></IconButton>
        <IconButton label="Tambah" accent><Plus aria-hidden="true" /></IconButton>
      </template>
      <SubTabs v-model="view" :options="VIEWS" label="Tampilan transaksi" />
    </NavBar>
    <SummaryStrip
      :items="[
        { label: 'Pemasukan', value: 'Rp9.060.000', tone: 'inc' },
        { label: 'Pengeluaran', value: 'Rp2.170.500', tone: 'exp' },
        { label: 'Total', value: 'Rp6.889.500' },
      ]"
    />

    <!-- Geser daftar = pindah bulan, judul bulan membuka pemilih (R2) -->
    <div class="mt-3 bg-card shadow-[0_0.5px_0_var(--sep)]">
      <MonthNav
        :label="`${MONTHS[demoMonth - 1]} ${demoYear}`"
        :can-next="demoIndex < demoMax"
        @prev="demoShift(-1)"
        @next="demoShift(1)"
        @pick="pickerOpen = true"
      />
    </div>
    <MonthSwipe
      :month-key="`${demoYear}-${String(demoMonth).padStart(2, '0')}`"
      :prev-label="MONTHS[(demoMonth + 10) % 12]!"
      :next-label="MONTHS[demoMonth % 12]!"
      :can-next="demoIndex < demoMax"
      @shift="demoShift"
    >
      <GroupedList :label="`Geser bulan · ${MONTHS[demoMonth - 1]} ${demoYear}`" aside="geser kiri/kanan">
        <GroupRow
          v-for="n in 3"
          :key="n"
          :title="`Transaksi ${n} ${MONTHS[demoMonth - 1]}`"
          :value="`Rp${(n * demoMonth * 12500).toLocaleString('id-ID')}`"
          strong
          @click="toast.show(`Ketuk transaksi ${n}`)"
        />
      </GroupedList>
    </MonthSwipe>
    <MonthPickerSheet
      v-model:open="pickerOpen"
      :year="demoYear"
      :month="demoMonth"
      :current="{ year: 2026, month: 11 }"
      :max-index="demoMax"
      @pick="(y, m) => ((demoYear = y), (demoMonth = m))"
    />

    <GroupedList label="Baris grup" aside="3 akun">
      <GroupRow title="BCA" subtitle="Tabungan · 1234" value="Rp4.250.000" strong chevron to="#">
        <template #icon><ToneIcon :icon="Wallet" tone="blue" size="sm" solid /></template>
      </GroupRow>
      <GroupRow title="GoPay" value="Rp182.300" strong chevron @click="toast.show('Ketuk baris')">
        <template #icon><ToneIcon :icon="Wallet" tone="green" size="sm" solid /></template>
      </GroupRow>
      <GroupRow title="Kartu kredit" value="−Rp1.200.000" value-tone="exp" chevron to="#">
        <template #icon><ToneIcon :icon="Wallet" tone="red" size="sm" solid /></template>
      </GroupRow>
    </GroupedList>

    <GroupedList label="Pengaturan">
      <GroupRow title="Bawa sisa ke bulan berikutnya" subtitle="Carry-over hanya di tab Transaksi">
        <template #end><IosSwitch v-model="carry" label="Bawa sisa ke bulan berikutnya" /></template>
      </GroupRow>
      <GroupRow title="Input jam">
        <template #end><IosSwitch v-model="time" label="Input jam" /></template>
      </GroupRow>
      <GroupRow title="Tanggal awal bulan" subtitle="Periode Okt = 25 Sep – 24 Okt" value="25" chevron @click="toast.show('Contoh')" />
    </GroupedList>

    <GroupedList label="Lainnya">
      <GroupRow title="Pengaturan transaksi" chevron to="#">
        <template #icon><ToneIcon :icon="Settings" tone="gray" size="sm" solid /></template>
      </GroupRow>
      <GroupRow title="Bookmark" value="5" chevron to="#">
        <template #icon><ToneIcon :icon="Star" tone="orange" size="sm" solid /></template>
      </GroupRow>
      <GroupRow title="Impor data" value="3 sumber" chevron to="#">
        <template #icon><ToneIcon :icon="Download" tone="green" size="sm" solid /></template>
      </GroupRow>
    </GroupedList>

    <GroupedList label="Nada ikon · lembut dan solid">
      <div class="flex flex-wrap gap-2 p-4">
        <ToneIcon v-for="t in TONES" :key="t" :icon="Coffee" :tone="t" size="sm" />
      </div>
      <div class="flex flex-wrap gap-2 px-4 pb-4">
        <ToneIcon v-for="t in TONES" :key="t" :icon="Gift" :tone="t" size="sm" solid />
      </div>
    </GroupedList>

    <GroupedList label="Segmented dan chip">
      <div class="flex flex-col gap-3 p-4">
        <Segmented v-model="kind" :options="KINDS" label="Jenis filter" />
        <div class="flex flex-wrap gap-1.5">
          <Chip on>Agu – Okt 2026</Chip>
          <Chip @click="toast.show('Chip diketuk')">Akun: semua</Chip>
          <Chip>Kategori: semua</Chip>
          <Chip danger @click="askDelete">Batalkan</Chip>
          <Chip size="lg" on @click="() => {}">BCA</Chip>
        </div>
      </div>
    </GroupedList>

    <GroupedList label="Tombol">
      <div class="flex flex-col gap-2 p-4">
        <IosButton block @click="sheetOpen = true">Buka lembar bawah</IosButton>
        <IosButton block variant="soft" @click="toast.show('Transaksi dihapus', () => {})">
          <Download aria-hidden="true" />Tampilkan toast dengan Urungkan
        </IosButton>
        <div class="flex gap-2">
          <IosButton variant="gray" class="flex-1" @click="dockOpen = !dockOpen">Panel dock</IosButton>
          <IosButton variant="red" class="flex-1" @click="askDelete">Dialog peringatan</IosButton>
        </div>
        <IosButton block disabled>Nonaktif</IosButton>
      </div>
    </GroupedList>

    <EmptyCard title="Belum ada transaksi" description="Ketuk + atau tanggal untuk mencatat di Oktober 2026.">
      <IosButton variant="soft" @click="toast.show('Contoh')">Catat transaksi</IosButton>
    </EmptyCard>

    <div class="flex items-center justify-center gap-2 text-meta text-muted-foreground">
      <ChartPie class="size-4" aria-hidden="true" /><Filter class="size-4" aria-hidden="true" />
      Tahan tombol + untuk menu catat cepat
    </div>

    <IosSheet v-model:open="sheetOpen" title="Pilih bulan">
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="(m, i) in MONTHS"
          :key="m"
          type="button"
          :class="[
            'press h-12 rounded-xl text-body font-semibold',
            i === 9 ? 'bg-primary text-primary-foreground' : 'bg-fill',
          ]"
          @click="sheetOpen = false"
        >
          {{ m }}
        </button>
      </div>
      <template #footer>
        <IosButton block variant="gray" @click="sheetOpen = false">Kembali ke bulan ini</IosButton>
      </template>
    </IosSheet>

    <Dock
      v-if="dockOpen"
      title="Nominal"
      hint="+ − × ÷ bisa dipakai"
      :steps="{ count: 3, active: 0 }"
      @close="dockOpen = false"
    >
      <div class="grid grid-cols-4 gap-1.5 px-[5px] pb-[30px] pt-[7px]">
        <button
          v-for="k in ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '000', '0', '⌫', '+']"
          :key="k"
          type="button"
          class="h-12 rounded-[7px] bg-[var(--kb-key)] text-[23px] shadow-[0_1px_0_var(--kb-shadow)] active:bg-[var(--kb-key-press)]"
        >
          {{ k }}
        </button>
      </div>
    </Dock>
  </div>
</template>
