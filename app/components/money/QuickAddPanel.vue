<script setup lang="ts">
import {
  Calendar,
  Delete,
  Hash,
  Keyboard,
  PenLine,
  Tag,
  Wallet,
  ArrowLeftRight,
  X,
} from '@lucide/vue';
import { Button } from '@/components/ui/button';
import ChoiceChip from '@/components/data/ChoiceChip.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { useQuickAdd } from '@/features/quick-add/useQuickAdd';
import type { TxType } from '@/features/quick-add/types';
import { formatRupiah } from '@/lib/format';

// Form catat transaksi. Satu komponen untuk tiga bentuk: sheet bawah (HP),
// dialog tengah (iPad portrait), dan kartu inline di kolom kanan (>= 1024px).
// Inline: setelah simpan isian dikosongkan dan fokus tetap di input.
const props = defineProps<{ inline?: boolean; titleId?: string }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const qa = useQuickAdd();
const toast = useToast();
const input = ref<HTMLInputElement>();

const TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
] as const;
const type = computed({
  get: () => qa.draft.value.type,
  set: (value: TxType) => qa.setType(value),
});

const accountName = (id: string | null) => qa.source.accounts.value.find((a) => a.id === id)?.name;
const category = computed(() =>
  qa.source.categories.value.find((c) => c.id === qa.draft.value.categoryId),
);
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

function focus() {
  if (qa.mode.value === 'text') input.value?.focus({ preventScroll: true });
}

function toggleMode() {
  qa.mode.value = qa.mode.value === 'text' ? 'keypad' : 'text';
  if (qa.mode.value === 'text') nextTick(focus);
  else input.value?.blur();
}

function useTemplate(text: string) {
  qa.mode.value = 'text';
  qa.setText(text);
  nextTick(focus);
}

function save(again = false) {
  const result = qa.save();
  if (!result) return;
  toast.show(`Tersimpan · ${result.label}`, result.undo);
  if (again || props.inline) {
    // Mode beruntun: kosongkan isian, pertahankan akun dan jenis
    qa.reset(true);
    nextTick(focus);
  } else {
    qa.reset();
    emit('saved');
  }
}

function openFull() {
  qa.source.openFull?.({ ...qa.draft.value });
  qa.reset();
  if (!props.inline) emit('saved');
}

defineExpose({ focus });
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ inline ? 'Catat cepat' : 'Catat transaksi' }}
      </h2>
      <Button variant="secondary" size="default" @click="toggleMode">
        <component :is="qa.mode.value === 'text' ? Hash : Keyboard" />
        {{ qa.mode.value === 'text' ? 'Keypad' : 'Ketik' }}
      </Button>
      <Button
        v-if="!inline"
        variant="secondary"
        size="icon"
        aria-label="Tutup"
        class="press-icon"
        @click="emit('close')"
      >
        <X />
      </Button>
    </div>

    <SegmentedControl v-model="type" :options="TYPES" label="Jenis transaksi" />

    <div class="flex items-baseline justify-center gap-1.5 pb-0.5 pt-1.5" aria-live="polite">
      <span class="text-[15px] font-semibold text-muted-foreground">Rp</span>
      <b
        :class="[
          'font-bold tracking-[-0.03em] tabular-nums',
          inline ? 'text-[30px]' : 'text-4xl',
          !qa.draft.value.amount && 'text-border-strong',
          qa.draft.value.amount && qa.draft.value.type === 'income' && 'text-primary-accent',
        ]"
      >
        {{ formatRupiah(qa.draft.value.amount).replace('Rp ', '') }}
      </b>
    </div>

    <div v-if="qa.mode.value === 'text'">
      <label for="quick-input" class="mb-1.5 block text-label font-semibold">Ketik saja</label>
      <input
        id="quick-input"
        ref="input"
        :value="qa.text.value"
        type="text"
        enterkeyhint="done"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="kopi 25rb gopay"
        class="h-11 w-full rounded-[10px] border border-border-strong bg-card px-3 text-base outline-none placeholder:text-faint focus:border-primary-accent focus:ring-3 focus:ring-primary-soft"
        @input="qa.setText(($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="save()"
      />
      <p class="m-0 mt-1.5 text-xs text-faint">
        Bisa juga: <span class="font-mono">bensin 100rb kemarin</span>,
        <span class="font-mono">bca &gt; gopay 99rb</span>,
        <span class="font-mono">+ gaji 5jt bca</span>
      </p>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <ChoiceChip
        :icon="Wallet"
        :label="accountName(qa.draft.value.accountId) ?? 'Akun'"
        :filled="!!qa.draft.value.accountId"
        @click="qa.cycleAccount()"
      />
      <ChoiceChip
        v-if="qa.draft.value.type === 'transfer'"
        :icon="ArrowLeftRight"
        :label="accountName(qa.draft.value.toAccountId) ?? 'Ke akun'"
        :filled="!!qa.draft.value.toAccountId"
        @click="qa.cycleToAccount()"
      />
      <ChoiceChip
        v-else
        :icon="category?.icon ?? Tag"
        :label="category?.name ?? 'Kategori'"
        :filled="!!category"
        @click="qa.cycleCategory()"
      />
      <ChoiceChip
        :icon="Calendar"
        :label="qa.draft.value.date === 'yesterday' ? 'Kemarin' : 'Hari ini'"
        filled
        @click="qa.toggleDate()"
      />
      <ChoiceChip v-if="qa.draft.value.note" :icon="PenLine" :label="qa.draft.value.note" filled />
    </div>

    <div v-if="qa.mode.value === 'keypad'" class="grid grid-cols-3 gap-1.5">
      <button
        v-for="key in KEYS"
        :key="key"
        type="button"
        :aria-label="key === 'del' ? 'Hapus angka' : undefined"
        :class="[
          'press grid h-12.5 place-items-center rounded-[10px] bg-surface-2 font-semibold',
          key === 'del' || key === '000' ? 'text-base text-muted-foreground' : 'text-[22px]',
        ]"
        @click="qa.pressKey(key)"
      >
        <Delete v-if="key === 'del'" class="size-5.5" aria-hidden="true" />
        <template v-else>{{ key }}</template>
      </button>
    </div>

    <button
      v-if="qa.source.openFull"
      type="button"
      class="press -mt-1 self-start text-meta font-semibold text-primary-ink hover:underline"
      @click="openFull"
    >
      Form lengkap: tanggal, jam, keterangan, biaya transfer
    </button>

    <div v-if="qa.source.templates.value.length">
      <div class="pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        Template
      </div>
      <div
        class="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          v-for="tpl in qa.source.templates.value"
          :key="tpl.id"
          type="button"
          class="press inline-flex h-8.5 flex-none items-center gap-2 rounded-[10px] border bg-card py-0 pl-1.5 pr-3 text-meta font-semibold"
          @click="useTemplate(tpl.text)"
        >
          <ToneIcon
            :icon="qa.source.categories.value.find((c) => c.id === tpl.categoryId)!.icon"
            :tone="qa.source.categories.value.find((c) => c.id === tpl.categoryId)!.tone"
            size="xs"
          />
          {{ tpl.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-[auto_1fr] gap-2">
      <Button variant="secondary" size="touch" :disabled="!qa.canSave.value" @click="save(true)"
        >Simpan &amp; lagi</Button
      >
      <Button size="touch" :disabled="!qa.canSave.value" @click="save()">
        {{ qa.canSave.value ? `Simpan ${formatRupiah(qa.draft.value.amount)}` : 'Simpan' }}
      </Button>
    </div>
  </div>
</template>
