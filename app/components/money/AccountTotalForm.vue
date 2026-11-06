<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { Check } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import { accountsApi, type AccountTotal } from '@/features/accounts/api';
import { accountKeys } from '@/features/accounts/keys';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah } from '@/lib/format';
import FormDialogHeader from './FormDialogHeader.vue';
import { FORM_INPUT, FORM_NOTE, formGroup } from './formStyles';

// Tambah/ubah total akun (mockup total-form): nama, saklar Tampilkan di
// Transaksi (saldo di kepala Transaksi, transaksi disaring ke akunnya), lalu
// centang akun yang masuk total ini. Tiap akun hanya di satu total, jadi
// mencentang akun dari total lain memindahkannya ke sini. Hapus total lewat
// dialog: akunnya tetap ada, hanya tidak ikut total mana pun.
// `created` membawa total baru (atur total dari Pilih banyak).
const props = withDefaults(
  defineProps<{
    total: AccountTotal | null;
    titleId: string;
    page?: boolean;
    /** Sembunyikan daftar centang akun (dipakai Pilih banyak: akunnya sudah dipilih) */
    noAccounts?: boolean;
  }>(),
  { page: false, noAccounts: false },
);
const emit = defineEmits<{ close: []; created: [total: AccountTotal] }>();

const { bookId } = useActiveBook();
const { accountTotals, grouped, totalById } = useAccounts();
const mutations = useAccountMutations();
const client = useQueryClient();
const toast = useToast();
const alert = useAlert();

const form = reactive({
  name: props.total?.name ?? '',
  onTransactions: props.total?.on_transactions ?? false,
});
const error = ref('');
const saving = ref(false);
const current = computed(() => (accountTotals.data.value ?? []).find((t) => t.on_transactions));

// ---------- akun di total ini ----------
const list = computed(() =>
  grouped.value.flatMap((g) =>
    g.accounts.map((a) => ({ ...a, style: groupStyle(g), group: g.name })),
  ),
);
const initial = computed(() =>
  props.total ? list.value.filter((a) => a.total_id === props.total!.id).map((a) => a.id) : [],
);
const picked = ref<string[] | null>(null);
const chosen = computed(() => picked.value ?? initial.value);
function toggle(id: string) {
  const now = chosen.value;
  picked.value = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
}
const sum = computed(() =>
  list.value.filter((a) => chosen.value.includes(a.id)).reduce((s, a) => s + a.balance, 0),
);
const caption = (a: (typeof list.value)[number]) => {
  const other =
    a.total_id && a.total_id !== props.total?.id ? totalById.value.get(a.total_id) : null;
  return other ? `${a.group} · sekarang di ${other.name}` : a.group;
};

// Dua bagian mengikuti keanggotaan yang tersimpan (`initial`), bukan centang yang
// sedang diubah: baris tidak melompat saat dicentang, pindah bagian setelah disimpan.
const sections = computed(() => {
  const saved = new Set(initial.value);
  const members = list.value.filter((a) => saved.has(a.id));
  const others = list.value.filter((a) => !saved.has(a.id));
  const live = `Akun di total ini · ${chosen.value.length}`;
  return [
    { key: 'members', rows: members, label: live, aside: formatRupiah(sum.value) },
    {
      key: 'others',
      rows: others,
      label: members.length ? 'Akun lain' : live,
      aside: members.length ? undefined : formatRupiah(sum.value),
    },
  ];
});

/** Simpan keanggotaan: yang dicentang masuk, yang dilepas tidak ikut total */
async function saveMembers(totalId: string) {
  if (picked.value === null) return;
  const add = picked.value.filter((id) => !initial.value.includes(id));
  const drop = initial.value.filter((id) => !picked.value!.includes(id));
  await Promise.all([
    accountsApi.updateMany(add, { total_id: totalId, include_in_total: true }),
    accountsApi.updateMany(drop, { total_id: null, include_in_total: false }),
  ]);
  if (add.length || drop.length) await client.invalidateQueries({ queryKey: accountKeys.all });
}

