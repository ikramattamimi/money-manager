<script setup lang="ts">
import { ChevronLeft, ChevronRight, PiggyBank } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetStatus } from '@/features/budgets/useBudgets';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG, periodRangeLabel } from '@/lib/time';

// Atur budget (mockup budget-setting): semua kategori pengeluaran dengan
// budgetnya di bulan terpilih. Kategori bersub bisa dibuka untuk budget tiap
// sub. Ketuk = halaman nominal. Budget berlaku mulai bulan yang dilihat.
definePageMeta({ layout: 'app' });
useHead({ title: 'Atur budget · Money Manager' });

const { canEdit, monthStartDay } = useActiveBook();
const { year, month, shift, key } = useBudgetMonth();
const { views } = useBudgetStatus(year, month);
const categories = useCategories();

const range = computed(
  () =>
    periodRangeLabel(year.value, month.value, monthStartDay.value) ||
    `${MONTHS_LONG[month.value - 1]} ${year.value}`,
);
const budgetOf = (id: string | null) => views.value.find((v) => v.category_id === id) ?? null;
const open = ref<string | null>(null);

const rows = computed(() =>
  categories.tree('expense').map((p) => ({
    id: p.id,
    label: p.name,
    icon: categoryIcon(p.icon),
    tone: asTone(p.tone),
    budget: budgetOf(p.id),
    subs: p.children.map((c) => ({ id: c.id, label: c.name, budget: budgetOf(c.id) })),
  })),
);
const total = computed(() => budgetOf(null));
const href = (id: string) => `/stats/budget/${id}/edit?month=${key.value}`;
const amount = (b: { limit: number } | null) => (b ? formatRupiah(b.limit) : 'Rp 0');
const NuxtLink = resolveComponent('NuxtLink');
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Atur budget"
      back="Statistik"
      back-to="/stats"
      line
      class="sticky top-0 md:static"
    >
      <div class="flex items-center justify-center gap-0.5 pb-1.5">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          class="grid size-11 place-items-center rounded-xl active:bg-fill-press"
          @click="shift(-1)"
        >
          <ChevronLeft class="size-5" stroke-width="2.2" aria-hidden="true" />
        </button>
        <span class="min-w-[190px] text-center text-bar font-semibold tracking-[-0.02em]">{{
          range
        }}</span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          class="grid size-11 place-items-center rounded-xl active:bg-fill-press"
          @click="shift(1)"
        >
          <ChevronRight class="size-5" stroke-width="2.2" aria-hidden="true" />
        </button>
      </div>
    </NavBar>

    <div class="mx-4 mt-3.5 overflow-hidden rounded-group bg-card">
      <component
        :is="canEdit ? NuxtLink : 'div'"
        :to="canEdit ? href('total') : undefined"
        class="set-row flex min-h-12 items-center gap-3 py-2 pl-4 pr-3.5 active:bg-fill-press"
      >
        <ToneIcon :icon="PiggyBank" tone="primary" size="sm" />
        <span class="flex min-w-0 flex-1 flex-col">
          <b class="text-row font-semibold">Semua pengeluaran</b>
          <span class="text-meta text-muted-foreground">Budget total bulanan</span>
        </span>
        <span :class="['shrink-0 text-row', total ? 'font-semibold' : 'text-muted-foreground']">{{
          amount(total)
        }}</span>
      </component>
    </div>

    <div class="mx-4 mt-3.5 overflow-hidden rounded-group bg-card">
      <template v-for="r in rows" :key="r.id">
        <div class="set-row flex min-h-12 items-center">
          <component
            :is="canEdit ? NuxtLink : 'div'"
            :to="canEdit ? href(r.id) : undefined"
            class="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 pl-4 active:bg-fill-press"
          >
            <ToneIcon :icon="r.icon" :tone="r.tone" size="sm" />
            <span class="flex min-w-0 flex-1 flex-col">
              <b class="truncate text-row font-medium">{{ r.label }}</b>
              <span v-if="r.subs.length" class="truncate text-meta text-muted-foreground">{{
                r.subs.map((s) => s.label).join(', ')
              }}</span>
            </span>
            <span
              :class="[
                'shrink-0 pr-2 text-row',
                r.budget ? 'font-semibold' : 'text-muted-foreground',
              ]"
              >{{ amount(r.budget) }}</span
            >
          </component>
          <button
            v-if="r.subs.length"
            type="button"
            :aria-expanded="open === r.id"
            :aria-label="`${open === r.id ? 'Tutup' : 'Buka'} sub-kategori ${r.label}`"
            class="grid h-12 w-10 shrink-0 place-items-center text-chevron"
            @click="open = open === r.id ? null : r.id"
          >
            <ChevronRight
              class="chev size-[18px]"
              :style="{ transform: `rotate(${open === r.id ? 90 : 0}deg)` }"
              stroke-width="2.6"
              aria-hidden="true"
            />
          </button>
          <span v-else class="w-3.5" />
        </div>
        <template v-if="open === r.id">
          <component
            :is="canEdit ? NuxtLink : 'div'"
            v-for="s in r.subs"
            :key="s.id"
            :to="canEdit ? href(s.id) : undefined"
            class="set-row flex min-h-12 items-center gap-3 bg-surface-2 py-2 pl-14 pr-6 active:bg-fill-press"
          >
            <b class="min-w-0 flex-1 truncate text-body font-medium">{{ s.label }}</b>
            <span
              :class="['shrink-0 text-row', s.budget ? 'font-semibold' : 'text-muted-foreground']"
              >{{ amount(s.budget) }}</span
            >
          </component>
        </template>
      </template>
    </div>
    <p class="mx-8 mb-6 mt-2.5 text-meta text-muted-foreground">
      Ketuk kategori untuk mengatur budget. Nominal baru berlaku mulai {{ range }}; bulan sebelumnya
      tidak berubah.
    </p>
  </div>
</template>

<style scoped>
.set-row {
  position: relative;
  transition: background-color 120ms ease;
}
.set-row + .set-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 58px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
.chev {
  transition: transform 200ms var(--ease-out);
}
</style>
