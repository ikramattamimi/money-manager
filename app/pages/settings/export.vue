<script setup lang="ts">
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import FormField from '@/components/base/FormField.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useExportExcel } from '@/features/export/useExport';
import { fromLocalInput, jakartaParts, MONTHS_LONG, periodOf, periodRange } from '@/lib/time';

// Ekspor transaksi ke Excel dengan kolom gaya Realbyte, supaya bisa dibuka di
// Excel/Numbers atau diimpor balik ke buku lain.
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
</script>

<template>
  <div class="mx-auto md:max-w-[620px]">
    <PageHeader title="Ekspor Excel">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <Card class="mt-3.5 flex flex-col gap-4 p-3.5">
      <div class="flex items-start gap-3">
        <ToneIcon :icon="FileSpreadsheet" tone="ok" size="sm" />
        <p class="m-0 text-meta text-muted-foreground">
          File .xlsx dengan kolom seperti ekspor Realbyte: tanggal & jam, akun, kategori, catatan,
          nominal. Transfer ditulis dua baris (keluar dan masuk). Bisa diimpor balik lewat Impor
          Realbyte.
        </p>
      </div>

      <SegmentedControl v-model="range" :options="RANGES" label="Rentang" />

      <div v-if="range === 'custom'" class="grid grid-cols-2 gap-3">
        <FormField label="Dari" for="export-from">
          <input id="export-from" v-model="from" type="date" :max="to" class="field-input" />
        </FormField>
        <FormField
          label="Sampai"
          for="export-to"
          :error="bounds ? '' : 'Tanggal akhir harus setelah tanggal awal.'"
        >
          <input
            id="export-to"
            v-model="to"
            type="date"
            :min="from"
            :max="todayInput"
            class="field-input"
          />
        </FormField>
      </div>

      <Button size="touch" :disabled="!bounds || exporter.isPending.value" @click="download">
        <component
          :is="exporter.isPending.value ? RefreshCw : Download"
          :class="exporter.isPending.value && 'animate-spin'"
        />
        {{ exporter.isPending.value ? 'Menyiapkan file…' : 'Unduh Excel' }}
      </Button>
    </Card>
  </div>
</template>
