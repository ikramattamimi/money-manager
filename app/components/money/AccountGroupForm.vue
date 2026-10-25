<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import FormField from '@/components/base/FormField.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { Button } from '@/components/ui/button';
import type { AccountGroup } from '@/features/accounts/api';
import { ACCOUNT_KIND_STYLE, type AccountKind } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';

// Tambah/ubah grup akun: nama bebas + jenis. Jenis menentukan ikon dan warna,
// dan Kartu kredit membuka tanggal tagihan di akunnya. Grup hanya bisa dihapus
// kalau tidak berisi akun (termasuk yang diarsipkan).
const props = defineProps<{ group: AccountGroup | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { accounts, groups } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

const KINDS = Object.entries(ACCOUNT_KIND_STYLE) as [
  AccountKind,
  (typeof ACCOUNT_KIND_STYLE)[AccountKind],
][];

const form = reactive({
  name: props.group?.name ?? '',
  kind: props.group?.kind ?? ('other' as AccountKind),
});
const error = ref('');

const members = computed(() =>
  props.group ? (accounts.data.value ?? []).filter((a) => a.group_id === props.group!.id) : [],
);

// Nama kosong mengikuti jenis yang dipilih, sampai user mengetik sendiri
let typed = !!props.group;
const markTyped = () => (typed = true);
watch(
  () => form.kind,
  (kind) => {
    if (!typed) form.name = ACCOUNT_KIND_STYLE[kind].label;
  },
);

function save() {
  const name = form.name.trim();
  const clash = (groups.data.value ?? []).some(
    (g) => g.id !== props.group?.id && g.name.toLowerCase() === name.toLowerCase(),
  );
  error.value = !name ? 'Isi nama grup.' : clash ? 'Sudah ada grup dengan nama ini.' : '';
  if (error.value || !bookId.value) return;

  if (props.group) {
    mutations.updateGroup.mutate(
      { id: props.group.id, patch: { name, kind: form.kind } },
      { onSuccess: () => toast.show('Grup disimpan') },
    );
  } else {
    const sort = Math.max(-1, ...(groups.data.value ?? []).map((g) => g.sort)) + 1;
    mutations.createGroup.mutate(
      { book_id: bookId.value, name, kind: form.kind, sort },
      { onSuccess: () => toast.show(`Grup ${name} ditambahkan`) },
    );
  }
  emit('close');
}

function remove() {
  if (!props.group || members.value.length) return;
  const { name, kind, sort } = props.group;
  const book = props.group.book_id;
  mutations.deleteGroup.mutate(props.group.id, {
    onSuccess: () =>
      toast.show(`Grup ${name} dihapus`, () =>
        mutations.createGroup.mutate({ book_id: book, name, kind, sort }),
      ),
  });
  emit('close');
}
</script>

<template>
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ group ? 'Ubah grup' : 'Grup baru' }}
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

    <FormField label="Nama grup" for="group-name" :error="error">
      <input
        id="group-name"
        v-model="form.name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        placeholder="mis. Dana Darurat, Rekening Usaha"
        :aria-invalid="!!error || undefined"
        @input="markTyped"
      />
    </FormField>

    <fieldset class="m-0 flex flex-col border-0 p-0">
      <legend class="mb-1.5 text-label font-semibold">Jenis</legend>
      <div class="grid grid-cols-3 gap-1.5">
        <label v-for="[kind, style] in KINDS" :key="kind" class="cursor-pointer">
          <input
            v-model="form.kind"
            type="radio"
            name="group-kind"
            :value="kind"
            class="peer sr-only"
          />
          <span
            class="press flex flex-col items-center gap-1 rounded-[10px] px-1 py-2 text-center text-xs font-medium text-muted-foreground peer-checked:bg-primary-soft peer-checked:text-primary-ink peer-checked:ring-1 peer-checked:ring-primary-accent/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:bg-surface-2"
          >
            <ToneIcon :icon="style.icon" :tone="style.tone" size="sm" />
            {{ style.label }}
          </span>
        </label>
      </div>
      <p class="m-0 mt-1.5 text-xs text-muted-foreground">
        Menentukan ikon dan warna. Kartu kredit menampilkan tanggal cetak dan jatuh tempo di
        akunnya.
      </p>
    </fieldset>

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button
        v-if="group"
        type="button"
        variant="ghost"
        size="touch"
        :disabled="!!members.length"
        :title="members.length ? 'Pindahkan akunnya ke grup lain dulu' : undefined"
        @click="remove"
      >
        <Trash2 />Hapus
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">{{ group ? 'Simpan perubahan' : 'Tambah grup' }}</Button>
    </div>
    <p v-if="group && members.length" class="m-0 -mt-1.5 text-xs text-muted-foreground">
      Berisi {{ members.length }} akun, jadi belum bisa dihapus. Pindahkan akunnya ke grup lain
      lewat Pilih banyak di halaman Akun.
    </p>
  </form>
</template>
