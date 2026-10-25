<script setup lang="ts">
import { ArrowLeft, Camera, FileSpreadsheet, History, Landmark, Undo2 } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { ImportBatch } from '@/features/import/api';
import { useImportHistory, useRevertImport } from '@/features/import/useImport';
import { formatTime, jakartaParts, MONTHS_SHORT } from '@/lib/time';

// Riwayat impor. Membatalkan impor menghapus semua transaksinya dan tidak
// bisa di-undo, jadi pakai dialog konfirmasi (bukan toast Urungkan).
definePageMeta({ layout: 'app' });
useHead({ title: 'Riwayat impor · Money Manager' });

const { canEdit } = useActiveBook();
const history = useImportHistory();
const revert = useRevertImport();

const when = (iso: string) => {
  const d = jakartaParts(iso);
  return `${d.day} ${MONTHS_SHORT[d.month - 1]} ${d.year}, ${formatTime(iso)}`;
};

const confirming = ref<ImportBatch | null>(null);
const confirmOpen = ref(false);
function ask(batch: ImportBatch) {
  confirming.value = batch;
  confirmOpen.value = true;
}
function confirm() {
  if (confirming.value) revert.mutate(confirming.value.id);
  confirmOpen.value = false;
}
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Riwayat impor">
      <template #actions>
        <HeaderButton label="Kembali ke impor" @click="navigateTo('/settings/import')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <Card v-if="history.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="3" /></Card>
    <Card v-else-if="!history.data.value?.length" class="mt-3.5">
      <EmptyState
        :icon="History"
        title="Belum ada impor"
        description="File Realbyte yang diimpor akan tercatat di sini."
      />
    </Card>

    <ListGroup v-else label="Impor" :aside="`${history.data.value.length} kali`">
      <ListRow
        v-for="b in history.data.value"
        :key="b.id"
        :title="b.filename || 'Impor Realbyte'"
        :subtitle="`${when(b.created_at)} · ${b.row_count.toLocaleString('id-ID')} transaksi`"
        :class="b.status === 'reverted' ? 'opacity-60' : ''"
      >
        <template #lead
          ><ToneIcon
            :icon="
              b.source === 'bank_statement'
                ? Landmark
                : b.source === 'photo'
                  ? Camera
                  : FileSpreadsheet
            "
            :tone="b.status === 'reverted' ? 'neutral' : 'ok'"
            size="sm"
        /></template>
        <template #end>
          <span v-if="b.status === 'reverted'" class="text-xs text-muted-foreground"
            >Dibatalkan</span
          >
          <Button
            v-else-if="canEdit"
            variant="ghost-danger"
            size="default"
            :disabled="revert.isPending.value"
            @click="ask(b)"
          >
            <Undo2 />Batalkan
          </Button>
        </template>
      </ListRow>
    </ListGroup>

    <Overlay v-model:open="confirmOpen" labelledby="revert-title">
      <div v-if="confirming" class="flex flex-col gap-3">
        <h2 id="revert-title" class="m-0 text-panel font-bold">Batalkan impor ini?</h2>
        <p class="m-0 text-meta text-muted-foreground">
          {{ confirming.row_count.toLocaleString('id-ID') }} transaksi dari
          <b class="text-foreground">{{ confirming.filename || 'impor ini' }}</b> akan dihapus dan
          saldo akun kembali seperti sebelum impor. Ini tidak bisa diurungkan. Akun dan kategori
          yang dibuat impor tetap ada.
        </p>
        <div class="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" size="touch" @click="confirmOpen = false">Jangan</Button>
          <Button variant="destructive" size="touch" @click="confirm">Hapus transaksinya</Button>
        </div>
      </div>
    </Overlay>
  </div>
</template>
