<script setup lang="ts">
import {
  ArrowLeftRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  FileDown,
  Plus,
  Sparkles,
  Tag,
  X,
} from '@lucide/vue';
import type { BankCommitResult, ReconciledRow, ReconcileStatus } from '#shared/types/bank';
import Chip from '@/components/ios/Chip.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import Segmented from '@/components/ios/Segmented.vue';
import ChoiceGrid from './ChoiceGrid.vue';
import GlassBar from '@/components/data/GlassBar.vue';
import ImportRow from './ImportRow.vue';
import ImportStage from './ImportStage.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import {
  initialChoice,
  needsAccount,
  toCommitRow,
  type BankChoice,
} from '@/features/import/bankRows';
import { useBankImport } from '@/features/import/useImport';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { formatRupiah } from '@/lib/format';
import { compressImage } from '@/lib/imageCompression';
import { MONTHS_SHORT } from '@/lib/time';

// Impor mutasi (mockup import-bank*/import-photo*): sumber Bank/Foto, chip
// akun, area pilih PDF atau deret foto → membaca → pratinjau dengan tab
// Baru/Transfer/Ragu/Tercatat (ketuk baris = lembar kategori, geser kiri =
// lewati) → bar Simpan → progres → selesai. File hanya dibaca di server
// selama permintaan; foto baru dikirim setelah "Baca dengan AI" ditekan.
// `embedded`: dipasang di panel catat (iPad/desktop), tanpa bar navigasi.
const props = defineProps<{ source: 'pdf' | 'photo'; embedded?: boolean }>();
const emit = defineEmits<{ done: [] }>();
const isPhoto = computed(() => props.source === 'photo');

const { bookId, canEdit } = useActiveBook();
const accounts = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const flow = useBankImport(props.source);
const toast = useToast();

// Sumber Bank/Foto: dua halaman, segmented mengganti halaman tanpa riwayat baru
const SOURCES = [
  { value: 'pdf', label: 'Mutasi bank' },
  { value: 'photo', label: 'Foto struk' },
] as const;
const sourceModel = computed({
  get: () => props.source,
  set: (value: 'pdf' | 'photo') => {
    if (value !== props.source)
      navigateTo(value === 'photo' ? '/settings/import/photo' : '/settings/import/bank', {
        replace: true,
      });
  },
});

// ---------- 1. akun & file ----------
const LAST_ACCOUNT = 'mm-bank-account';
const accountId = ref('');
// Akun terakhir per buku, dipasang begitu daftar akun termuat
watch(
  [bookId, () => accounts.byId.value],
  ([book, byId]) => {
    if (accountId.value && byId.has(accountId.value)) return;
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_ACCOUNT) ?? '{}')[book ?? ''];
      accountId.value = saved && byId.get(saved) && !byId.get(saved)!.archived ? saved : '';
    } catch {
      // Penyimpanan browser tidak tersedia: mulai tanpa pilihan
    }
  },
  { immediate: true },
);
watch(accountId, (id) => {
  if (!id) return;
  needAccount.value = false;
  try {
    const all = JSON.parse(localStorage.getItem(LAST_ACCOUNT) ?? '{}');
    localStorage.setItem(LAST_ACCOUNT, JSON.stringify({ ...all, [bookId.value ?? '']: id }));
  } catch {
    // abaikan
  }
});

const result = ref<BankCommitResult | null>(null);
const preview = computed(() => flow.preview.data.value ?? null);
const compressing = ref(false);
const busy = computed(() => compressing.value || flow.preview.isPending.value);
const step = computed(() =>
  result.value
    ? 'done'
    : flow.commit.isPending.value
      ? 'saving'
      : preview.value
        ? 'review'
        : busy.value
          ? 'reading'
          : 'pick',
);

const input = ref<HTMLInputElement>();
// Foto yang dipilih (boleh beberapa), menunggu tombol Baca dengan AI
const MAX_PHOTOS = 10;
const photos = shallowRef<File[]>([]);
// URL pratinjau per file: dibuat sekali, dilepas hanya saat fotonya dibuang,
// supaya pratinjau lain tidak berkedip waktu satu foto dihapus
const urlOf = new Map<File, string>();
const photoUrls = computed(() =>
  photos.value.map((f) => {
    if (!urlOf.has(f)) urlOf.set(f, URL.createObjectURL(f));
    return urlOf.get(f)!;
  }),
);
watch(photos, (files) => {
  for (const [file, url] of urlOf)
    if (!files.includes(file)) {
      URL.revokeObjectURL(url);
      urlOf.delete(file);
    }
});
onBeforeUnmount(() => urlOf.forEach((url) => URL.revokeObjectURL(url)));
function removePhoto(index: number) {
  photos.value = photos.value.filter((_, i) => i !== index);
}

