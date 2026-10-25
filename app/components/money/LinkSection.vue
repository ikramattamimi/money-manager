<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Link2, Plus, Search, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { DraftLink } from '@/features/quick-add/types';
import { offsetsApi, type Transaction } from '@/features/transactions/api';
import { transactionKeys } from '@/features/transactions/keys';
import { formatRupiah } from '@/lib/format';
import { jakartaParts, MONTHS_SHORT } from '@/lib/time';

// Kaitan reimburse/utang di form transaksi (fase 10 T6).
// Pemasukan: pilih pengeluaran yang diganti dan nominal tiap kaitan.
// Pengeluaran: lihat siapa yang sudah menggantinya, lepas kaitan, atau
// "Tandai sudah diganti" untuk mencatat pemasukan penggantinya.
const props = defineProps<{
  kind: 'income' | 'expense';
  /** Transaksi yang diedit (null = transaksi baru) */
  transaction: Transaction | null;
  /** Nominal transaksi di form saat ini */
  amount: number;
  error?: string;
}>();
const links = defineModel<DraftLink[]>('links', { required: true });
const emit = defineEmits<{
  /** Pengeluaran: catat pemasukan pengganti untuk sisa ini */
  reimburse: [remaining: number];
  /** Pemasukan baru tanpa nominal: isi dengan total kaitan */
  fillAmount: [total: number];
}>();

const { bookId, canEdit } = useActiveBook();
const client = useQueryClient();
const toast = useToast();
const categories = useCategories();

const date = (iso: string) => {
  const d = jakartaParts(iso);
  return `${d.day} ${MONTHS_SHORT[d.month - 1]} ${d.year}`;
};

// ---------- pemasukan ----------
const linkedTotal = computed(() => links.value.reduce((s, l) => s + l.amount, 0));
const over = computed(() => props.amount > 0 && linkedTotal.value > props.amount);

const pickerOpen = ref(false);
const query = ref('');
// Ketikan pencarian ditunda 250 ms supaya tidak memanggil RPC tiap huruf
const debounced = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
watch(query, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => (debounced.value = value), 250);
});
onBeforeUnmount(() => clearTimeout(timer));
const candidates = useQuery({
  queryKey: computed(() => [
    ...transactionKeys.all,
    'offset-candidates',
    bookId.value,
    props.transaction?.id ?? null,
    debounced.value.trim(),
  ]),
  queryFn: () =>
    offsetsApi.candidates(bookId.value!, props.transaction?.id ?? null, debounced.value),
  enabled: computed(() => pickerOpen.value && !!bookId.value),
});
const available = computed(() =>
  (candidates.data.value ?? []).filter((c) => !links.value.some((l) => l.expenseId === c.id)),
);

function add(c: NonNullable<typeof candidates.data.value>[number]) {
  // Isi sebesar sisa pengeluaran, dibatasi sisa pemasukan kalau nominalnya sudah diisi
  const room = props.amount > 0 ? Math.max(props.amount - linkedTotal.value, 0) : c.remaining;
  const amount = Math.min(c.remaining, room) || c.remaining;
  links.value = [
    ...links.value,
    {
      expenseId: c.id,
      note: c.note || categories.label(c.category_id) || 'Pengeluaran',
      occurredAt: c.occurred_at,
      amount,
      max: c.remaining,
    },
  ];
  if (props.amount === 0) emit('fillAmount', linkedTotal.value);
  pickerOpen.value = false;
  query.value = '';
}

function removeLink(expenseId: string) {
  links.value = links.value.filter((l) => l.expenseId !== expenseId);
}

// ---------- pengeluaran ----------
// Salinan lokal: lepas kaitan tidak membuat ulang form (isian lain tetap)
const reimbursedBy = ref(props.kind === 'expense' ? [...(props.transaction?.linked ?? [])] : []);
const remaining = computed(() =>
  props.transaction
    ? props.transaction.amount - reimbursedBy.value.reduce((s, l) => s + l.amount, 0)
    : 0,
);

async function unlink(incomeId: string) {
  if (!props.transaction) return;
  try {
    await offsetsApi.unlink(props.transaction.id, incomeId);
    reimbursedBy.value = reimbursedBy.value.filter((l) => l.id !== incomeId);
    toast.show('Kaitan dilepas');
    await client.invalidateQueries({ queryKey: transactionKeys.all });
  } catch (error) {
    toast.show((error as Error).message);
  }
}
</script>

