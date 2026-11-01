<script setup lang="ts">
import GroupRow from '@/components/ios/GroupRow.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import type { Account } from '@/features/accounts/api';
import { useAccountMutations } from '@/features/accounts/useAccounts';
import { formatRupiah } from '@/lib/format';
import FormDialogHeader from './FormDialogHeader.vue';
import { FORM_NOTE, FORM_SH, formGroup } from './formStyles';
import InlineAmount from '@/components/data/InlineAmount.vue';

// Sesuaikan saldo gaya grup iOS: isi saldo sebenarnya (mis. dari aplikasi
// bank), app membuat transaksi koreksi sebesar selisihnya. Koreksi tidak masuk
// statistik. `page` = di dalam FormPage (Simpan di bar halaman, form id
// `${titleId}-form`); selain itu kepala Batal · judul · Simpan sendiri.
const props = defineProps<{ account: Account; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const mutations = useAccountMutations();
const toast = useToast();

const amount = ref(Math.abs(props.account.balance));
const negative = ref(props.account.balance < 0);
const actual = computed(() => (negative.value ? -amount.value : amount.value));
const diff = computed(() => actual.value - props.account.balance);
const diffLabel = computed(() => (diff.value > 0 ? '+' : '−') + formatRupiah(Math.abs(diff.value)));

function save() {
  // Saldo sudah sama: tidak ada koreksi, tetap di form
  if (diff.value === 0) return;
  mutations.adjust.mutate(
    { id: props.account.id, actual: actual.value },
    {
      onSuccess: (tx) =>
        toast.show(
          tx
            ? `Saldo ${props.account.name} disesuaikan ke ${formatRupiah(actual.value)}`
            : 'Saldo sudah sama',
        ),
    },
  );
  emit('close');
}
</script>

<template>
  <form :id="`${titleId}-form`" class="flex flex-col pb-6" novalidate @submit.prevent="save">
    <FormDialogHeader
      v-if="!page"
      title="Sesuaikan saldo"
      :title-id="titleId"
      :disabled="diff === 0"
      @close="emit('close')"
    />

    <div :class="formGroup(page)">
      <GroupRow
        :title="account.name"
        subtitle="Saldo tercatat"
        :value="formatRupiah(account.balance)"
        strong
      />
    </div>

    <p :class="FORM_SH">Saldo sebenarnya</p>
    <div :class="formGroup(page)">
      <GroupRow>
        <label class="flex items-center gap-3">
          <b class="shrink-0 text-row font-medium">Saldo</b>
          <span class="flex min-w-0 flex-1 items-center justify-end gap-1">
            <InlineAmount id="adj-amount" v-model="amount" label="Saldo sebenarnya" />
          </span>
        </label>
      </GroupRow>
      <GroupRow title="Saldo negatif" subtitle="Untuk utang atau tagihan kartu kredit">
        <template #end><IosSwitch v-model="negative" label="Saldo negatif" /></template>
      </GroupRow>
    </div>

    <p :class="FORM_SH">Koreksi</p>
    <div :class="formGroup(page)" aria-live="polite">
      <GroupRow
        v-if="diff === 0"
        title="Saldo sudah sama"
        subtitle="Tidak ada yang perlu dikoreksi"
      />
      <GroupRow
        v-else
        title="Selisih"
        subtitle="Dicatat sebagai koreksi saldo"
        :value="diffLabel"
        :value-tone="diff > 0 ? 'inc' : 'exp'"
      />
    </div>
    <p :class="FORM_NOTE">
      Koreksi tidak dihitung sebagai pemasukan atau pengeluaran di statistik.
    </p>
  </form>
</template>
