<script setup lang="ts">
import {
  ArrowLeftRight,
  Calendar,
  Delete,
  Hash,
  History,
  Keyboard,
  PenLine,
  Tag,
  Wallet,
  X,
  Zap,
} from '@lucide/vue';
import type { GridItem } from '@/components/data/GridPicker.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Chip from '@/components/ios/Chip.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { useQuickAdd } from '@/features/quick-add/useQuickAdd';
import type { QuickTemplate, TxType } from '@/features/quick-add/types';
import { formatRupiah } from '@/lib/format';
import ChoiceGrid from './ChoiceGrid.vue';
import StatementImport from './StatementImport.vue';

// Ketik cepat (menu tahan tombol +). Satu komponen untuk tiga bentuk: sheet bawah (HP),
// dialog tengah (iPad portrait), dan kartu inline di kolom kanan (>= 1024px).
// Inline: setelah simpan isian dikosongkan dan fokus tetap di input.
// `withImport` (iPad/desktop): tab Struk dan Mutasi membuka impor di panel ini juga.
const props = defineProps<{ inline?: boolean; titleId?: string; withImport?: boolean }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const SOURCES = [
  { value: 'quick', label: 'Ketik cepat' },
  { value: 'photo', label: 'Struk' },
  { value: 'pdf', label: 'Mutasi' },
] as const;
const source = ref<'quick' | 'photo' | 'pdf'>('quick');

/** Impor selesai: panel samping kembali ke Cepat, dialog ditutup */
function importDone() {
  source.value = 'quick';
  if (!props.inline) emit('saved');
  else nextTick(focus);
}

const qa = useQuickAdd();
const toast = useToast();
const input = ref<HTMLInputElement>();

const TYPES = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'transfer', label: 'Transfer' },
] as const;
const type = computed({
  get: () => qa.draft.value.type,
  set: (value: TxType) => qa.setType(value),
});

const accountName = (id: string | null) => qa.source.accounts.value.find((a) => a.id === id)?.name;
const categoryOf = (id: string | null) => qa.source.categories.value.find((c) => c.id === id);
const category = computed(() => categoryOf(qa.draft.value.categoryId));
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

// ---------- grid pilihan (tap chip) ----------
type Picker = 'account' | 'to' | 'category';
const picker = ref<Picker | null>(null);
const PICKER_TITLE: Record<Picker, string> = {
  account: 'Akun',
  to: 'Akun tujuan',
  category: 'Kategori',
};
const pickerItems = computed<GridItem[]>(() => {
  const d = qa.draft.value;
  const kind = d.type === 'income' ? 'income' : 'expense';
  const custom = qa.source.pickerItems;
  if (picker.value === 'category')
    return custom
      ? custom.category(kind)
      : qa.source.categories.value
          .filter((c) => c.kind === kind)
          .map((c) => ({ id: c.id, label: c.name, icon: c.icon, tone: c.tone }));
  const exclude = picker.value === 'to' ? d.accountId : null;
  return custom
    ? custom.account(exclude)
    : qa.source.accounts.value.map((a) => ({
        id: a.id,
        label: a.name,
        disabled: a.id === exclude,
      }));
});
const pickerValue = computed(() => {
  const d = qa.draft.value;
  if (picker.value === 'category') return d.categoryId ?? '';
  return (picker.value === 'to' ? d.toAccountId : d.accountId) ?? '';
});

function openPicker(which: Picker) {
  picker.value = picker.value === which ? null : which;
}
// Urutan seperti Realbyte: kategori → akun (kalau belum ada) → selesai
function choose(id: string) {
  const which = picker.value;
  if (which === 'category') {
    qa.setCategory(id);
    picker.value = qa.draft.value.accountId ? null : 'account';
  } else if (which === 'account') {
    qa.setAccount(id);
    picker.value = qa.draft.value.type === 'transfer' && !qa.draft.value.toAccountId ? 'to' : null;
  } else {
    qa.setToAccount(id);
    picker.value = null;
  }
}

function focus() {
  if (qa.mode.value === 'text') input.value?.focus({ preventScroll: true });
}

function toggleMode() {
  qa.mode.value = qa.mode.value === 'text' ? 'keypad' : 'text';
  if (qa.mode.value === 'text') nextTick(focus);
  else input.value?.blur();
}