<template>
  <section aria-labelledby="link-title" class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <Link2 class="size-4 text-muted-foreground" aria-hidden="true" />
      <h3 id="link-title" class="m-0 flex-1 text-label font-semibold">
        {{ kind === 'income' ? 'Mengganti pengeluaran' : 'Diganti' }}
      </h3>
    </div>

    <!-- Pemasukan: daftar kaitan yang bisa diubah -->
    <template v-if="kind === 'income'">
      <p class="m-0 text-xs text-muted-foreground">
        Untuk reimburse atau utang yang dibayar. Bagian yang dikaitkan tidak dihitung sebagai
        pemasukan, dan pengeluarannya ikut berkurang.
      </p>
      <div
        v-for="(l, i) in links"
        :key="l.expenseId"
        class="grid grid-cols-[minmax(0,1fr)_132px_auto] items-center gap-2 rounded-[10px] border bg-card px-2.5 py-1.5"
      >
        <span class="flex min-w-0 flex-col">
          <b class="truncate text-meta font-semibold">{{ l.note }}</b>
          <small
            :class="[
              'truncate text-2xs',
              l.max !== null && l.amount > l.max ? 'text-bad' : 'text-muted-foreground',
            ]"
          >
            {{ date(l.occurredAt)
            }}<template v-if="l.max !== null"> · sisa {{ formatRupiah(l.max) }}</template>
          </small>
        </span>
        <AmountInput
          :id="`link-amount-${i}`"
          v-model="l.amount"
          :invalid="(l.max !== null && l.amount > l.max) || l.amount <= 0"
        />
        <Button
          v-if="canEdit"
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="`Lepas kaitan ${l.note}`"
          @click="removeLink(l.expenseId)"
        >
          <X />
        </Button>
      </div>
      <p v-if="links.length" :class="['m-0 text-xs', over ? 'text-bad' : 'text-muted-foreground']">
        Dikaitkan {{ formatRupiah(linkedTotal) }}
        <template v-if="amount > 0">
          ·
          {{
            over
              ? 'melebihi pemasukan'
              : amount === linkedTotal
                ? 'seluruh pemasukan ini mengganti pengeluaran'
                : `sisa ${formatRupiah(amount - linkedTotal)} tetap pemasukan`
          }}
        </template>
      </p>
      <p v-if="error" class="m-0 text-xs text-bad" role="alert">{{ error }}</p>
      <Button
        v-if="canEdit"
        type="button"
        variant="secondary"
        class="self-start"
        @click="pickerOpen = true"
      >
        <Plus />Pilih pengeluaran
      </Button>
    </template>

    <!-- Pengeluaran: siapa yang sudah menggantinya -->
    <template v-else>
      <div
        v-for="l in reimbursedBy"
        :key="l.id"
        class="flex items-center gap-2 rounded-[10px] border bg-card px-2.5 py-1.5"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <b class="truncate text-meta font-semibold">{{ l.note || 'Pemasukan' }}</b>
          <small class="text-2xs text-muted-foreground">{{ date(l.occurredAt) }}</small>
        </span>
        <b class="text-meta tabular-nums text-primary-accent">{{ formatRupiah(l.amount) }}</b>
        <Button
          v-if="canEdit"
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="`Lepas kaitan dengan ${l.note || 'pemasukan'}`"
          @click="unlink(l.id)"
        >
          <X />
        </Button>
      </div>
      <p class="m-0 text-xs text-muted-foreground">
        <template v-if="reimbursedBy.length">
          {{
            remaining > 0
              ? `Sisa ${formatRupiah(remaining)} masih dihitung sebagai pengeluaran.`
              : 'Sudah diganti penuh, tidak dihitung sebagai pengeluaran.'
          }}
        </template>
        <template v-else>
          Kalau pengeluaran ini nanti diganti (reimburse, utang dibayar), catat penggantinya di sini
          supaya tidak dihitung dua kali.
        </template>
      </p>
      <Button
        v-if="canEdit && remaining > 0"
        type="button"
        variant="secondary"
        class="self-start"
        @click="emit('reimburse', remaining)"
      >
        <Plus />Tandai sudah diganti
      </Button>
    </template>

    <Overlay v-model:open="pickerOpen" labelledby="link-picker-title">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="link-picker-title" class="m-0 flex-1 text-panel font-bold">
            Pengeluaran yang diganti
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            @click="pickerOpen = false"
          >
            <X />
          </Button>
        </div>
        <div class="relative" data-no-drag>
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            v-model="query"
            type="search"
            class="field-input pl-9!"
            placeholder="Cari catatan, mis. berobat"
            aria-label="Cari pengeluaran"
          />
        </div>
        <div
          class="flex max-h-[50dvh] flex-col gap-0.5 overflow-y-auto overscroll-contain"
          data-sheet-body
        >
          <Skeleton v-if="candidates.isPending.value" :rows="4" />
          <EmptyState
            v-else-if="!available.length"
            :icon="Search"
            title="Tidak ada pengeluaran"
            :description="
              query ? 'Tidak ada yang cocok dengan pencarian.' : 'Semua pengeluaran sudah diganti.'
            "
          />
          <ListRow
            v-for="c in available"
            :key="c.id"
            as="button"
            :title="c.note || categories.label(c.category_id) || 'Pengeluaran'"
            :subtitle="`${date(c.occurred_at)} · ${categories.label(c.category_id) || 'Tanpa kategori'}`"
            :value="formatRupiah(c.remaining)"
            :meta="c.remaining < c.amount ? `dari ${formatRupiah(c.amount)}` : undefined"
            @click="add(c)"
          >
            <template #lead>
              <ToneIcon v-bind="categories.style(c.category_id)" size="sm" />
            </template>
          </ListRow>
        </div>
      </div>
    </Overlay>
  </section>
</template>
