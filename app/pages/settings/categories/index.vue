<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import {
  Archive,
  ArrowDownUp,
  ArrowLeft,
  ArrowUpToLine,
  Check,
  ChevronRight,
  FolderInput,
  ListChecks,
  Plus,
  Tag,
  X,
} from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SelectCheck from '@/components/data/SelectCheck.vue';
import SelectionBar from '@/components/data/SelectionBar.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { categoriesApi, type Category, type CategoryKind } from '@/features/categories/api';
import { categoryKeys } from '@/features/categories/keys';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useCategories, useCategoryMutations } from '@/features/categories/useCategories';

definePageMeta({ layout: 'app' });
useHead({ title: 'Kategori · Money Manager' });

const { canEdit } = useActiveBook();
const categories = useCategories();
const mutations = useCategoryMutations();

const KINDS = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const;
const kind = ref<CategoryKind>('expense');
const sorting = ref(false);

const tree = computed(() => categories.tree(kind.value));
const archived = computed(() =>
  (categories.data.value ?? []).filter((c) => c.kind === kind.value && c.archived),
);
const showArchived = ref(false);

// ---------- pilih banyak: jadikan sub, jadikan utama, arsipkan ----------
const client = useQueryClient();
const toast = useToast();
const selecting = ref(false);
const selected = ref<string[]>([]);
const visible = computed(() => tree.value.flatMap((p) => [p, ...p.children]));
const chosen = computed(() => visible.value.filter((c) => selected.value.includes(c.id)));
function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id];
}
function toggleAll() {
  selected.value =
    selected.value.length === visible.value.length ? [] : visible.value.map((c) => c.id);
}
function stopSelecting() {
  selecting.value = false;
  selected.value = [];
}
watch([sorting, kind], () => stopSelecting());

const bulkBusy = ref(false);
type Field = 'parent_id' | 'archived';
/** Ubah satu kolom untuk kategori terpilih, dengan Urungkan ke nilai lama */
async function bulkSet<F extends Field>(
  list: Category[],
  field: F,
  value: Category[F],
  message: string,
) {
  if (!list.length) return;
  bulkBusy.value = true;
  try {
    await categoriesApi.updateMany(
      list.map((c) => c.id),
      { [field]: value },
    );
    await client.invalidateQueries({ queryKey: categoryKeys.all });
    stopSelecting();
    const before = new Map<Category[F], string[]>();
    for (const c of list) before.set(c[field], [...(before.get(c[field]) ?? []), c.id]);
    toast.show(`${list.length} kategori ${message}`, () =>
      Promise.all([...before].map(([v, ids]) => categoriesApi.updateMany(ids, { [field]: v })))
        .then(() => client.invalidateQueries({ queryKey: categoryKeys.all }))
        .catch((e: Error) => toast.show(e.message)),
    );
  } catch (e) {
    toast.show((e as Error).message);
  } finally {
    bulkBusy.value = false;
  }
}

/** Kategori utama yang punya sub tidak bisa jadi sub (hanya 2 level) */
const hasChildren = (c: Category) => tree.value.some((p) => p.id === c.id && p.children.length);
const parentPicker = ref(false);
const parentChoices = computed(() => tree.value.filter((p) => !selected.value.includes(p.id)));
function makeSubOf(parent: Category) {
  parentPicker.value = false;
  const list = chosen.value.filter((c) => !hasChildren(c) && c.id !== parent.id);
  const skipped = chosen.value.length - list.length;
  if (skipped) toast.show(`${skipped} kategori yang punya sub tidak dipindah`);
  bulkSet(list, 'parent_id', parent.id, `jadi sub ${parent.name}`);
}
function makeMain() {
  bulkSet(
    chosen.value.filter((c) => c.parent_id),
    'parent_id',
    null,
    'jadi kategori utama',
  );
}

const formOpen = ref(false);
const editing = ref<Category | null>(null);
const session = ref(0);
const { openAsPage } = useFormPage();
function openForm(category: Category | null) {
  if (!canEdit.value) return;
  const path = category
    ? `/settings/categories/${category.id}`
    : `/settings/categories/new?kind=${kind.value}`;
  if (openAsPage(path)) return;
  editing.value = category;
  session.value++;
  formOpen.value = true;
}