async function save() {
  if (saving.value || !bookId.value) return;
  const name = form.name.trim();
  const clash = (accountTotals.data.value ?? []).some(
    (t) => t.id !== props.total?.id && t.name.toLowerCase() === name.toLowerCase(),
  );
  error.value = !name ? 'Isi nama total.' : clash ? 'Sudah ada total dengan nama ini.' : '';
  if (error.value) return;

  const book = bookId.value;
  saving.value = true;
  try {
    let total = props.total;
    if (total) {
      if (name !== total.name)
        await mutations.updateTotal.mutateAsync({ id: total.id, patch: { name } });
    } else {
      const sort = Math.max(-1, ...(accountTotals.data.value ?? []).map((t) => t.sort)) + 1;
      total = await mutations.createTotal.mutateAsync({ book_id: book, name, sort });
    }
    // Hanya satu total yang tampil di Transaksi: menyalakan ini mematikan yang lain
    if (form.onTransactions !== !!props.total?.on_transactions)
      await mutations.setTransactionsTotal.mutateAsync({
        bookId: book,
        id: form.onTransactions ? total.id : null,
      });
    await saveMembers(total.id);
    toast.show(props.total ? 'Total disimpan' : `${name} ditambahkan`);
    if (!props.total) emit('created', total);
    emit('close');
  } catch (e) {
    // Toast hanya satu: pesan mutasi yang sama cukup ditimpa
    toast.show((e as Error).message);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!props.total || !bookId.value) return;
  const { id, name } = props.total;
  const ok = await alert.confirm({
    title: `Hapus total ${name}?`,
    body: 'Akunnya tidak ikut terhapus, hanya keluar dari total ini.',
    okLabel: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  mutations.deleteTotal.mutate(
    { id, bookId: bookId.value },
    { onSuccess: () => toast.show(`${name} dihapus`) },
  );
  emit('close');
}
</script>

<template>
  <form :id="`${titleId}-form`" class="flex flex-col pb-6" novalidate @submit.prevent="save">
    <FormDialogHeader
      v-if="!page"
      :title="total ? 'Ubah total' : 'Total baru'"
      :title-id="titleId"
      :disabled="saving"
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
            placeholder="mis. Uang bulanan"
            :aria-invalid="!!error || undefined"
            :class="FORM_INPUT"
          />
        </label>
      </GroupRow>
      <GroupRow
        title="Tampilkan di Transaksi"
        :subtitle="
          current && current.id !== total?.id && form.onTransactions
            ? `Menggantikan ${current.name}`
            : 'Saldo di atas, transaksi disaring ke akunnya'
        "
      >
        <template #end>
          <IosSwitch v-model="form.onTransactions" label="Tampilkan di halaman Transaksi" />
        </template>
      </GroupRow>
    </div>
    <p v-if="error" class="m-0 px-4 pt-1.5 text-meta text-exp" role="alert">{{ error }}</p>

    <template v-if="!noAccounts && list.length">
      <template v-for="(sec, i) in sections" :key="sec.key">
        <SectionHeader v-if="sec.rows.length" :label="sec.label" :aside="sec.aside" class="!px-4" />
        <div v-if="sec.rows.length" :class="formGroup(page)">
          <GroupRow
            v-for="a in sec.rows"
            :key="a.id"
            :title="a.name"
            :subtitle="caption(a)"
            :value="formatRupiah(a.balance)"
            :inset="92"
            :aria-pressed="chosen.includes(a.id)"
            @click="toggle(a.id)"
          >
            <template #icon>
              <span
                :class="[
                  'grid size-6 shrink-0 place-items-center rounded-full border-[1.6px]',
                  chosen.includes(a.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-chevron text-transparent',
                ]"
                aria-hidden="true"
              >
                <Check class="size-[13px]" stroke-width="3.4" />
              </span>
              <ToneIcon v-bind="a.style" size="sm" solid />
            </template>
          </GroupRow>
        </div>
        <p v-if="i === sections.length - 1" :class="FORM_NOTE">
          Tiap akun hanya masuk satu total. Akun pindah bagian setelah disimpan.
        </p>
      </template>
    </template>

    <template v-if="total">
      <IosButton block variant="red" class="mt-6" @click="remove">Hapus total</IosButton>
      <p :class="[FORM_NOTE, 'text-center']">
        Akunnya tidak ikut terhapus, hanya keluar dari total ini.
      </p>
    </template>
  </form>
</template>
