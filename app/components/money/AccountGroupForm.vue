<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { TONE_FILL, type Tone } from '@/components/data/tone';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
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
import FormDialogHeader from './FormDialogHeader.vue';
import { FORM_INPUT, FORM_NOTE, FORM_SH, formGroup } from './formStyles';

// Tambah/ubah grup akun gaya grup iOS: nama, jenis, warna, ikon. Jenis
// menentukan perilaku (Kartu kredit membuka tanggal tagihan di akunnya) dan
// ikon/warna awal; ikon dan warna bisa diganti sendiri. Grup hanya bisa
// dihapus kalau tidak berisi akun (termasuk yang diarsipkan), dengan Urungkan.
// `created` membawa grup baru (pindah grup). `page` = di dalam FormPage.
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

const OPTION =
  'grid place-items-center rounded-[10px] text-muted-foreground transition-transform duration-150 ease-out active:scale-95 peer-checked:bg-primary-soft peer-checked:text-primary-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring';
</script>

<template>
  <form :id="`${titleId}-form`" class="flex flex-col pb-6" novalidate @submit.prevent="save">
    <FormDialogHeader
      v-if="!page"
      :title="group ? 'Ubah grup' : 'Grup baru'"
      :title-id="titleId"
      :disabled="saving"
      @close="emit('close')"
    />

    <div :class="formGroup(page)">
      <GroupRow>
        <template #icon>
          <ToneIcon
            :icon="ACCOUNT_ICONS[form.icon] ?? ACCOUNT_ICONS.package!"
            :tone="form.tone"
            size="sm"
            solid
          />
        </template>
        <label class="flex items-center gap-3">
          <b class="shrink-0 text-row font-medium">Nama</b>
          <input
            v-model="form.name"
            type="text"
            maxlength="60"
            autocomplete="off"
            placeholder="mis. Dana Darurat"
            :aria-invalid="!!error || undefined"
            :class="FORM_INPUT"
            @input="markTyped"
          />
        </label>
      </GroupRow>
    </div>
    <p v-if="error" class="m-0 px-4 pt-1.5 text-meta text-exp" role="alert">{{ error }}</p>

    <fieldset class="m-0 border-0 p-0">
      <legend :class="FORM_SH">Jenis</legend>
      <div :class="[formGroup(page), 'grid grid-cols-3 gap-1 p-1.5']">
        <label v-for="[kind, style] in KINDS" :key="kind" class="cursor-pointer">
          <input
            v-model="form.kind"
            type="radio"
            name="group-kind"
            :value="kind"
            class="peer sr-only"
          />
          <span :class="[OPTION, 'gap-1 px-1 py-2 text-center text-xs font-medium']">
            <ToneIcon :icon="style.icon" :tone="style.tone" size="sm" solid />
            {{ style.label }}
          </span>
        </label>
      </div>
    </fieldset>
    <p :class="FORM_NOTE">
      Kartu kredit menampilkan tanggal cetak dan jatuh tempo di akunnya. Utang dan kartu kredit
      mengisi saldo awal negatif.
    </p>

    <fieldset class="m-0 border-0 p-0">
      <legend :class="FORM_SH">Warna</legend>
      <div :class="[formGroup(page), 'flex flex-wrap gap-2.5 px-4 py-3']">
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

    <fieldset class="m-0 border-0 p-0">
      <legend :class="FORM_SH">Ikon</legend>
      <div
        :class="[
          formGroup(page),
          'grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1 p-1.5',
        ]"
      >
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
          <span :class="[OPTION, 'size-10']">
            <component :is="icon" class="size-[18px]" aria-hidden="true" />
          </span>
        </label>
      </div>
    </fieldset>

    <template v-if="group">
      <IosButton block variant="red" class="mt-6" :disabled="!!members.length" @click="remove">
        <Trash2 aria-hidden="true" />Hapus grup
      </IosButton>
      <p :class="[FORM_NOTE, 'text-center']">
        {{
          members.length
            ? `Berisi ${members.length} akun, jadi belum bisa dihapus. Pindahkan akunnya lewat Pilih banyak di halaman Akun.`
            : 'Grup kosong bisa dihapus dan diurungkan.'
        }}
      </p>
    </template>
  </form>
</template>
