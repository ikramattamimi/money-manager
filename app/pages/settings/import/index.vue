<script setup lang="ts">
import { Camera, FileSpreadsheet, Landmark } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { batchWhen, IMPORT_SOURCE } from '@/features/import/batchStyle';
import { useImportHistory } from '@/features/import/useImport';

// Impor data (mockup import): hero, tiga sumber dengan ikon besar, lalu dua
// impor terakhir dan tautan Riwayat. Alur Realbyte ada di /settings/import/realbyte.
definePageMeta({ layout: 'app' });
useHead({ title: 'Impor data · Money Manager' });

const history = useImportHistory();
const recent = computed(() =>
  (history.data.value ?? []).filter((b) => b.status !== 'reverted').slice(0, 2),
);

const SOURCES = [
  {
    to: '/settings/import/realbyte',
    icon: FileSpreadsheet,
    tone: 'green',
    label: 'Impor dari Realbyte',
    caption: 'File .xlsx ekspor Money Manager',
  },
  {
    to: '/settings/import/bank',
    icon: Landmark,
    tone: 'blue',
    label: 'Mutasi bank',
    caption: 'PDF SeaBank atau Jago, dicocokkan otomatis',
  },
  {
    to: '/settings/import/photo',
    icon: Camera,
    tone: 'orange',
    label: 'Foto struk',
    caption: 'Struk atau screenshot GoPay, ShopeePay, dibaca AI',
  },
] as const;
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Impor data" back="Lainnya" back-to="/more" line class="sticky top-0 md:static" />

    <div class="pb-8">
      <div class="mx-5 mb-3 mt-4">
        <h2 class="m-0 text-[24px] font-bold leading-[1.15] tracking-[-0.025em]">
          Masukkan transaksi tanpa mengetik
        </h2>
        <p class="m-0 mt-1.5 text-[14px] leading-[1.45] text-muted-foreground">
          Pindahkan riwayat dari Realbyte, cocokkan mutasi bank, atau biarkan AI membaca struk.
          Semua dicek dulu sebelum disimpan.
        </p>
      </div>

      <GroupedList>
        <GroupRow
          v-for="s in SOURCES"
          :key="s.to"
          :to="s.to"
          :title="s.label"
          :subtitle="s.caption"
          chevron
          :inset="66"
          class="min-h-[74px]"
        >
          <template #icon><ToneIcon :icon="s.icon" :tone="s.tone" size="lg" solid /></template>
        </GroupRow>
      </GroupedList>

      <GroupedList label="Terakhir">
        <template #aside>
          <NuxtLink
            to="/settings/import/history"
            class="shrink-0 normal-case text-primary-accent active:opacity-50"
            >Riwayat ›</NuxtLink
          >
        </template>
        <GroupRow
          v-for="b in recent"
          :key="b.id"
          :title="b.filename || IMPORT_SOURCE[b.source].label"
          :subtitle="batchWhen(b.created_at)"
          :value="`${b.row_count.toLocaleString('id-ID')} transaksi`"
        >
          <template #icon>
            <ToneIcon
              :icon="IMPORT_SOURCE[b.source].icon"
              :tone="IMPORT_SOURCE[b.source].tone"
              size="sm"
              solid
            />
          </template>
        </GroupRow>
        <GroupRow
          v-if="!recent.length"
          :title="history.isPending.value ? 'Memuat…' : 'Belum ada impor'"
          subtitle="Impor Realbyte, mutasi, atau struk akan muncul di sini"
        />
      </GroupedList>
    </div>
  </div>
</template>
