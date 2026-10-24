<script setup lang="ts">
import { ArrowDownUp, ArrowLeft, Check, ChevronRight, Plus, Tag } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { Category, CategoryKind } from '@/features/categories/api';
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
          @click="openForm(p)"
        >
          <template #lead><ToneIcon v-bind="styleOf(p)" /></template>
        </ListRow>
        <ListRow
          v-for="c in p.children"
          :key="c.id"
          :as="canEdit ? 'button' : 'div'"
          :title="c.name"
          :subtitle="`Sub ${p.name}`"
          class="pl-6"
          @click="openForm(c)"
        >
          <template #lead><ToneIcon v-bind="styleOf(c)" size="sm" /></template>
        </ListRow>
      </ListGroup>
    </template>

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
