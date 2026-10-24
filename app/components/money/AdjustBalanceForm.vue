<script setup lang="ts">
import { X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import Switch from '@/components/base/Switch.vue';
import { Button } from '@/components/ui/button';
import type { Account } from '@/features/accounts/api';
import { useAccountMutations } from '@/features/accounts/useAccounts';
import { formatRupiah } from '@/lib/format';

// Sesuaikan saldo: isi saldo sebenarnya (mis. dari aplikasi bank), app
// membuat transaksi koreksi sebesar selisihnya. Koreksi tidak masuk statistik.
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
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">Sesuaikan saldo</h2>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Tutup"
        class="press-icon"
        type="button"
        @click="emit('close')"
      >
        <X />
      </Button>
    </div>

    <p class="m-0 text-meta text-muted-foreground">
      Saldo tercatat <b class="tabular-nums text-foreground">{{ formatRupiah(account.balance) }}</b
      >. Isi saldo yang sebenarnya di {{ account.name }}.
    </p>

    <FormField label="Saldo sebenarnya" for="adj-amount">
      <AmountInput id="adj-amount" v-model="amount" />
    </FormField>
    <Switch
      id="adj-negative"
      v-model="negative"
      label="Saldo negatif"
      description="Untuk utang atau tagihan kartu kredit."
    />

    <div class="rounded-xl bg-surface-2 px-3 py-2.5 text-meta">
      <template v-if="diff === 0">Saldo sudah sama, tidak ada yang perlu dikoreksi.</template>
      <template v-else>
        Akan dibuat koreksi
        <b
          :class="['tabular-nums', diff > 0 ? 'text-primary-accent' : 'text-bad']"
          v-text="diffLabel"
        />. Koreksi tidak dihitung sebagai pemasukan atau pengeluaran.
      </template>
    </div>

    <div :class="['flex justify-end pt-1', page && 'form-page-actions']">
      <Button type="submit" size="touch" :disabled="diff === 0">Simpan koreksi</Button>
    </div>
  </form>
</template>
