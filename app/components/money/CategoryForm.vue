<script setup lang="ts">
import { Archive, ArchiveRestore, X } from '@lucide/vue';
import FormField from '@/components/base/FormField.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { TONE_FILL } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { Category, CategoryKind } from '@/features/categories/api';
import { asTone, CATEGORY_ICONS, CATEGORY_TONES, categoryIcon } from '@/features/categories/icons';
import { useCategories, useCategoryMutations } from '@/features/categories/useCategories';

// Tambah/ubah kategori: nama, induk (2 level), ikon, warna. Subkategori baru
// ikut warna induknya. Mengarsipkan menyembunyikan dari pilihan, transaksi
// lama tetap menampilkan namanya.
const props = defineProps<{
  category: Category | null;
  kind: CategoryKind;
  titleId: string;
  page?: boolean;
}>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const categories = useCategories();
const mutations = useCategoryMutations();
const toast = useToast();

const hasChildren = computed(
  () =>
    !!props.category &&
    (categories.data.value ?? []).some((c) => c.parent_id === props.category!.id),
);
const parents = computed(() =>
  categories.tree(props.kind).filter((p) => p.id !== props.category?.id),
);

const form = reactive({
  name: props.category?.name ?? '',
  parentId: props.category?.parent_id ?? '',
  icon: props.category?.icon ?? 'tag',
  tone: asTone(props.category?.tone ?? 'r1'),
});
const error = ref('');

watch(
  () => form.parentId,
  (id) => {
    if (!props.category && id) form.tone = asTone(categories.byId.value.get(id)?.tone);
  },
);

function save() {
  error.value = form.name.trim() ? '' : 'Isi nama kategori.';
  if (error.value || !bookId.value) return;
  const data = {
    name: form.name.trim(),
    parent_id: form.parentId || null,
    icon: form.icon,
    tone: form.tone,
  };
  if (props.category) {
    mutations.update.mutate(
      { id: props.category.id, patch: data },
      { onSuccess: () => toast.show('Kategori disimpan') },
    );
  } else {
    const siblings = (categories.data.value ?? []).filter(
      (c) => c.kind === props.kind && c.parent_id === data.parent_id,
    );
    mutations.create.mutate(
      { ...data, book_id: bookId.value, kind: props.kind, sort: siblings.length },
      { onSuccess: () => toast.show(`Kategori ${data.name} ditambahkan`) },
    );
  }
  emit('close');
}

function toggleArchive() {
  if (!props.category) return;
  const { id, name } = props.category;
  const archived = !props.category.archived;
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
      <ToneIcon :icon="categoryIcon(form.icon)" :tone="form.tone" />
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ category ? 'Ubah kategori' : 'Kategori baru' }}
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

    <FormField label="Nama" for="cat-name" :error="error">
      <input
        id="cat-name"
        v-model="form.name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        :aria-invalid="!!error || undefined"
      />
    </FormField>

    <FormField
      label="Induk"
      for="cat-parent"
      :hint="
        hasChildren
          ? 'Kategori yang punya subkategori tidak bisa dijadikan subkategori.'
          : 'Kosongkan untuk kategori utama.'
      "
    >
      <select id="cat-parent" v-model="form.parentId" class="field-input" :disabled="hasChildren">
        <option value="">Kategori utama</option>
        <option v-for="p in parents" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </FormField>

    <fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend class="mb-1.5 text-label font-semibold">Warna</legend>
      <div class="flex flex-wrap gap-2">
        <label v-for="t in CATEGORY_TONES" :key="t" class="cursor-pointer">
          <input
            v-model="form.tone"
            type="radio"
            name="cat-tone"
            :value="t"
            class="peer sr-only"
            :aria-label="t === 'neutral' ? 'Abu-abu' : `Warna ${t}`"
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
        <label v-for="(icon, key) in CATEGORY_ICONS" :key="key" class="cursor-pointer">
          <input
            v-model="form.icon"
            type="radio"
            name="cat-icon"
            :value="key"
            class="peer sr-only"
            :aria-label="String(key)"
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
      <Button v-if="category" type="button" variant="ghost" size="touch" @click="toggleArchive">
        <component :is="category.archived ? ArchiveRestore : Archive" />
        {{ category.archived ? 'Pulihkan' : 'Arsipkan' }}
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">{{
        category ? 'Simpan perubahan' : 'Tambah kategori'
      }}</Button>
    </div>
  </form>
</template>
