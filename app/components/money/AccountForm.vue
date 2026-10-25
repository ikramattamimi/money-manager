<script setup lang="ts">
import { Archive, ArchiveRestore, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import Switch from '@/components/base/Switch.vue';
import { Button } from '@/components/ui/button';
import type { Account } from '@/features/accounts/api';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';

// Tambah/ubah akun: nama, grup, saldo awal, ikut total aset, catatan.
// Mengarsipkan menyembunyikan akun tanpa menghapus transaksinya.
const props = defineProps<{ account: Account | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { groups, groupById } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

const form = reactive({
  name: props.account?.name ?? '',
  groupId: props.account?.group_id ?? '',
  opening: Math.abs(props.account?.opening_balance ?? 0),
  negative: (props.account?.opening_balance ?? 0) < 0,
  includeInTotal: props.account?.include_in_total ?? true,
  note: props.account?.note ?? '',
  // Kartu kredit (fase 11 T3): tanggal cetak tagihan dan jatuh tempo, 0 = belum diatur
  statementDay: props.account?.statement_day ?? 0,
  dueDay: props.account?.due_day ?? 0,
});
const isCard = computed(() => groupById.value.get(form.groupId)?.kind === 'card');
const errors = reactive<Record<string, string>>({});

// Grup utang/kartu kredit: saldo awal biasanya negatif
watch(
  () => form.groupId,
  (id) => {
    const kind = groupById.value.get(id)?.kind;
    if (!props.account && (kind === 'loan' || kind === 'card')) form.negative = true;
  },
);
watch(
  groups.data,
  (list) => {
    if (!form.groupId && list?.length) form.groupId = list[0]!.id;
  },
  { immediate: true },
);

function save() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (!form.name.trim()) errors.name = 'Isi nama akun.';
  if (!form.groupId) errors.groupId = 'Pilih grup.';
  if (isCard.value && !form.statementDay !== !form.dueDay)
    errors.dueDay = 'Isi tanggal cetak dan jatuh tempo, atau kosongkan keduanya.';
  if (Object.keys(errors).length || !bookId.value) return;

  const data = {
    name: form.name.trim(),
    group_id: form.groupId,
    opening_balance: form.negative ? -form.opening : form.opening,
    include_in_total: form.includeInTotal,
    note: form.note.trim(),
    statement_day: isCard.value && form.statementDay ? form.statementDay : null,
    due_day: isCard.value && form.dueDay ? form.dueDay : null,
  };
  if (props.account) {
    mutations.update.mutate(
      { id: props.account.id, patch: data },
      { onSuccess: () => toast.show('Akun disimpan') },
    );
  } else {
    mutations.create.mutate(
      { ...data, book_id: bookId.value },
      { onSuccess: () => toast.show(`Akun ${data.name} ditambahkan`) },
    );
  }
  emit('close');
}

function manageGroups() {
  if (!props.page) emit('close');
  navigateTo('/accounts/groups');
}

function toggleArchive() {
  if (!props.account) return;
  const archived = !props.account.archived;
  const name = props.account.name;
  const id = props.account.id;
  mutations.update.mutate(
    { id, patch: { archived } },
    {
      onSuccess: () =>
        toast.show(archived ? `${name} diarsipkan` : `${name} dipulihkan`, () =>
          mutations.update.mutate({ id, patch: { archived: !archived } }),
        ),
    },
  );
  emit('close');
}
</script>

<template>
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ account ? 'Ubah akun' : 'Akun baru' }}
      </h2>
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

    <FormField label="Nama akun" for="acc-name" :error="errors.name">
      <input
        id="acc-name"
        v-model="form.name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        placeholder="mis. BCA, GoPay, Jago · Dana Darurat"
        :aria-invalid="!!errors.name || undefined"
      />
    </FormField>

    <FormField label="Grup" for="acc-group" :error="errors.groupId">
      <select id="acc-group" v-model="form.groupId" class="field-input">
        <option v-for="g in groups.data.value" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <button
        type="button"
        class="press mt-1 self-start rounded-md text-xs font-semibold text-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="manageGroups"
      >
        Buat atau ubah grup
      </button>
    </FormField>

    <div v-if="isCard" class="grid grid-cols-2 gap-3">
      <FormField label="Tanggal cetak tagihan" for="acc-statement">
        <select id="acc-statement" v-model.number="form.statementDay" class="field-input">
          <option :value="0">Belum diatur</option>
          <option v-for="d in 31" :key="d" :value="d">Tanggal {{ d }}</option>
        </select>
      </FormField>
      <FormField label="Jatuh tempo" for="acc-due" :error="errors.dueDay">
        <select id="acc-due" v-model.number="form.dueDay" class="field-input">
          <option :value="0">Belum diatur</option>
          <option v-for="d in 31" :key="d" :value="d">Tanggal {{ d }}</option>
        </select>
      </FormField>
      <p class="col-span-2 m-0 -mt-1.5 text-xs text-muted-foreground">
        Transaksi setelah tanggal cetak masuk ke tagihan bulan berikutnya. Jatuh tempo yang lebih
        kecil dari tanggal cetak berarti bulan sesudahnya.
      </p>
    </div>

    <FormField
      label="Saldo awal"
      for="acc-opening"
      hint="Saldo sebelum transaksi pertama yang dicatat. Untuk menyamakan saldo sekarang, pakai Sesuaikan saldo."
    >
      <AmountInput id="acc-opening" v-model="form.opening" />
    </FormField>
    <Switch
      id="acc-negative"
      v-model="form.negative"
      label="Saldo awal negatif"
      description="Untuk utang atau tagihan kartu kredit."
    />
    <Switch
      id="acc-total"
      v-model="form.includeInTotal"
      label="Sertakan di total aset"
      description="Matikan untuk akun titipan atau yang bukan milikmu."
    />

    <FormField label="Catatan" for="acc-note">
      <input
        id="acc-note"
        v-model="form.note"
        type="text"
        maxlength="160"
        class="field-input"
        autocomplete="off"
      />
    </FormField>

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button v-if="account" type="button" variant="ghost" size="touch" @click="toggleArchive">
        <component :is="account.archived ? ArchiveRestore : Archive" />
        {{ account.archived ? 'Pulihkan' : 'Arsipkan' }}
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">{{ account ? 'Simpan perubahan' : 'Tambah akun' }}</Button>
    </div>
  </form>
</template>