// Tombol tetap bisa diketuk tanpa akun: tunjukkan apa yang kurang, jangan diam saja
const needAccount = ref(false);
const accountChips = ref<HTMLElement>();
function withAccount(run: () => void) {
  if (accountId.value) return run();
  needAccount.value = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  accountChips.value?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
}

function choose(event: Event) {
  const picked = [...((event.target as HTMLInputElement).files ?? [])];
  (event.target as HTMLInputElement).value = '';
  if (!picked.length || !accountId.value) return;
  result.value = null;
  flow.commit.reset();
  flow.preview.reset();
  if (!isPhoto.value) return upload(picked[0]!);
  // Foto baru ditambahkan ke yang sudah dipilih, maksimal MAX_PHOTOS
  const next = [...photos.value, ...picked];
  if (next.length > MAX_PHOTOS)
    toast.show(
      `Maksimal ${MAX_PHOTOS} foto sekali baca, ${next.length - MAX_PHOTOS} tidak dipakai`,
    );
  photos.value = next.slice(0, MAX_PHOTOS);
}

/** Foto: dikecilkan dulu di HP, lalu dikirim bersama untuk dibaca */
async function readPhoto() {
  if (!photos.value.length) return;
  compressing.value = true;
  try {
    upload(await Promise.all(photos.value.map((f) => compressImage(f))));
  } finally {
    compressing.value = false;
  }
}

function upload(file: File | File[]) {
  flow.preview.mutate(
    { file, accountId: accountId.value },
    {
      onSuccess: (p) => {
        choices.value = Object.fromEntries(p.rows.map((r) => [r.dedupeKey, initialChoice(r)]));
        tab.value = p.rows.some((r) => r.status === 'baru') ? 'baru' : (firstTab(p.rows) ?? 'baru');
      },
    },
  );
}

function startOver() {
  result.value = null;
  photos.value = [];
  selecting.value = false;
  selected.value = new Set();
  flow.preview.reset();
  flow.commit.reset();
}

// ---------- 2. pencocokan ----------
const choices = ref<Record<string, BankChoice>>({});
const choice = (r: ReconciledRow) => choices.value[r.dedupeKey]!;

const TAB_ORDER: ReconcileStatus[] = ['baru', 'transfer', 'ragu', 'tercatat'];
const TAB_LABEL: Record<ReconcileStatus, string> = {
  baru: 'Baru',
  transfer: 'Transfer',
  ragu: 'Ragu',
  tercatat: 'Tercatat',
};
const tab = ref<ReconcileStatus>('baru');
watch(tab, () => {
  selecting.value = false;
  selected.value = new Set();
});
const byStatus = computed(() => {
  const map = new Map<ReconcileStatus, ReconciledRow[]>(TAB_ORDER.map((s) => [s, []]));
  for (const r of preview.value?.rows ?? []) map.get(r.status)!.push(r);
  return map;
});
const firstTab = (rows: ReconciledRow[]) => TAB_ORDER.find((s) => rows.some((r) => r.status === s));
const tabs = computed(() =>
  TAB_ORDER.filter((s) => byStatus.value.get(s)!.length).map((s) => ({
    value: s,
    label: `${TAB_LABEL[s]} ${byStatus.value.get(s)!.length}`,
  })),
);
const TAB_HINT: Record<ReconcileStatus, string> = {
  baru: 'Belum ada di buku. Ketuk untuk ganti kategori, geser ke kiri untuk melewati.',
  transfer: 'Perpindahan ke/dari akunmu sendiri, dicatat sebagai transfer.',
  ragu: 'Mirip catatan yang sudah ada di tanggal berbeda. Pakai hanya kalau memang belum tercatat.',
  tercatat: 'Sudah ada di buku, tidak disimpan lagi.',
};

