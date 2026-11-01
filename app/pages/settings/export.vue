<script setup lang="ts">
import { Download, FileSpreadsheet } from '@lucide/vue';
import FieldRow from '@/components/data/FieldRow.vue';
import { FIELD_INPUT } from '@/components/data/field';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useExportExcel } from '@/features/export/useExport';
import { fromLocalInput, jakartaParts, MONTHS_LONG, periodOf, periodRange } from '@/lib/time';

// Ekspor transaksi ke Excel dengan kolom gaya Realbyte, supaya bisa dibuka di
// Excel/Numbers atau diimpor balik ke buku lain lewat Impor Realbyte.
definePageMeta({ layout: 'app' });
useHead({ title: 'Ekspor Excel · Money Manager' });

const exporter = useExportExcel();
const toast = useToast();
const { monthStartDay } = useActiveBook();

const today = jakartaParts(new Date());
const pad = (n: number) => String(n).padStart(2, '0');
const todayInput = `${today.year}-${pad(today.month)}-${pad(today.day)}`;

const RANGES = [
  { value: 'month', label: 'Bulan ini' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'all', label: 'Semua' },
  { value: 'custom', label: 'Pilih' },
] as const;
const range = ref<(typeof RANGES)[number]['value']>('month');
const from = ref(`${today.year}-${pad(today.month)}-01`);
const to = ref(todayInput);

/** Batas [from, to) dalam ISO UTC, dihitung di zona WIB */
const bounds = computed<{ from: string | null; to: string | null; label: string } | null>(() => {
  switch (range.value) {
    case 'month': {
      // Periode bulan berjalan menurut tanggal awal bulan buku
      const p = periodOf(todayInput, monthStartDay.value);
      return {
        ...periodRange(p.year, p.month, monthStartDay.value),
        label: `${MONTHS_LONG[p.month - 1]} ${p.year}`,
      };
    }
    case 'year':
      return {
        from: periodRange(today.year, 1, monthStartDay.value).from,
        to: periodRange(today.year + 1, 1, monthStartDay.value).from,
        label: String(today.year),
      };
    case 'all':
      return { from: null, to: null, label: 'semua' };
    case 'custom': {
      if (!from.value || !to.value || from.value > to.value) return null;
      const end = new Date(fromLocalInput(`${to.value}T00:00`));
      end.setUTCDate(end.getUTCDate() + 1);
      return {
        from: fromLocalInput(`${from.value}T00:00`),
        to: end.toISOString(),
        label: `${from.value}_${to.value}`,
      };
    }
  }
  return null;
});

function download() {
  const b = bounds.value;
  if (!b) return;
  exporter.mutate(
    {
      from: b.from,
      to: b.to,
      filename: `money-manager-${b.label.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    },
    {
      onSuccess: (count) => toast.show(`${count.toLocaleString('id-ID')} transaksi diekspor`),
      onError: (error) => toast.show(error.message),
    },
  );
}

const DATE_INPUT = `${FIELD_INPUT} appearance-none [&::-webkit-date-and-time-value]:text-right`;
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Ekspor Excel"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    />

    <div class="pb-8">
      <GroupedList class="mt-3.5">
        <GroupRow
          title="File .xlsx gaya Realbyte"
          subtitle="Tanggal & jam, akun, kategori, catatan, nominal"
          :inset="58"
        >
          <template #icon
            ><ToneIcon :icon="FileSpreadsheet" tone="green" size="sm" solid
          /></template>
        </GroupRow>
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Transfer ditulis dua baris (keluar dan masuk). Bisa dibuka di Excel atau Numbers, dan
        diimpor balik lewat Impor Realbyte.
      </p>

      <GroupedList label="Rentang">
        <GroupRow>
          <Segmented v-model="range" :options="RANGES" label="Rentang" />
        </GroupRow>
        <template v-if="range === 'custom'">
          <FieldRow label="Dari" for="export-from" :label-width="64">
            <input id="export-from" v-model="from" type="date" :max="to" :class="DATE_INPUT" />
          </FieldRow>
          <FieldRow
            label="Sampai"
            for="export-to"
            :label-width="64"
            :error="bounds ? '' : 'Tanggal akhir harus setelah tanggal awal.'"
          >
            <input
              id="export-to"
              v-model="to"
              type="date"
              :min="from"
              :max="todayInput"
              :class="DATE_INPUT"
            />
          </FieldRow>
        </template>
        <GroupRow
          v-else-if="bounds"
          title="Periode"
          :value="range === 'all' ? 'Semua transaksi' : bounds.label"
        />
      </GroupedList>

      <div class="px-4 pt-4">
        <IosButton block :disabled="!bounds || exporter.isPending.value" @click="download">
          <Download aria-hidden="true" />
          {{ exporter.isPending.value ? 'Menyiapkan file…' : 'Unduh Excel' }}
        </IosButton>
      </div>
    </div>
  </div>
</template>
