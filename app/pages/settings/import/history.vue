<script setup lang="ts">
import ToneIcon from '@/components/data/ToneIcon.vue';
import Chip from '@/components/ios/Chip.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { ImportBatch } from '@/features/import/api';
import { batchWhen, IMPORT_SOURCE } from '@/features/import/batchStyle';
import { useImportHistory, useRevertImport } from '@/features/import/useImport';

// Riwayat impor (mockup import-history). Membatalkan impor menghapus semua
// transaksinya dan tidak bisa diurungkan, jadi lewat IosAlert (bukan toast
// Urungkan). Akun dan kategori yang dibuat impor tetap ada.
definePageMeta({ layout: 'app' });
useHead({ title: 'Riwayat impor · Money Manager' });

const { canEdit } = useActiveBook();
const history = useImportHistory();
const revert = useRevertImport();
const alert = useAlert();

const n = (value: number) => value.toLocaleString('id-ID');

async function ask(batch: ImportBatch) {
  const ok = await alert.confirm({
    title: 'Batalkan impor ini?',
    body: `${n(batch.row_count)} transaksi dari ${batch.filename || 'impor ini'} dihapus dan saldo akun kembali seperti sebelum impor. Ini tidak bisa diurungkan.`,
    okLabel: 'Batalkan impor',
    danger: true,
  });
  if (ok) revert.mutate(batch.id);
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Riwayat impor"
      back="Kembali"
      back-to="/settings/import"
      line
      class="sticky top-0 md:static"
    />

    <div class="pb-8">
      <EmptyCard
        v-if="!history.data.value?.length"
        :title="history.isPending.value ? 'Memuat…' : 'Belum ada impor'"
        description="Impor Realbyte, mutasi, atau struk akan muncul di sini."
      />
      <GroupedList v-else label="Impor" :aside="`${history.data.value.length} kali`">
        <GroupRow
          v-for="b in history.data.value"
          :key="b.id"
          :title="b.filename || IMPORT_SOURCE[b.source].label"
          :subtitle="`${batchWhen(b.created_at)} · ${n(b.row_count)} transaksi`"
          :inset="62"
          :class="b.status === 'reverted' && 'opacity-60'"
        >
          <template #icon>
            <ToneIcon
              :icon="IMPORT_SOURCE[b.source].icon"
              :tone="b.status === 'reverted' ? 'gray' : IMPORT_SOURCE[b.source].tone"
              solid
            />
          </template>
          <template #end>
            <span v-if="b.status === 'reverted'" class="shrink-0 text-meta text-muted-foreground"
              >Dibatalkan</span
            >
            <Chip v-else-if="canEdit && !revert.isPending.value" danger @click="ask(b)"
              >Batalkan</Chip
            >
          </template>
        </GroupRow>
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Membatalkan impor menghapus semua transaksi dari impor itu, dan tidak bisa diurungkan. Akun
        dan kategori yang dibuat impor tetap ada.
      </p>
    </div>
  </div>
</template>