/** Satu tap: template bernominal langsung tersimpan; tanpa nominal buka keypad */
function pickTemplate(tpl: QuickTemplate) {
  picker.value = null;
  if (qa.source.useTemplate) {
    const result = qa.source.useTemplate(tpl.id);
    if (result === 'needs-amount') {
      if (tpl.draft) qa.applyDraft(tpl.draft);
      qa.mode.value = 'keypad';
      input.value?.blur();
    } else if (result) {
      toast.show(`${tpl.label} · ${result.label}`, result.undo);
      if (!props.inline) emit('saved');
    }
    return;
  }
  if (tpl.text) {
    qa.mode.value = 'text';
    qa.setText(tpl.text);
    nextTick(focus);
  }
}

function save(again = false) {
  const result = qa.save();
  if (!result) return;
  toast.show(`Tersimpan · ${result.label}`, result.undo);
  picker.value = null;
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
  picker.value = null;
  if (!props.inline) emit('saved');
}

defineExpose({ focus });
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-sheet font-bold tracking-[-0.02em]">
        {{ inline && !withImport ? 'Ketik cepat' : 'Catat transaksi' }}
      </h2>
      <Chip v-if="source === 'quick'" @click="toggleMode">
        <component :is="qa.mode.value === 'text' ? Hash : Keyboard" class="size-4" />
        {{ qa.mode.value === 'text' ? 'Papan angka' : 'Ketik' }}
      </Chip>
      <IconButton v-if="!inline" label="Tutup" @click="emit('close')"><X /></IconButton>
    </div>

    <Segmented
      v-if="withImport"
      v-model="source"
      :options="SOURCES"
      label="Cara mencatat"
      @update:model-value="picker = null"
    />

    <StatementImport
      v-if="source !== 'quick'"
      :key="source"
      :source="source"
      embedded
      @done="importDone"
    />

    <template v-else>
      <Segmented v-model="type" :options="TYPES" label="Jenis transaksi" />

      <div class="flex items-baseline justify-center gap-1.5 pb-0.5 pt-1.5" aria-live="polite">
        <span class="text-body font-semibold text-muted-foreground">Rp</span>
        <b
          :class="[
            'font-bold tracking-[-0.03em]',
            inline ? 'text-[30px]' : 'text-[36px]',
            !qa.draft.value.amount && 'text-ter',
            qa.draft.value.amount && qa.draft.value.type === 'income' && 'text-inc',
          ]"
        >
          {{ formatRupiah(qa.draft.value.amount).replace('Rp ', '') }}
        </b>
      </div>

      <div v-if="qa.mode.value === 'text'">
        <label for="quick-input" class="sr-only">Ketik saja</label>
        <input
          id="quick-input"
          ref="input"
          :value="qa.text.value"
          type="text"
          enterkeyhint="done"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Ketik saja: kopi 25rb gopay"
          class="h-12 w-full rounded-[12px] bg-fill px-3.5 text-row outline-none placeholder:text-ter focus:shadow-[0_0_0_2px_var(--primary-accent)]"
          @input="qa.setText(($event.target as HTMLInputElement).value)"
          @focus="picker = null"
          @keydown.enter.prevent="save()"
        />
        <p class="m-0 mt-1.5 px-1 text-meta leading-[1.45] text-muted-foreground">
          Bisa juga: <span class="font-mono">bensin 100rb kemarin</span>,
          <span class="font-mono">bca ke gopay 99rb</span>,
          <span class="font-mono">+ gaji 5jt bca</span>,
          <span class="font-mono">parkir 2rb+3rb senin</span>
        </p>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <Chip
          :on="!!qa.draft.value.accountId"
          :aria-expanded="picker === 'account'"
          @click="openPicker('account')"
        >
          <Wallet class="size-3.5" aria-hidden="true" />{{
            accountName(qa.draft.value.accountId) ?? 'Akun'
          }}
        </Chip>
        <Chip
          v-if="qa.draft.value.type === 'transfer'"
          :on="!!qa.draft.value.toAccountId"
          :aria-expanded="picker === 'to'"
          @click="openPicker('to')"
        >
          <ArrowLeftRight class="size-3.5" aria-hidden="true" />{{
            accountName(qa.draft.value.toAccountId) ?? 'Ke akun'
          }}
        </Chip>
        <Chip
          v-else
          :on="!!category"
          :aria-expanded="picker === 'category'"
          @click="openPicker('category')"
        >
          <component :is="category?.icon ?? Tag" class="size-3.5" aria-hidden="true" />{{
            category?.name ?? 'Kategori'
          }}
        </Chip>
        <Chip on @click="qa.toggleDate()">
          <Calendar class="size-3.5" aria-hidden="true" />{{ qa.when.value }}
        </Chip>
        <Chip v-if="qa.draft.value.note" on>
          <PenLine class="size-3.5" aria-hidden="true" /><span class="max-w-[160px] truncate">{{
            qa.draft.value.note
          }}</span>
        </Chip>
        <Chip v-if="qa.suggestedAmount.value" @click="qa.setAmount(qa.suggestedAmount.value)">
          <History class="size-3.5" aria-hidden="true" />Biasanya
          {{ formatRupiah(qa.suggestedAmount.value) }}
        </Chip>
      </div>

      <section
        v-if="picker"
        class="overflow-hidden rounded-[14px] bg-[var(--kb-bg)]"
        :aria-label="PICKER_TITLE[picker]"
      >
        <div
          class="flex h-11 items-center gap-2 bg-[var(--kb-head)] pl-4 pr-1 shadow-[inset_0_-0.5px_0_var(--kb-head-line)]"
        >
          <b class="flex-1 text-body font-semibold">{{ PICKER_TITLE[picker] }}</b>
          <IconButton
            :label="`Tutup pilihan ${PICKER_TITLE[picker].toLowerCase()}`"
            @click="picker = null"
          >
            <X />
          </IconButton>
        </div>
        <div class="max-h-[46dvh] overflow-y-auto overscroll-contain">
          <ChoiceGrid
            :key="picker + qa.draft.value.type"
            :items="pickerItems"
            :model-value="pickerValue"
            :label="PICKER_TITLE[picker]"
            class="pb-1.5!"
            @select="choose"
          />
        </div>
      </section>

      <div
        v-if="qa.mode.value === 'keypad'"
        class="grid grid-cols-3 gap-1.5 rounded-[14px] bg-[var(--kb-bg)] p-1.5"
      >
        <button
          v-for="key in KEYS"
          :key="key"
          type="button"
          :aria-label="key === 'del' ? 'Hapus angka' : undefined"
          :class="[
            'qa-key grid h-[50px] place-items-center rounded-[9px] shadow-[0_1px_0_var(--kb-shadow)]',
            key === 'del' || key === '000'
              ? 'bg-[var(--kb-fn)] text-bar text-foreground'
              : 'bg-[var(--kb-key)] text-[24px]',
          ]"
          @click="qa.pressKey(key)"
        >
          <Delete v-if="key === 'del'" class="size-[22px]" aria-hidden="true" />
          <template v-else>{{ key }}</template>
        </button>
      </div>

      <button
        v-if="qa.source.openFull"
        type="button"
        class="-mt-0.5 self-start px-1 text-meta font-semibold text-primary-accent active:opacity-50"
        @click="openFull"
      >
        Form lengkap: tanggal, jam, keterangan, biaya transfer
      </button>

      <div v-if="qa.source.templates.value.length">
        <div class="px-1 pb-1.5 text-meta uppercase tracking-[0.02em] text-muted-foreground">
          Bookmark
        </div>
        <div
          class="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            v-for="tpl in qa.source.templates.value"
            :key="tpl.id"
            type="button"
            class="qa-tpl inline-flex h-[34px] flex-none items-center gap-2 rounded-full bg-fill py-0 pl-1.5 pr-3 text-meta font-semibold"
            @click="pickTemplate(tpl)"
          >
            <ToneIcon
              :icon="categoryOf(tpl.categoryId)?.icon ?? Zap"
              :tone="categoryOf(tpl.categoryId)?.tone ?? 'neutral'"
              size="xs"
            />
            {{ tpl.label }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-[auto_1fr] gap-2">
        <IosButton variant="gray" :disabled="!qa.canSave.value" @click="save(true)"
          >Simpan &amp; lagi</IosButton
        >
        <IosButton :disabled="!qa.canSave.value" @click="save()">
          {{ qa.canSave.value ? `Simpan ${formatRupiah(qa.draft.value.amount)}` : 'Simpan' }}
        </IosButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qa-key,
.qa-tpl {
  transition: transform 100ms var(--ease-out);
}
.qa-key:active,
.qa-tpl:active {
  transform: scale(0.95);
}
.qa-key:active {
  background: var(--kb-key-press);
}
</style>
