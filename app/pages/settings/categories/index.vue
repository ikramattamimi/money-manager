<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { ArrowDownUp, Check, ChevronRight, Plus } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import GlassBar from '@/components/data/GlassBar.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Chip from '@/components/ios/Chip.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import Segmented from '@/components/ios/Segmented.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { categoriesApi, type Category, type CategoryKind } from '@/features/categories/api';
import { categoryKeys } from '@/features/categories/keys';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useCategories, useCategoryMutations } from '@/features/categories/useCategories';

// Kategori: Pengeluaran/Pemasukan, per kategori utama dengan subnya. Ketuk =
// ubah; Urutkan = seret pegangan; Pilih = jadikan sub, jadikan utama, atau
// arsipkan sekaligus (dengan Urungkan). Arsip bisa dibuka di bawah.
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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:rounded-2xl"
  >
    <NavBar
      title="Kategori"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static md:rounded-t-2xl"
    >
      <template v-if="canEdit" #right>
        <IconButton
          :label="sorting ? 'Selesai mengurutkan' : 'Urutkan kategori'"
          accent
          :aria-pressed="sorting"
          @click="sorting = !sorting"
        >
          <component :is="sorting ? Check : ArrowDownUp" />
        </IconButton>
        <IconButton label="Kategori baru" accent @click="openForm(null)"><Plus /></IconButton>
      </template>
      <div class="px-4 pb-2">
        <Segmented v-model="kind" :options="KINDS" label="Jenis kategori" />
      </div>
    </NavBar>

    <div class="pb-8">
      <div
        v-if="canEdit && tree.length && !sorting"
        class="flex items-center gap-2 pb-0.5 pl-8 pr-3 pt-3"
      >
        <span class="flex-1 text-meta text-muted-foreground">{{
          selecting
            ? 'Ketuk kategori untuk memilih'
            : 'Pindah, jadikan sub, atau arsipkan sekaligus'
        }}</span>
        <button
          type="button"
          class="shrink-0 px-2 py-1 text-body font-semibold text-primary-accent active:opacity-50"
          :aria-pressed="selecting"
          @click="selecting ? stopSelecting() : (selecting = true)"
        >
          {{ selecting ? 'Selesai' : 'Pilih' }}
        </button>
      </div>

      <EmptyCard v-if="categories.isPending.value" title="Memuat kategori…" />
      <EmptyCard
        v-else-if="!tree.length"
        title="Belum ada kategori"
        description="Tambahkan kategori untuk mengelompokkan transaksi."
      />

      <!-- Urutkan: kategori utama, lalu subkategori di dalam masing-masing induk -->
      <template v-else-if="sorting">
        <p class="mx-8 mb-0 mt-3 text-meta leading-[1.45] text-muted-foreground">
          Seret pegangan di kanan untuk mengubah urutan di pilihan kategori.
        </p>
        <section>
          <SectionHeader label="Kategori utama" />
          <div class="mx-4">
            <SortableList
              :items="tree"
              label="Urutan kategori utama"
              @reorder="mutations.reorder.mutate"
            >
              <template #default="{ item }">
                <span class="flex min-h-12 items-center gap-3 pl-3">
                  <ToneIcon v-bind="styleOf(item)" size="sm" />
                  <b class="truncate text-row font-medium">{{ item.name }}</b>
                </span>
              </template>
            </SortableList>
          </div>
        </section>
        <section v-for="p in tree.filter((t) => t.children.length > 1)" :key="p.id">
          <SectionHeader :label="`Sub ${p.name}`" />
          <div class="mx-4">
            <SortableList
              :items="p.children"
              :label="`Urutan subkategori ${p.name}`"
              @reorder="mutations.reorder.mutate"
            >
              <template #default="{ item }">
                <span class="flex min-h-12 items-center gap-3 pl-3">
                  <ToneIcon v-bind="styleOf(item)" size="xs" />
                  <b class="truncate text-row font-medium">{{ item.name }}</b>
                </span>
              </template>
            </SortableList>
          </div>
        </section>
      </template>

      <template v-else>
        <GroupedList
          v-for="p in tree"
          :key="p.id"
          :label="p.name"
          :aside="p.children.length ? `${p.children.length} sub` : ''"
        >
          <GroupRow
            v-for="c in [p, ...p.children]"
            :key="c.id"
            :title="c.name"
            :subtitle="c.id === p.id ? 'Kategori utama' : `Sub ${p.name}`"
            :chevron="canEdit && !selecting"
            :class="c.id !== p.id && 'pl-8'"
            :inset="c.id === p.id ? 58 : 74"
            :aria-pressed="selecting ? selected.includes(c.id) : undefined"
            v-on="canEdit ? { click: () => (selecting ? toggle(c.id) : openForm(c)) } : {}"
          >
            <template #icon>
              <span
                v-if="selecting"
                class="grid size-[30px] shrink-0 place-items-center"
                aria-hidden="true"
              >
                <span
                  :class="[
                    'grid size-6 place-items-center rounded-full border-[1.6px] text-white',
                    selected.includes(c.id)
                      ? 'border-transparent bg-primary'
                      : 'border-[var(--chevron)]',
                  ]"
                  ><Check v-if="selected.includes(c.id)" class="size-[13px]" stroke-width="3.4"
                /></span>
              </span>
              <ToneIcon v-else v-bind="styleOf(c)" size="sm" />
            </template>
          </GroupRow>
        </GroupedList>
      </template>

      <template v-if="archived.length && !sorting">
        <button
          type="button"
          class="flex items-center gap-1 px-8 pb-[7px] pt-[18px] text-meta uppercase tracking-[0.02em] text-muted-foreground active:opacity-50"
          :aria-expanded="showArchived"
          @click="showArchived = !showArchived"
        >
          <ChevronRight
            :class="['cat-chev size-3', showArchived && 'rotate-90']"
            stroke-width="3"
            aria-hidden="true"
          />
          Diarsipkan · {{ archived.length }}
        </button>
        <GroupedList v-if="showArchived">
          <GroupRow
            v-for="c in archived"
            :key="c.id"
            :title="categories.label(c.id, true)"
            subtitle="Tidak muncul di pilihan · transaksi lama tetap"
            :chevron="canEdit"
            class="opacity-70"
            v-on="canEdit ? { click: () => openForm(c) } : {}"
          >
            <template #icon><ToneIcon v-bind="styleOf(c)" size="sm" /></template>
          </GroupRow>
        </GroupedList>
      </template>

      <GlassBar v-if="selecting" class="flex-wrap">
        <span class="min-w-0 flex-1 text-label text-muted-foreground">
          <b class="text-bar text-foreground">{{ chosen.length }}</b> dipilih
        </span>
        <button
          type="button"
          class="px-2 py-1 text-body font-semibold text-primary-accent active:opacity-50"
          @click="toggleAll"
        >
          {{
            chosen.length === visible.length && visible.length ? 'Batal pilih semua' : 'Pilih semua'
          }}
        </button>
        <div :class="['flex w-full flex-wrap gap-2', bulkBusy && 'pointer-events-none opacity-40']">
          <span :class="!chosen.length && 'pointer-events-none opacity-40'">
            <Chip size="lg" @click="parentPicker = true">Jadikan sub</Chip>
          </span>
          <span :class="!chosen.some((c) => c.parent_id) && 'pointer-events-none opacity-40'">
            <Chip size="lg" @click="makeMain">Jadikan utama</Chip>
          </span>
          <span :class="!chosen.length && 'pointer-events-none opacity-40'">
            <Chip size="lg" @click="bulkSet(chosen, 'archived', true, 'diarsipkan')">Arsipkan</Chip>
          </span>
        </div>
      </GlassBar>
    </div>

    <IosSheet v-model:open="parentPicker" :title="`Jadikan ${chosen.length} kategori sub dari`">
      <div class="overflow-hidden rounded-group bg-background">
        <GroupRow
          v-for="p in parentChoices"
          :key="p.id"
          :title="p.name"
          :subtitle="p.children.length ? `${p.children.length} sub` : 'Belum ada sub'"
          @click="makeSubOf(p)"
        >
          <template #icon><ToneIcon v-bind="styleOf(p)" size="sm" /></template>
        </GroupRow>
      </div>
    </IosSheet>

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

<style scoped>
.cat-chev {
  transition: transform 200ms var(--ease-out);
}
</style>