const styleOf = (c: Category) => ({ icon: categoryIcon(c.icon), tone: asTone(c.tone) });
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Kategori">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')"
          ><ArrowLeft aria-hidden="true"
        /></HeaderButton>
        <template v-if="canEdit">
          <HeaderButton :aria-pressed="sorting" @click="sorting = !sorting">
            <component :is="sorting ? Check : ArrowDownUp" aria-hidden="true" />{{
              sorting ? 'Selesai' : 'Urutkan'
            }}
          </HeaderButton>
          <HeaderButton @click="openForm(null)"><Plus aria-hidden="true" />Kategori</HeaderButton>
        </template>
      </template>
      <SegmentedControl v-model="kind" :options="KINDS" label="Jenis kategori" variant="on-grad" />
    </PageHeader>

    <div
      v-if="canEdit && tree.length && !sorting"
      class="mt-3 flex items-center justify-between gap-2 px-1"
    >
      <span class="text-xs text-muted-foreground">{{
        selecting ? 'Ketuk kategori untuk memilih' : 'Pindah, jadikan sub, atau arsipkan sekaligus'
      }}</span>
      <Button
        :variant="selecting ? 'default' : 'secondary'"
        :aria-pressed="selecting"
        @click="selecting ? stopSelecting() : (selecting = true)"
      >
        <component :is="selecting ? Check : ListChecks" />{{
          selecting ? 'Selesai' : 'Pilih banyak'
        }}
      </Button>
    </div>

    <Card v-if="categories.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="6" /></Card>
    <Card v-else-if="!tree.length" class="mt-3.5">
      <EmptyState
        :icon="Tag"
        title="Belum ada kategori"
        description="Tambahkan kategori untuk mengelompokkan transaksi."
      />
    </Card>

    <!-- Urutkan: kategori utama, lalu subkategori di dalam masing-masing induk -->
    <template v-else-if="sorting">
      <ListGroup label="Kategori utama">
        <SortableList
          :items="tree"
          label="Urutan kategori utama"
          @reorder="mutations.reorder.mutate"
        >
          <template #default="{ item }">
            <ListRow :title="item.name"
              ><template #lead><ToneIcon v-bind="styleOf(item)" /></template
            ></ListRow>
          </template>
        </SortableList>
      </ListGroup>
      <ListGroup
        v-for="p in tree.filter((t) => t.children.length > 1)"
        :key="p.id"
        :label="`Sub ${p.name}`"
      >
        <SortableList
          :items="p.children"
          :label="`Urutan subkategori ${p.name}`"
          @reorder="mutations.reorder.mutate"
        >
          <template #default="{ item }">
            <ListRow :title="item.name"
              ><template #lead><ToneIcon v-bind="styleOf(item)" size="sm" /></template
            ></ListRow>
          </template>
        </SortableList>
      </ListGroup>
    </template>

    <template v-else>
      <ListGroup
        v-for="p in tree"
        :key="p.id"
        :label="p.name"
        :aside="p.children.length ? `${p.children.length} sub` : ''"
      >
        <ListRow
          :as="canEdit ? 'button' : 'div'"
          :title="p.name"
          subtitle="Kategori utama"
          :aria-pressed="selecting ? selected.includes(p.id) : undefined"
          @click="selecting ? toggle(p.id) : openForm(p)"
        >
          <template #lead>
            <SelectCheck v-if="selecting" :selected="selected.includes(p.id)" />
            <ToneIcon v-else v-bind="styleOf(p)" />
          </template>
        </ListRow>
        <ListRow
          v-for="c in p.children"
          :key="c.id"
          :as="canEdit ? 'button' : 'div'"
          :title="c.name"
          :subtitle="`Sub ${p.name}`"
          class="pl-6"
          :aria-pressed="selecting ? selected.includes(c.id) : undefined"
          @click="selecting ? toggle(c.id) : openForm(c)"
        >
          <template #lead>
            <SelectCheck v-if="selecting" :selected="selected.includes(c.id)" size="sm" />
            <ToneIcon v-else v-bind="styleOf(c)" size="sm" />
          </template>
        </ListRow>
      </ListGroup>
    </template>

    <SelectionBar
      v-if="selecting"
      :count="chosen.length"
      :total="visible.length"
      label="Aksi untuk kategori terpilih"
      @toggle-all="toggleAll"
      @close="stopSelecting"
    >
      <Button :disabled="!chosen.length || bulkBusy" @click="parentPicker = true">
        <FolderInput />Jadikan sub
      </Button>
      <Button
        variant="secondary"
        :disabled="!chosen.some((c) => c.parent_id) || bulkBusy"
        @click="makeMain"
      >
        <ArrowUpToLine />Jadikan utama
      </Button>
      <Button
        variant="secondary"
        :disabled="!chosen.length || bulkBusy"
        @click="bulkSet(chosen, 'archived', true, 'diarsipkan')"
      >
        <Archive />Arsipkan
      </Button>
    </SelectionBar>

    <Overlay v-model:open="parentPicker" labelledby="parent-picker-title">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="parent-picker-title" class="m-0 flex-1 text-panel font-bold">
            Jadikan {{ chosen.length }} kategori sub dari
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tutup" @click="parentPicker = false">
            <X />
          </Button>
        </div>
        <div class="flex max-h-[55dvh] flex-col gap-0.5 overflow-y-auto" data-no-drag>
          <ListRow
            v-for="p in parentChoices"
            :key="p.id"
            as="button"
            :title="p.name"
            :subtitle="p.children.length ? `${p.children.length} sub` : 'Belum ada sub'"
            class="press hover:bg-surface-2"
            @click="makeSubOf(p)"
          >
            <template #lead><ToneIcon v-bind="styleOf(p)" size="sm" /></template>
          </ListRow>
        </div>
      </div>
    </Overlay>

    <template v-if="archived.length && !sorting">
      <button
        type="button"
        class="press mt-4 flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
        :aria-expanded="showArchived"
        @click="showArchived = !showArchived"
      >
        Diarsipkan ({{ archived.length }})
        <ChevronRight
          :class="['size-4 transition-transform duration-150', showArchived && 'rotate-90']"
          aria-hidden="true"
        />
      </button>
      <Card v-if="showArchived" class="flex flex-col gap-0.5 p-1">
        <ListRow
          v-for="c in archived"
          :key="c.id"
          :as="canEdit ? 'button' : 'div'"
          :title="categories.label(c.id, true)"
          subtitle="Tidak muncul di pilihan · transaksi lama tetap"
          class="opacity-70"
          @click="openForm(c)"
        >
          <template #lead><ToneIcon v-bind="styleOf(c)" /></template>
        </ListRow>
      </Card>
    </template>

    <Overlay v-model:open="formOpen" labelledby="category-form-title">
      <CategoryForm
        :key="session"
        :category="editing"
        :kind="kind"
        title-id="category-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