/** Hari dikelompokkan: "Sab, 3 Okt" */
const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][weekday]}, ${d} ${MONTHS_SHORT[m - 1]}`;
};
const days = computed(() => {
  const groups = new Map<string, ReconciledRow[]>();
  for (const r of byStatus.value.get(tab.value) ?? []) {
    const list = groups.get(r.date) ?? [];
    list.push(r);
    groups.set(r.date, list);
  }
  return [...groups.entries()];
});

function rowView(r: ReconciledRow) {
  const c = choice(r);
  const time = r.time ? ` · ${r.time}` : '';
  if (r.status === 'tercatat')
    return {
      icon: CircleCheck,
      tone: 'ok' as const,
      subtitle: `Sudah tercatat${time}`,
      warn: false,
    };
  if (c.transfer) {
    const other = accounts.name(c.counterAccountId);
    return {
      icon: ArrowLeftRight,
      tone: 'neutral' as const,
      subtitle: other
        ? `${r.direction === 'out' ? 'Ke' : 'Dari'} ${other}${time}`
        : 'Pilih akun lawan transfer',
      warn: !other,
    };
  }
  const style = categories.style(c.categoryId);
  const label = categories.label(c.categoryId, true);
  return {
    icon: c.categoryId ? style.icon : r.status === 'ragu' ? CircleHelp : Tag,
    tone: c.categoryId ? style.tone : ('neutral' as const),
    subtitle: `${label || 'Tanpa kategori'}${time}`,
    warn: false,
  };
}

// Pilih banyak: ubah kategori sekaligus
const selecting = ref(false);
const selected = ref(new Set<string>());
function toggleSelecting() {
  selecting.value = !selecting.value;
  selected.value = new Set();
}
function tapRow(r: ReconciledRow) {
  if (!selecting.value) return openPicker([r]);
  const next = new Set(selected.value);
  if (next.has(r.dedupeKey)) next.delete(r.dedupeKey);
  else next.add(r.dedupeKey);
  selected.value = next;
}
function toggleInclude(r: ReconciledRow) {
  const c = choice(r);
  c.include = !c.include;
}

// ---------- lembar pilihan kategori / akun ----------
const pickerOpen = ref(false);
const pickerRows = ref<ReconciledRow[]>([]);
const pickerMode = ref<'category' | 'account'>('category');
const pickerDirection = computed(() => pickerRows.value[0]?.direction ?? 'out');
const pickerTitle = computed(() =>
  pickerRows.value.length > 1
    ? `${pickerMode.value === 'category' ? 'Kategori' : 'Akun lawan'} untuk ${pickerRows.value.length} baris`
    : pickerRows.value[0]?.note || pickerRows.value[0]?.counterparty || 'Kategori',
);
const pickerModes = computed(() => [
  {
    value: 'category' as const,
    label: pickerDirection.value === 'in' ? 'Pemasukan' : 'Pengeluaran',
  },
  { value: 'account' as const, label: 'Transfer' },
]);

function openPicker(rows: ReconciledRow[], mode?: 'category' | 'account') {
  if (!rows.length) return;
  pickerRows.value = rows;
  pickerMode.value = mode ?? (rows.every((r) => choice(r).transfer) ? 'account' : 'category');
  pickerOpen.value = true;
}

const selectedRows = () =>
  (preview.value?.rows ?? []).filter((r) => selected.value.has(r.dedupeKey));
/** Pilih semua baris di tab ini (kecuali yang sudah tercatat) */
const tabRows = computed(() =>
  (byStatus.value.get(tab.value) ?? []).filter((r) => r.status !== 'tercatat'),
);
const allSelected = computed(
  () => !!tabRows.value.length && tabRows.value.every((r) => selected.value.has(r.dedupeKey)),
);
function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(tabRows.value.map((r) => r.dedupeKey));
}

/** Ubah sekaligus: kategori (satu arah), akun lawan transfer, atau lewati/pakai */
function pickSelected(mode: 'category' | 'account' = 'category') {
  const rows = selectedRows();
  if (mode === 'account') return openPicker(rows, 'account');
  // Kategori pemasukan dan pengeluaran berbeda: ambil arah yang paling banyak
  const outs = rows.filter((r) => r.direction === 'out');
  const ins = rows.filter((r) => r.direction === 'in');
  const target = outs.length >= ins.length ? outs : ins;
  const skipped = rows.length - target.length;
  if (skipped)
    toast.show(
      `${skipped} baris ${target === outs ? 'pemasukan' : 'pengeluaran'} tidak ikut, pilih terpisah`,
    );
  openPicker(target, 'category');
}
function includeSelected(include: boolean) {
  for (const r of selectedRows()) choice(r).include = include;
  selecting.value = false;
  selected.value = new Set();
}

const pickerCategoryItems = computed(() =>
  pickerItems.categoryItems(pickerDirection.value === 'in' ? 'income' : 'expense'),
);
const pickerAccountItems = computed(() => pickerItems.accountItems(accountId.value));
const pickerValue = computed(() => {
  const c = pickerRows.value.length === 1 ? choice(pickerRows.value[0]!) : null;
  if (!c) return '__none__';
  return pickerMode.value === 'category' ? (c.categoryId ?? '') : (c.counterAccountId ?? '');
});

function pick(id: string) {
  for (const r of pickerRows.value) {
    const c = choice(r);
    if (pickerMode.value === 'category') {
      c.transfer = false;
      c.categoryId = id || null;
    } else {
      c.transfer = true;
      c.counterAccountId = id;
    }
    c.include = true;
  }
  pickerOpen.value = false;
  selecting.value = false;
  selected.value = new Set();
}

// ---------- simpan ----------
const included = computed(() =>
  (preview.value?.rows ?? []).filter((r) => r.status !== 'tercatat' && choice(r).include),
);
const missingAccount = computed(() => included.value.filter((r) => needsAccount(choice(r))).length);

function save() {
  const p = preview.value;
  if (!p || missingAccount.value) return;
  flow.commit.mutate(
    {
      filename: p.filename,
      rows: included.value.map((r) => toCommitRow(r, choice(r), accountId.value)),
    },
    { onSuccess: (r) => (result.value = r) },
  );
}

// ---------- ringkasan ----------
const n = (value: number) => value.toLocaleString('id-ID');
const rp = (value: number) => formatRupiah(value).replace(/^-/, '');
const BANK_LABEL = { seabank: 'SeaBank', jago: 'Jago', photo: 'Foto' } as const;
const periodLabel = computed(() => {
  const p = preview.value?.period;
  if (!p) return '';
  const short = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
    return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
  };
  return `${short(p.from)} – ${short(p.to)}`;
});
/** Total hasil baca sama dengan total di file: tanda tidak ada baris yang hilang */
const totalsMatch = computed(() => {
  const p = preview.value;
  return p?.declared ? p.declared.in === p.totals.in && p.declared.out === p.totals.out : null;
});
const lastBalance = computed(() => {
  const rows = preview.value?.rows ?? [];
  const last = [...rows].reverse().find((r) => r.balance != null);
  return last?.balance ?? null;
});
const appBalance = computed(() => accounts.byId.value.get(accountId.value)?.balance ?? null);
/** Foto yang tidak menghasilkan baris, ditampilkan supaya tidak hilang diam-diam */
const unreadPhotos = computed(() => (preview.value?.photos ?? []).filter((p) => p.error));

function finish() {
  if (props.embedded) emit('done');
  else navigateTo('/');
}
</script>

<template>
  <div
    :class="
      !embedded &&
      '-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:rounded-2xl'
    "
  >
    <NavBar
      v-if="!embedded"
      :title="isPhoto ? 'Foto struk' : 'Mutasi bank'"
      back="Impor"
      back-to="/settings/import"
      line
      class="sticky top-0 md:static md:rounded-t-2xl"
    />

    <input
      ref="input"
      type="file"
      :accept="isPhoto ? 'image/*' : '.pdf,application/pdf'"
      :multiple="isPhoto"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="choose"
    />

    <!-- ---------- 1. akun & file ---------- -->
    <template v-if="step === 'pick'">
      <div v-if="!embedded" class="px-4 pt-3">
        <Segmented v-model="sourceModel" :options="SOURCES" label="Sumber" />
      </div>

      <SectionHeader
        :label="isPhoto ? 'Transaksi di foto dari akun' : 'Mutasi ini untuk akun'"
        :class="embedded && 'px-1!'"
      >
        <template #aside>
          <span
            :class="['shrink-0 normal-case', needAccount && !accountId && 'font-semibold text-exp']"
            >{{ accounts.name(accountId) || 'belum dipilih' }}</span
          >
        </template>
      </SectionHeader>
      <div
        ref="accountChips"
        :class="['flex flex-wrap gap-2', embedded ? 'px-0' : 'px-4']"
        role="group"
        aria-label="Akun mutasi"
      >
        <Chip
          v-for="a in accounts.active.value"
          :key="a.id"
          size="lg"
          :on="a.id === accountId"
          @click="accountId = a.id"
          >{{ a.name }}</Chip
        >
      </div>
      <p
        v-if="needAccount && !accountId"
        class="mx-8 mb-0 mt-2 text-meta font-medium text-exp"
        role="alert"
      >
        Pilih dulu akunnya di atas.
      </p>

      <!-- PDF: area pilih file -->
      <button
        v-if="!isPhoto"
        type="button"
        :disabled="!canEdit"
        :class="[
          'imp-drop flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[var(--chevron)] bg-card px-4 py-7 text-center disabled:opacity-50',
          embedded ? 'mt-4 w-full' : 'mx-4 mt-4 w-[calc(100%-32px)]',
        ]"
        @click="withAccount(() => input?.click())"
      >
        <span
          class="mb-1 grid size-16 place-items-center rounded-[18px] bg-primary-soft text-primary-accent [&_svg]:size-7"
          aria-hidden="true"
        >
          <FileDown stroke-width="1.9" />
        </span>
        <b class="text-row font-semibold">Pilih PDF mutasi</b>
        <span class="text-meta text-muted-foreground"
          >SeaBank dan Jago. File dibaca lalu dibuang, kata sandi bank tidak pernah diminta.</span
        >
      </button>

      <!-- Foto: deret foto, belum dikirim sampai Baca dengan AI -->
      <template v-else>
        <div
          :class="[
            'flex gap-2.5 overflow-x-auto pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            embedded ? 'px-0' : 'px-4',
          ]"
        >
          <span
            v-for="(url, i) in photoUrls"
            :key="url"
            class="relative h-[132px] w-24 shrink-0 overflow-hidden rounded-[14px] bg-fill shadow-[inset_0_0_0_0.5px_var(--sep)]"
          >
            <img
              :src="url"
              :alt="`Foto ${i + 1}: ${photos[i]?.name ?? ''}`"
              class="size-full object-cover"
            />
            <button
              type="button"
              class="absolute right-1.5 top-1.5 grid size-[26px] place-items-center rounded-full bg-scrim text-white active:scale-90 [&_svg]:size-3.5"
              :aria-label="`Hapus foto ${i + 1}`"
              @click="removePhoto(i)"
            >
              <X stroke-width="2.6" aria-hidden="true" />
            </button>
          </span>
          <button
            v-if="photos.length < MAX_PHOTOS"
            type="button"
            :disabled="!canEdit"
            class="imp-drop flex h-[132px] w-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-dashed border-[var(--chevron)] text-primary-accent disabled:opacity-50"
            aria-label="Tambah foto"
            @click="withAccount(() => input?.click())"
          >
            <Plus class="size-7" stroke-width="2" aria-hidden="true" />
            <span class="text-note font-semibold">Foto</span>
          </button>
        </div>
        <p
          :class="[
            'mb-0 mt-2 text-meta leading-[1.45] text-muted-foreground',
            embedded ? 'mx-1' : 'mx-8',
          ]"
        >
          <template v-if="photos.length"
            ><b class="text-foreground">{{ photos.length }} foto dipilih.</b> Belum dikirim. Periksa
            dulu fotonya.</template
          >
          <template v-else
            >Struk belanja atau screenshot riwayat GoPay, ShopeePay, dan dompet digital lain.
            Maksimal {{ MAX_PHOTOS }} foto sekali baca.</template
          >
        </p>
        <div :class="embedded ? 'pt-3' : 'px-4 pt-3'">
          <IosButton block :disabled="!canEdit || !photos.length" @click="withAccount(readPhoto)">
            <Sparkles aria-hidden="true" />{{
              photos.length > 1 ? `Baca ${photos.length} foto dengan AI` : 'Baca dengan AI'
            }}
          </IosButton>
        </div>
        <p
          :class="[
            'mb-0 mt-2 text-meta leading-[1.45] text-muted-foreground',
            embedded ? 'mx-1' : 'mx-8',
          ]"
        >
          Foto dikirim ke AI hanya setelah kamu menekan tombol ini, dan tidak disimpan.
        </p>
      </template>

      <p
        v-if="flow.preview.error.value"
        :class="[
          'mt-3 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-meta text-exp',
          !embedded && 'mx-4',
        ]"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.preview.error.value.message }}
      </p>
      <p
        v-if="!canEdit"
        :class="['mb-0 mt-2 text-meta text-muted-foreground', embedded ? 'mx-1' : 'mx-8']"
      >
        Peranmu di buku ini hanya melihat, jadi tidak bisa mengimpor.
      </p>
      <div v-if="!embedded" class="h-6" />
    </template>

    <!-- ---------- membaca ---------- -->
    <ImportStage
      v-else-if="step === 'reading'"
      state="reading"
      :class="embedded && 'mx-0!'"
      :title="
        isPhoto
          ? `Membaca ${photos.length > 1 ? `${photos.length} foto` : 'foto'}`
          : 'Membaca mutasi'
      "
      :text="
        isPhoto
          ? 'AI membaca tanggal, nominal, dan catatan…'
          : 'Mencocokkan dengan catatan yang sudah ada…'
      "
    />

    <!-- ---------- 2. pencocokan ---------- -->
    <template v-else-if="step === 'review' && preview">
      <div
        :class="[
          'mt-3 flex flex-col gap-[3px] rounded-group bg-card px-4 py-3',
          !embedded && 'mx-4',
        ]"
      >
        <div class="flex items-start gap-2">
          <b class="min-w-0 flex-1 text-row font-semibold"
            >{{ BANK_LABEL[preview.bank] }} → {{ accounts.name(accountId) }}</b
          >
          <Chip @click="startOver">Ganti</Chip>
        </div>
        <span class="text-meta text-muted-foreground"
          >{{ n(preview.rows.length) }} transaksi<template v-if="periodLabel">
            · {{ periodLabel }}</template
          ></span
        >
        <span class="text-label">
          Masuk <b class="text-inc">{{ rp(preview.totals.in) }}</b> · Keluar
          <b class="text-exp">{{ rp(preview.totals.out) }}</b>
          <span v-if="totalsMatch" class="text-ok"> · cocok dengan file</span>
        </span>
        <span
          v-if="totalsMatch === false"
          class="mt-1.5 rounded-[9px] bg-warn-soft px-[9px] py-[7px] text-meta leading-[1.4]"
          >Total hasil baca beda dengan total di file, periksa lagi.</span
        >
        <span
          v-if="lastBalance != null && appBalance != null && lastBalance !== appBalance"
          class="mt-1.5 rounded-[9px] bg-warn-soft px-[9px] py-[7px] text-meta leading-[1.4]"
          >Saldo akhir di file {{ rp(lastBalance) }}, di aplikasi {{ rp(appBalance) }}.</span
        >
        <span v-if="isPhoto" class="text-meta text-muted-foreground">
          Dibaca AI, jadi periksa nominal dan tanggalnya sebelum menyimpan.<template
            v-if="preview.quotaLeft != null"
          >
            Sisa {{ preview.quotaLeft }} foto hari ini.</template
          >
        </span>
        <span
          v-for="p in unreadPhotos"
          :key="p.name"
          class="flex items-start gap-1.5 text-meta text-warn"
        >
          <CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span
            ><b class="font-semibold">{{ p.name }}</b> tidak terbaca: {{ p.error }}</span
          >
        </span>
      </div>

      <div :class="['pb-1.5 pt-3', !embedded && 'px-4']">
        <Segmented v-if="tabs.length > 1" v-model="tab" :options="tabs" label="Status mutasi" />
      </div>
      <div :class="['flex items-start gap-2', embedded ? 'px-1' : 'pl-5 pr-3']">
        <p class="m-0 flex-1 text-meta leading-[1.45] text-muted-foreground">
          {{ TAB_HINT[tab] }}
        </p>
        <button
          v-if="tab !== 'tercatat'"
          type="button"
          class="-mt-1 shrink-0 px-2 py-1 text-body font-semibold text-primary-accent active:opacity-50"
          :aria-pressed="selecting"
          @click="toggleSelecting"
        >
          {{ selecting ? 'Selesai' : 'Pilih' }}
        </button>
      </div>

      <section v-for="[day, rows] in days" :key="tab + day">
        <SectionHeader
          :label="dayLabel(day)"
          :aside="`${rows.length}`"
          :class="embedded && 'px-1!'"
        />
        <div :class="['overflow-hidden rounded-group bg-card', !embedded && 'mx-4']">
          <ImportRow
            v-for="r in rows"
            :key="r.dedupeKey"
            v-bind="rowView(r)"
            :title="r.note || r.counterparty"
            :amount="rp(r.amount)"
            :direction="r.direction"
            :included="r.status === 'tercatat' || choice(r).include"
            :readonly="r.status === 'tercatat'"
            :selecting="selecting"
            :selected="selected.has(r.dedupeKey)"
            @open="tapRow(r)"
            @toggle="toggleInclude(r)"
          />
        </div>
      </section>

      <p
        v-if="flow.commit.error.value"
        :class="[
          'mt-3 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-meta text-exp',
          !embedded && 'mx-4',
        ]"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.commit.error.value.message }}
      </p>

      <GlassBar :embedded="embedded" :class="['flex-wrap', embedded && 'mx-0']">
        <template v-if="selecting">
          <span class="min-w-0 flex-1 text-label text-muted-foreground">
            <b class="text-bar text-foreground">{{ selected.size }}</b> dipilih
          </span>
          <button
            type="button"
            class="px-2 py-1 text-body font-semibold text-primary-accent active:opacity-50"
            @click="toggleAll"
          >
            {{ allSelected ? 'Batal pilih semua' : 'Pilih semua' }}
          </button>
          <div
            :class="[
              'flex w-full flex-wrap gap-2',
              !selected.size && 'pointer-events-none opacity-40',
            ]"
            :aria-disabled="!selected.size || undefined"
          >
            <Chip size="lg" @click="pickSelected('category')"
              ><Tag class="size-4" aria-hidden="true" />Kategori</Chip
            >
            <Chip size="lg" @click="pickSelected('account')"
              ><ArrowLeftRight class="size-4" aria-hidden="true" />Transfer</Chip
            >
            <Chip size="lg" @click="includeSelected(false)">Lewati</Chip>
            <Chip size="lg" @click="includeSelected(true)">Pakai</Chip>
          </div>
        </template>
        <template v-else>
          <span class="min-w-0 flex-1 text-label text-muted-foreground">
            <template v-if="missingAccount">
              <span class="text-warn">{{ missingAccount }} transfer belum ada akun lawannya</span>
            </template>
            <template v-else-if="included.length">
              <b class="text-bar text-foreground">{{ n(included.length) }}</b> akan disimpan
            </template>
            <template v-else>Tidak ada yang dipilih</template>
          </span>
          <IosButton
            class="w-[140px]"
            :disabled="!included.length || !!missingAccount || !canEdit"
            @click="save"
            >Simpan</IosButton
          >
        </template>
      </GlassBar>
    </template>

    <!-- ---------- 3. menyimpan ---------- -->
    <ImportStage
      v-else-if="step === 'saving'"
      state="saving"
      :class="embedded && 'mx-0!'"
      :title="`Menyimpan ${n(included.length)} transaksi`"
      text="Mencocokkan dengan catatan yang sudah ada…"
    />

    <!-- ---------- 4. hasil ---------- -->
    <ImportStage
      v-else-if="step === 'done' && result"
      state="done"
      :class="embedded && 'mx-0!'"
      :title="
        result.inserted ? `${n(result.inserted)} transaksi tersimpan` : 'Tidak ada transaksi baru'
      "
      :text="`Bisa dibatalkan dari Riwayat impor.${result.duplicates ? ` ${n(result.duplicates)} sudah pernah diimpor, dilewati.` : ''}`"
    >
      <IosButton block @click="finish">Lihat transaksi</IosButton>
      <IosButton block variant="gray" @click="startOver">{{
        isPhoto ? 'Baca foto lain' : 'Impor lagi'
      }}</IosButton>
    </ImportStage>

    <IosSheet v-model:open="pickerOpen" :title="pickerTitle">
      <Segmented v-model="pickerMode" :options="pickerModes" label="Jenis transaksi" />
      <div class="mt-3 overflow-hidden rounded-[14px] bg-[var(--kb-bg)]">
        <ChoiceGrid
          v-if="pickerMode === 'category'"
          :key="`cat-${pickerDirection}`"
          :items="pickerCategoryItems"
          :model-value="pickerValue"
          label="Pilih kategori"
          class="pb-1.5!"
          @select="pick"
        />
        <ChoiceGrid
          v-else
          key="acc"
          :items="pickerAccountItems"
          :model-value="pickerValue"
          :label="pickerDirection === 'out' ? 'Transfer ke akun' : 'Transfer dari akun'"
          class="pb-1.5!"
          @select="pick"
        />
      </div>
    </IosSheet>
  </div>
</template>

<style scoped>
.imp-drop {
  transition: transform 160ms var(--ease-out);
}
.imp-drop:active {
  transform: scale(0.98);
}
</style>
