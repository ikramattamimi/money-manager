<script setup lang="ts">
import { formatRupiah } from '@/lib/format';

// Alert gaya iOS saat Simpan mengubah saldo: selisih dicatat sebagai koreksi
// (tidak masuk statistik) atau sebagai pemasukan/pengeluaran biasa.
// Di-teleport ke body supaya tampil di atas dialog/halaman form.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{ diff: number }>();
const emit = defineEmits<{ choose: [asTransaction: boolean] }>();

const kind = computed(() => (props.diff > 0 ? 'pemasukan' : 'pengeluaran'));
const amount = computed(() => (props.diff > 0 ? '+' : '−') + formatRupiah(Math.abs(props.diff)));

function choose(asTransaction: boolean) {
  open.value = false;
  emit('choose', asTransaction);
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}
watch(open, (value) => {
  if (value) document.addEventListener('keydown', onKey);
  else document.removeEventListener('keydown', onKey);
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div
      :class="['scrim fixed inset-0 z-[70] bg-scrim', open ? 'is-open' : 'pointer-events-none']"
      aria-hidden="true"
      @click="open = false"
    />
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="adjust-choice-title"
      aria-describedby="adjust-choice-desc"
      :aria-hidden="!open"
      :inert="!open"
      :class="[
        'alert fixed left-1/2 top-1/2 z-[75] w-[min(300px,calc(100%-32px))] overflow-hidden rounded-[14px] bg-card text-center shadow-float',
        open && 'is-open',
      ]"
    >
      <div class="px-4 pb-4 pt-5">
        <h2 id="adjust-choice-title" class="text-row font-semibold">Saldo berubah {{ amount }}</h2>
        <p id="adjust-choice-desc" class="mt-1 text-sm text-muted-foreground">
          Catat selisihnya sebagai {{ kind }} di statistik, atau hanya sebagai koreksi saldo?
        </p>
      </div>
      <div class="flex flex-col border-t text-row">
        <button type="button" class="py-3 font-semibold text-primary" @click="choose(true)">
          Catat sebagai {{ kind }}
        </button>
        <button type="button" class="border-t py-3 text-primary" @click="choose(false)">
          Koreksi saldo saja
        </button>
        <button type="button" class="border-t py-3 text-muted-foreground" @click="open = false">
          Batal
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}
.scrim.is-open {
  opacity: 1;
}
.alert {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.08);
  transition:
    transform 150ms var(--ease-out),
    opacity 150ms var(--ease-out);
}
.alert.is-open {
  opacity: 1;
  transform: translate(-50%, -50%);
  transition-duration: 220ms, 180ms;
}
@media (prefers-reduced-motion: reduce) {
  .alert,
  .alert.is-open {
    transform: translate(-50%, -50%);
  }
}
</style>
