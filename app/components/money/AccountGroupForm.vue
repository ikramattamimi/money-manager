<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import FormField from '@/components/base/FormField.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { TONE_FILL, type Tone } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import type { AccountGroup } from '@/features/accounts/api';
import {
  ACCOUNT_ICONS,
  ACCOUNT_KIND_STYLE,
  KIND_ICON,
  groupStyle,
  type AccountKind,
} from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { CATEGORY_TONES } from '@/features/categories/icons';

// Tambah/ubah grup akun: nama, jenis, ikon, warna. Jenis menentukan perilaku
// (Kartu kredit membuka tanggal tagihan di akunnya) dan ikon/warna awal; ikon
// dan warna bisa diganti sendiri. Grup hanya bisa dihapus kalau tidak berisi
// akun (termasuk yang diarsipkan). `created` membawa grup baru (pindah grup).
const props = defineProps<{ group: AccountGroup | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: []; created: [group: AccountGroup] }>();

const { bookId } = useActiveBook();
const { accounts, groups } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

const KINDS = Object.entries(ACCOUNT_KIND_STYLE) as [
  AccountKind,
  (typeof ACCOUNT_KIND_STYLE)[AccountKind],
][];

const initialKind = props.group?.kind ?? ('other' as AccountKind);
const form = reactive({
  name: props.group?.name ?? '',
  kind: initialKind,
  icon: props.group?.icon ?? KIND_ICON[initialKind],
  tone: groupStyle(props.group ?? { kind: initialKind, icon: null, tone: null }).tone as Tone,
});
const error = ref('');

const members = computed(() =>
  props.group ? (accounts.data.value ?? []).filter((a) => a.group_id === props.group!.id) : [],
);

// Nama, ikon, dan warna mengikuti jenis yang dipilih sampai user mengubahnya sendiri
let typed = !!props.group;
let styled = !!(props.group?.icon || props.group?.tone);
const markTyped = () => (typed = true);
const markStyled = () => (styled = true);
watch(
  () => form.kind,
  (kind) => {
    if (!typed) form.name = ACCOUNT_KIND_STYLE[kind].label;
    if (!styled) {
      form.icon = KIND_ICON[kind];
      form.tone = ACCOUNT_KIND_STYLE[kind].tone;
    }
  },
);

const saving = ref(false);
async function save() {
  if (saving.value) return;
  const name = form.name.trim();
  const clash = (groups.data.value ?? []).some(
    (g) => g.id !== props.group?.id && g.name.toLowerCase() === name.toLowerCase(),
  );
  error.value = !name ? 'Isi nama grup.' : clash ? 'Sudah ada grup dengan nama ini.' : '';
  if (error.value || !bookId.value) return;

  // Sama dengan bawaan jenisnya = simpan null, supaya ikut kalau jenisnya diganti
  const icon = form.icon === KIND_ICON[form.kind] ? null : form.icon;
  const tone = form.tone === ACCOUNT_KIND_STYLE[form.kind].tone ? null : form.tone;
  const data = { name, kind: form.kind, icon, tone };
  if (props.group) {
    mutations.updateGroup.mutate(
      { id: props.group.id, patch: data },
      { onSuccess: () => toast.show('Grup disimpan') },
    );
  } else {
    // Ditunggu dulu: pemanggil (pindah grup) butuh id grup barunya
    const sort = Math.max(-1, ...(groups.data.value ?? []).map((g) => g.sort)) + 1;
    saving.value = true;
    const created = await mutations.createGroup
      .mutateAsync({ ...data, book_id: bookId.value, sort })
      .catch(() => null)
      .finally(() => (saving.value = false));
    if (!created) return;
    toast.show(`${name} ditambahkan`);
    emit('created', created);
  }
  emit('close');
}

function remove() {
  if (!props.group || members.value.length) return;
  const { name, kind, sort, icon, tone } = props.group;
  const book = props.group.book_id;
  mutations.deleteGroup.mutate(props.group.id, {
    onSuccess: () =>
      toast.show(`${name} dihapus`, () =>
        mutations.createGroup.mutate({ book_id: book, name, kind, sort, icon, tone }),
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
      <div class="flex items-center gap-2.5">
        <ToneIcon :icon="ACCOUNT_ICONS[form.icon] ?? ACCOUNT_ICONS.package!" :tone="form.tone" />
        <input
          id="group-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          class="field-input flex-1"
          autocomplete="off"
          placeholder="mis. Dana Darurat, Rekening Usaha"
          :aria-invalid="!!error || undefined"
          @input="markTyped"
        />
      </div>
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
        Kartu kredit menampilkan tanggal cetak dan jatuh tempo di akunnya. Utang dan kartu kredit
        mengisi saldo awal negatif.
      </p>
    </fieldset>

    <fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend class="mb-1.5 text-label font-semibold">Warna</legend>
      <div class="flex flex-wrap gap-2">
        <label v-for="t in CATEGORY_TONES" :key="t" class="cursor-pointer">
          <input
            v-model="form.tone"
            type="radio"
            name="group-tone"
            :value="t"
            class="peer sr-only"
            :aria-label="t === 'neutral' ? 'Abu-abu' : `Warna ${t}`"
            @change="markStyled"
          />
          <span
            :class="[
              'block size-8 rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
              TONE_FILL[t],
            ]"
          />
        </label>
      </div>
    </fieldset>

    <fieldset class="m-0 flex flex-col border-0 p-0">
      <legend class="mb-1.5 text-label font-semibold">Ikon</legend>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
        <label v-for="(icon, key) in ACCOUNT_ICONS" :key="key" class="cursor-pointer">
          <input
            v-model="form.icon"
            type="radio"
            name="group-icon"
            :value="key"
            class="peer sr-only"
            :aria-label="String(key)"
            @change="markStyled"
          />
          <span
            class="press grid size-10 place-items-center rounded-[10px] text-muted-foreground peer-checked:bg-primary-soft peer-checked:text-primary-accent peer-checked:ring-1 peer-checked:ring-primary-accent/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:bg-surface-2"
          >
            <component :is="icon" class="size-[18px]" aria-hidden="true" />
          </span>
        </label>
      </div>
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
      <Button type="submit" size="touch" :disabled="saving">{{
        group ? 'Simpan perubahan' : 'Tambah grup'
      }}</Button>
    </div>
    <p v-if="group && members.length" class="m-0 -mt-1.5 text-xs text-muted-foreground">
      Berisi {{ members.length }} akun, jadi belum bisa dihapus. Pindahkan akunnya ke grup lain
      lewat Pilih banyak di halaman Akun.
    </p>
  </form>
</template>
