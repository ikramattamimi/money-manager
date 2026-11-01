<script setup lang="ts">
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import { useBookMutations } from '@/features/books/useBookAdmin';
import { monthStartCaption } from '@/features/books/monthStart';

// Lembar pilih tanggal awal bulan buku (1–31) dengan pratinjau periode.
// Dipakai di Pengaturan transaksi dan Atur buku. Berlaku untuk semua anggota.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{ bookId: string; current: number }>();

const mutations = useBookMutations();
const toast = useToast();
const day = ref(props.current);
watch(open, (v) => v && (day.value = props.current));

const preview = computed(() => monthStartCaption(day.value, true));

function save() {
  open.value = false;
  if (day.value === props.current) return;
  const chosen = day.value;
  mutations.setMonthStartDay.mutate(
    { id: props.bookId, day: chosen },
    { onSuccess: () => toast.show(`Bulan dimulai tanggal ${chosen}`) },
  );
}
</script>

<template>
  <IosSheet v-model:open="open" title="Tanggal awal bulan">
    <div class="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Tanggal awal bulan">
      <button
        v-for="d in 31"
        :key="d"
        type="button"
        role="radio"
        :aria-checked="day === d"
        :class="[
          'ms-day grid h-10 place-items-center rounded-[10px] text-body font-semibold',
          day === d ? 'bg-primary text-primary-foreground' : 'bg-fill text-foreground',
        ]"
        @click="day = d"
      >
        {{ d }}
      </button>
    </div>
    <p class="mb-0 mt-3 text-meta leading-[1.45] text-muted-foreground">
      {{ preview }}.
      <template v-if="day >= 20"
        >Tanggal 20–31 dihitung mulai bulan sebelumnya, cocok untuk gajian akhir bulan.</template
      >
      <template v-if="day > 28">Bulan yang lebih pendek mulai di hari terakhirnya.</template>
      Berlaku untuk semua anggota: transaksi, statistik, dan budget.
    </p>
    <template #footer>
      <IosButton block :disabled="mutations.setMonthStartDay.isPending.value" @click="save"
        >Simpan</IosButton
      >
    </template>
  </IosSheet>
</template>

<style scoped>
.ms-day {
  transition: transform 120ms var(--ease-out);
}
.ms-day:active {
  transform: scale(0.94);
}
</style>
