<script setup lang="ts">
import { Archive, ArchiveRestore, Check } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import type { Account } from '@/features/accounts/api';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import FormDialogHeader from './FormDialogHeader.vue';
import { FORM_INPUT, FORM_NOTE, FORM_SELECT, FORM_SH, formGroup } from './formStyles';
import InlineAmount from '@/components/data/InlineAmount.vue';

// Tambah/ubah akun gaya grup iOS: nama, grup (lembar pilihan), tanggal tagihan
// kartu kredit, saldo awal, total yang diikuti, catatan. Mengarsipkan
// menyembunyikan akun tanpa menghapus transaksinya (dengan Urungkan).
// `page` = di dalam FormPage (Simpan di bar halaman, form id `${titleId}-form`);
// selain itu kepala Batal · judul · Simpan sendiri (dialog iPad/desktop).
const props = defineProps<{ account: Account | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { groups, groupById, accountTotals } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

const form = reactive({
  name: props.account?.name ?? '',
  groupId: props.account?.group_id ?? '',
  opening: Math.abs(props.account?.opening_balance ?? 0),
  negative: (props.account?.opening_balance ?? 0) < 0,
  includeInTotal: props.account?.include_in_total ?? true,
  totalId: props.account ? (props.account.total_id ?? '') : (null as string | null),
  note: props.account?.note ?? '',
  // Kartu kredit (fase 11 T3): tanggal cetak tagihan dan jatuh tempo, 0 = belum diatur
  statementDay: props.account?.statement_day ?? 0,
  dueDay: props.account?.due_day ?? 0,
});
const group = computed(() => groupById.value.get(form.groupId));
const isCard = computed(() => group.value?.kind === 'card');
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

// Akun baru masuk total pertama (biasanya yang paling sering dipakai)
const hasTotals = computed(() => !!accountTotals.data.value?.length);
watch(
  accountTotals.data,
  (list) => {
    if (form.totalId === null && list) form.totalId = list[0]?.id ?? '';
  },
  { immediate: true },
);

const groupSheet = ref(false);
function pickGroup(id: string) {
  form.groupId = id;
  groupSheet.value = false;
}

function leaveTo(path: string) {
  groupSheet.value = false;
  if (!props.page) emit('close');
  navigateTo(path);
}

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
    // Ada total buatan sendiri: ikut total = masuk salah satunya
    ...(hasTotals.value
      ? { total_id: form.totalId || null, include_in_total: !!form.totalId }
      : { include_in_total: form.includeInTotal }),
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

const firstError = computed(() => errors.name || errors.groupId || '');
</script>

<template>
  <form :id="`${titleId}-form`" class="flex flex-col pb-6" novalidate @submit.prevent="save">
    <FormDialogHeader
      v-if="!page"
      :title="account ? 'Ubah akun' : 'Akun baru'"
      :title-id="titleId"
      @close="emit('close')"
    />

    <div :class="formGroup(page)">
      <GroupRow>
        <label class="flex items-center gap-3">
          <b class="shrink-0 text-row font-medium">Nama</b>
          <input
            v-model="form.name"
            type="text"
            maxlength="60"
            autocomplete="off"
            placeholder="mis. BCA, GoPay"
            :aria-invalid="!!errors.name || undefined"
            :class="FORM_INPUT"
          />
        </label>
      </GroupRow>
      <GroupRow
        title="Grup"
        :value="group?.name ?? 'Pilih'"
        chevron
        :aria-invalid="!!errors.groupId || undefined"
        @click="groupSheet = true"
      />
    </div>
    <p v-if="firstError" class="m-0 px-4 pt-1.5 text-meta text-exp" role="alert">
      {{ firstError }}
    </p>

    <template v-if="isCard">
      <p :class="FORM_SH">Kartu kredit</p>
      <div :class="formGroup(page)">
        <GroupRow>
          <label class="flex items-center gap-3">
            <b class="flex-1 text-row font-medium">Tanggal cetak tagihan</b>
            <select v-model.number="form.statementDay" :class="FORM_SELECT">
              <option :value="0">Belum diatur</option>
              <option v-for="d in 31" :key="d" :value="d">Tanggal {{ d }}</option>
            </select>
          </label>
        </GroupRow>
        <GroupRow>
          <label class="flex items-center gap-3">
            <b class="flex-1 text-row font-medium">Jatuh tempo</b>
            <select v-model.number="form.dueDay" :class="FORM_SELECT">
              <option :value="0">Belum diatur</option>
              <option v-for="d in 31" :key="d" :value="d">Tanggal {{ d }}</option>
            </select>
          </label>
        </GroupRow>
      </div>
      <p :class="[FORM_NOTE, errors.dueDay && 'text-exp']">
        {{
          errors.dueDay ||
          'Transaksi setelah tanggal cetak masuk tagihan bulan berikutnya. Jatuh tempo yang lebih kecil dari tanggal cetak berarti bulan sesudahnya.'
        }}
      </p>
    </template>

    <p :class="FORM_SH">Saldo</p>
    <div :class="formGroup(page)">
      <GroupRow>
        <label class="flex items-center gap-3">
          <b class="shrink-0 text-row font-medium">Saldo awal</b>
          <span class="flex min-w-0 flex-1 items-center justify-end gap-1">
            <InlineAmount id="acc-opening" v-model="form.opening" label="Saldo awal" />
          </span>
        </label>
      </GroupRow>
      <GroupRow title="Saldo awal negatif" subtitle="Untuk utang atau tagihan kartu kredit">
        <template #end><IosSwitch v-model="form.negative" label="Saldo awal negatif" /></template>
      </GroupRow>
    </div>
    <p :class="FORM_NOTE">
      Saldo sebelum transaksi pertama yang dicatat. Untuk menyamakan saldo sekarang, pakai Sesuaikan
      saldo di rincian akun.
    </p>

    <p :class="FORM_SH">Total</p>
    <div :class="formGroup(page)">
      <!-- Belum ada total buatan sendiri: tetap saklar ikut total aset seperti dulu -->
      <GroupRow v-if="hasTotals">
        <label class="flex items-center gap-3">
          <b class="flex-1 text-row font-medium">Masuk total</b>
          <select v-model="form.totalId" :class="FORM_SELECT">
            <option v-for="t in accountTotals.data.value" :key="t.id" :value="t.id">
              {{ t.name }}{{ t.on_transactions ? ' (di Transaksi)' : '' }}
            </option>
            <option value="">Tidak ikut total</option>
          </select>
        </label>
      </GroupRow>
      <GroupRow
        v-else
        title="Sertakan di total aset"
        subtitle="Matikan untuk akun titipan atau bukan milikmu"
      >
        <template #end>
          <IosSwitch v-model="form.includeInTotal" label="Sertakan di total aset" />
        </template>
      </GroupRow>
      <GroupRow title="Kelola total akun" chevron @click="leaveTo('/accounts/totals')" />
    </div>

    <p :class="FORM_SH">Catatan</p>
    <div :class="formGroup(page)">
      <GroupRow>
        <input
          v-model="form.note"
          type="text"
          maxlength="160"
          autocomplete="off"
          aria-label="Catatan"
          placeholder="Opsional"
          class="h-[34px] w-full bg-transparent text-row outline-none placeholder:text-ter"
        />
      </GroupRow>
    </div>

    <IosButton v-if="account" block variant="gray" class="mt-6" @click="toggleArchive">
      <component :is="account.archived ? ArchiveRestore : Archive" aria-hidden="true" />
      {{ account.archived ? 'Pulihkan akun' : 'Arsipkan akun' }}
    </IosButton>
    <p v-if="account && !account.archived" :class="[FORM_NOTE, 'text-center']">
      Akun yang diarsipkan disembunyikan, transaksinya tetap tersimpan.
    </p>

    <IosSheet v-model:open="groupSheet" title="Grup akun">
      <div class="overflow-hidden rounded-group bg-fill">
        <GroupRow
          v-for="g in groups.data.value"
          :key="g.id"
          :title="g.name"
          :subtitle="groupStyle(g).label"
          @click="pickGroup(g.id)"
        >
          <template #icon><ToneIcon v-bind="groupStyle(g)" size="sm" solid /></template>
          <template #end>
            <Check
              v-if="g.id === form.groupId"
              class="size-5 text-primary-accent"
              stroke-width="2.6"
              aria-label="Terpilih"
            />
          </template>
        </GroupRow>
      </div>
      <IosButton block variant="soft" class="mt-3.5" @click="leaveTo('/accounts/groups')">
        Buat atau ubah grup
      </IosButton>
    </IosSheet>
  </form>
</template>
