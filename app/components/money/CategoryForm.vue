<script setup lang="ts">
import { Check } from '@lucide/vue';
import FieldRow from '@/components/data/FieldRow.vue';
import FormGroup from '@/components/data/FormGroup.vue';
import { FIELD_BUTTON, FIELD_INPUT } from '@/components/data/field';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { TONE_FILL } from '@/components/data/tone';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { Category, CategoryKind } from '@/features/categories/api';
import { asTone, CATEGORY_ICONS, CATEGORY_TONES, categoryIcon } from '@/features/categories/icons';
import { useCategories, useCategoryMutations } from '@/features/categories/useCategories';
import FormDialogHeader from './FormDialogHeader.vue';

// Tambah/ubah kategori: nama, induk (2 level), warna, ikon. Subkategori baru
// ikut warna induknya. Mengarsipkan menyembunyikan dari pilihan, transaksi
// lama tetap menampilkan namanya (ada Urungkan).
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
const parentOpen = ref(false);
const parentName = computed(
  () => parents.value.find((p) => p.id === form.parentId)?.name ?? 'Kategori utama',
);
function pickParent(id: string) {
  form.parentId = id;
  parentOpen.value = false;
}

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

const TONE_NAME: Record<string, string> = {
  r1: 'Biru',
  r2: 'Oranye',
  r3: 'Hijau',
  r4: 'Kuning',
  r5: 'Merah muda',
  r6: 'Ungu',
  neutral: 'Abu-abu',
};
</script>

<template>
  <form
    :id="`${titleId}-form`"
    class="flex flex-col gap-3.5 pb-4"
    novalidate
    @submit.prevent="save"
  >
    <FormDialogHeader
      v-if="!page"
      :title="category ? 'Ubah kategori' : 'Kategori baru'"
      :title-id="titleId"
      @close="emit('close')"
    />

    <div class="flex flex-col items-center gap-1.5 pt-1">
      <ToneIcon
        :icon="categoryIcon(form.icon)"
        :tone="form.tone"
        size="lg"
        class="size-14! [&_svg]:size-7!"
      />
      <span class="text-meta text-muted-foreground">{{
        kind === 'income' ? 'Kategori pemasukan' : 'Kategori pengeluaran'
      }}</span>
    </div>

    <FormGroup
      :page="page"
      :foot="
        hasChildren
          ? 'Kategori yang punya subkategori tidak bisa dijadikan subkategori.'
          : 'Pilih induk untuk menjadikannya subkategori.'
      "
    >
      <FieldRow label="Nama" for="cat-name" :error="error" :label-width="64">
        <input
          id="cat-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          :class="FIELD_INPUT"
          autocomplete="off"
          placeholder="mis. Makan"
          :aria-invalid="!!error || undefined"
        />
      </FieldRow>
      <FieldRow label="Induk" for="cat-parent" :label-width="64">
        <button
          id="cat-parent"
          type="button"
          :disabled="hasChildren"
          :class="[FIELD_BUTTON, 'disabled:opacity-50', !form.parentId && 'text-muted-foreground']"
          @click="parentOpen = true"
        >
          <span class="truncate">{{ parentName }}</span>
        </button>
      </FieldRow>
    </FormGroup>

    <FormGroup label="Warna" :page="page">
      <div class="flex flex-wrap gap-2.5 px-4 py-3" role="radiogroup" aria-label="Warna">
        <button
          v-for="t in CATEGORY_TONES"
          :key="t"
          type="button"
          role="radio"
          :aria-checked="form.tone === t"
          :aria-label="TONE_NAME[t] ?? t"
          :class="['cat-pick grid size-9 place-items-center rounded-full text-white', TONE_FILL[t]]"
          @click="form.tone = t"
        >
          <Check v-if="form.tone === t" class="size-4" stroke-width="3" aria-hidden="true" />
        </button>
      </div>
    </FormGroup>

    <FormGroup label="Ikon" :page="page">
      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 p-2"
        role="radiogroup"
        aria-label="Ikon"
      >
        <button
          v-for="(icon, key) in CATEGORY_ICONS"
          :key="key"
          type="button"
          role="radio"
          :aria-checked="form.icon === key"
          :aria-label="String(key)"
          :class="[
            'cat-pick grid size-11 place-items-center rounded-[11px]',
            form.icon === key ? 'bg-primary-soft text-primary-accent' : 'text-muted-foreground',
          ]"
          @click="form.icon = String(key)"
        >
          <component :is="icon" class="size-5" aria-hidden="true" />
        </button>
      </div>
    </FormGroup>

    <template v-if="category">
      <IosButton variant="gray" block class="mt-2" @click="toggleArchive">
        {{ category.archived ? 'Pulihkan kategori' : 'Arsipkan kategori' }}
      </IosButton>
      <p class="m-0 -mt-1.5 px-4 text-center text-meta text-muted-foreground">
        {{
          category.archived
            ? 'Muncul lagi di pilihan kategori.'
            : 'Tidak muncul di pilihan, transaksi lama tetap menampilkan namanya.'
        }}
      </p>
    </template>

    <IosSheet v-model:open="parentOpen" title="Induk">
      <div class="overflow-hidden rounded-group bg-background">
        <GroupRow title="Kategori utama" subtitle="Tanpa induk" @click="pickParent('')">
          <template #end>
            <Check
              v-if="!form.parentId"
              class="size-5 text-primary-accent"
              stroke-width="2.6"
              aria-hidden="true"
            />
          </template>
        </GroupRow>
        <GroupRow v-for="p in parents" :key="p.id" :title="p.name" @click="pickParent(p.id)">
          <template #icon
            ><ToneIcon :icon="categoryIcon(p.icon)" :tone="asTone(p.tone)" size="sm"
          /></template>
          <template #end>
            <Check
              v-if="form.parentId === p.id"
              class="size-5 text-primary-accent"
              stroke-width="2.6"
              aria-hidden="true"
            />
          </template>
        </GroupRow>
      </div>
    </IosSheet>
  </form>
</template>

<style scoped>
.cat-pick {
  transition: transform 120ms var(--ease-out);
}
.cat-pick:active {
  transform: scale(0.92);
}
</style>
