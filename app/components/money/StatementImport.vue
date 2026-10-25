<script setup lang="ts">
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  FileText,
  History,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Tag,
  Upload,
  X,
} from '@lucide/vue';
import type { BankCommitResult, ReconciledRow, ReconcileStatus } from '#shared/types/bank';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import Overlay from '@/components/base/Overlay.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import BankRow from './BankRow.vue';
import { Button } from '@/components/ui/button';
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

// Impor mutasi: pilih akun → unggah PDF mutasi bank, atau foto struk/screenshot
// riwayat (dibaca Claude di server, fase 11) → cocokkan → simpan yang baru.
// File hanya dibaca di server selama permintaan; tidak disimpan.
// Foto baru dikirim setelah user menekan "Baca dengan AI" (tindakan eksplisit).
// `embedded`: dipasang di tab form Tambah transaksi (tanpa kepala halaman).
const props = defineProps<{ source: 'pdf' | 'photo'; embedded?: boolean }>();
const emit = defineEmits<{ done: [] }>();
const isPhoto = computed(() => props.source === 'photo');

const { bookId, canEdit } = useActiveBook();
const accounts = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const flow = useBankImport(props.source);
const toast = useToast();

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
  try {
    const all = JSON.parse(localStorage.getItem(LAST_ACCOUNT) ?? '{}');
    localStorage.setItem(LAST_ACCOUNT, JSON.stringify({ ...all, [bookId.value ?? '']: id }));
  } catch {
    // abaikan
  }
});

const result = ref<BankCommitResult | null>(null);
const preview = computed(() => flow.preview.data.value ?? null);
const step = computed(() =>
  result.value
    ? 'done'
    : flow.commit.isPending.value
      ? 'saving'
      : preview.value
        ? 'review'
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
const compressing = ref(false);
const busy = computed(() => compressing.value || flow.preview.isPending.value);

// Tombol tetap bisa diketuk tanpa akun: tunjukkan apa yang kurang, jangan diam saja
const needAccount = ref(false);
const accountGrid = ref<HTMLElement>();
function withAccount(run: () => void) {
  if (accountId.value) return run();
  needAccount.value = true;
  accountGrid.value?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

// ---------- sheet pilihan kategori / akun ----------
const pickerOpen = ref(false);
const pickerRows = ref<ReconciledRow[]>([]);
const pickerMode = ref<'category' | 'account'>('category');
const pickerDirection = computed(() => pickerRows.value[0]?.direction ?? 'out');
const pickerTitle = computed(() =>
  pickerRows.value.length > 1
    ? `${pickerMode.value === 'category' ? 'Kategori' : 'Akun lawan'} untuk ${pickerRows.value.length} baris`
    : (pickerRows.value[0]?.note ?? ''),
);

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
  <div :class="!embedded && 'mx-auto md:max-w-[720px]'">
    <PageHeader v-if="!embedded" :title="isPhoto ? 'Baca foto struk' : 'Impor mutasi bank'">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton @click="navigateTo('/settings/import/history')">
          <History aria-hidden="true" />Riwayat
        </HeaderButton>
      </template>
    </PageHeader>

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
      <Card :class="['flex flex-col gap-3 px-3.5 py-4', !embedded && 'mt-3.5']">
        <div class="flex items-start gap-3">
          <ToneIcon :icon="isPhoto ? Camera : FileText" tone="primary" size="sm" />
          <p v-if="isPhoto" class="m-0 text-meta text-muted-foreground">
            Foto struk belanja atau screenshot riwayat GoPay, ShopeePay, dan dompet digital lain
            yang tidak punya ekspor. Bisa beberapa foto sekaligus (maksimal {{ MAX_PHOTOS }}). Foto
            dibaca AI hanya setelah kamu menekan Baca dengan AI, tidak disimpan, dan hasilnya tetap
            kamu periksa sebelum disimpan.
          </p>
          <p v-else class="m-0 text-meta text-muted-foreground">
            Unduh mutasi PDF dari aplikasi bank (rekening koran SeaBank atau riwayat Kantong Jago),
            lalu pilih di sini. Yang sudah tercatat dikenali, yang belum tinggal disimpan. Kata
            sandi internet banking tidak pernah diminta.
          </p>
        </div>
      </Card>

      <ListGroup
        :label="isPhoto ? 'Transaksi di foto ini dari akun' : 'Mutasi ini untuk akun'"
        :aside="accounts.name(accountId) || 'belum dipilih'"
        :aside-class="needAccount && !accountId ? 'text-bad font-semibold' : ''"
      >
        <div
          ref="accountGrid"
          :class="[
            'overflow-hidden rounded-[10px]',
            needAccount && !accountId && 'ring-2 ring-bad/60',
          ]"
        >
          <GridPicker
            :items="pickerItems.accountItems()"
            :model-value="accountId"
            label="Pilih akun mutasi"
            @select="(id) => (accountId = id)"
          />
        </div>
      </ListGroup>

      <p
        v-if="flow.preview.error.value"
        class="mt-3 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-meta text-bad"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.preview.error.value.message }}
      </p>
      <!-- Foto terpilih: pratinjau + tombol baca (gambar belum dikirim ke mana pun) -->
      <Card v-if="isPhoto && photos.length" class="mt-3.5 flex flex-col gap-2.5 p-2.5">
        <div class="flex items-baseline justify-between gap-2 px-1">
          <b class="text-label font-semibold">{{ photos.length }} foto dipilih</b>
          <small class="text-xs text-muted-foreground">Belum dikirim. Periksa dulu fotonya.</small>
        </div>
        <ul class="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-5">
          <li v-for="(url, i) in photoUrls" :key="url" class="relative">
            <img
              :src="url"
              :alt="`Foto ${i + 1}: ${photos[i]?.name ?? ''}`"
              class="aspect-square w-full rounded-lg bg-surface-2 object-cover"
            />
            <button
              type="button"
              class="press-icon absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full border bg-card text-muted-foreground shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
              :aria-label="`Hapus foto ${i + 1}`"
              :disabled="busy"
              @click="removePhoto(i)"
            >
              <X aria-hidden="true" />
            </button>
          </li>
          <li v-if="photos.length < MAX_PHOTOS">
            <button
              type="button"
              class="press flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs font-medium text-muted-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
              :disabled="busy"
              @click="input?.click()"
            >
              <ImagePlus aria-hidden="true" />Tambah
            </button>
          </li>
        </ul>
      </Card>
      <div class="mt-4 flex flex-col items-stretch gap-2">
        <p
          v-if="needAccount && !accountId"
          class="m-0 text-center text-meta font-medium text-bad"
          role="alert"
        >
          Pilih dulu akunnya di atas: ketuk grup, lalu akun.
        </p>
        <Button
          v-if="isPhoto && photos.length"
          size="touch"
          :disabled="!canEdit || busy"
          @click="withAccount(readPhoto)"
        >
          <component :is="busy ? RefreshCw : Sparkles" :class="busy && 'animate-spin'" />
          {{
            busy
              ? `Membaca ${photos.length > 1 ? `${photos.length} foto` : 'foto'}…`
              : photos.length > 1
                ? `Baca ${photos.length} foto dengan AI`
                : 'Baca dengan AI'
          }}
        </Button>
        <Button
          v-else
          size="touch"
          :disabled="!canEdit || busy"
          @click="withAccount(() => input?.click())"
        >
          <component
            :is="busy ? RefreshCw : isPhoto ? Camera : Upload"
            :class="busy && 'animate-spin'"
          />
          {{ busy ? 'Membaca mutasi…' : isPhoto ? 'Pilih atau ambil foto' : 'Pilih file PDF' }}
        </Button>
        <p v-if="!canEdit" class="m-0 text-center text-xs text-muted-foreground">
          Peranmu di buku ini hanya melihat, jadi tidak bisa mengimpor.
        </p>
      </div>
    </template>

    <!-- ---------- 2. pencocokan ---------- -->
    <template v-else-if="step === 'review' && preview">
      <Card class="mt-3.5">
        <CardHead :title="`${BANK_LABEL[preview.bank]} → ${accounts.name(accountId)}`">
          <Button variant="ghost" size="default" @click="startOver">{{
            isPhoto ? 'Ganti foto' : 'Ganti file'
          }}</Button>
        </CardHead>
        <div class="flex flex-col gap-1.5 px-3.5 pb-3.5 text-meta">
          <p class="m-0 text-muted-foreground">
            {{ n(preview.rows.length) }} transaksi<template v-if="periodLabel">
              · {{ periodLabel }}</template
            >
          </p>
          <p class="m-0 tabular-nums">
            Masuk <b class="text-primary-accent">{{ rp(preview.totals.in) }}</b> · Keluar
            <b class="text-bad">{{ rp(preview.totals.out) }}</b>
            <span v-if="totalsMatch" class="ml-1 text-ok">· cocok dengan file</span>
            <span v-else-if="totalsMatch === false" class="ml-1 text-warn"
              >· beda dengan total di file, periksa lagi</span
            >
          </p>
          <p v-if="lastBalance != null && appBalance != null" class="m-0 text-muted-foreground">
            Saldo akhir di file {{ rp(lastBalance) }} · di aplikasi {{ rp(appBalance) }}
          </p>
          <p v-if="isPhoto" class="m-0 text-xs text-muted-foreground">
            Dibaca AI, jadi periksa nominal dan tanggalnya sebelum menyimpan.<template
              v-if="preview.quotaLeft != null"
            >
              Sisa {{ preview.quotaLeft }} foto hari ini.</template
            >
          </p>
          <p
            v-for="p in unreadPhotos"
            :key="p.name"
            class="m-0 flex items-start gap-1.5 text-xs text-warn"
          >
            <CircleAlert class="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span
              ><b class="font-semibold">{{ p.name }}</b> tidak terbaca: {{ p.error }}</span
            >
          </p>
        </div>
      </Card>

      <SegmentedControl
        v-if="tabs.length > 1"
        v-model="tab"
        :options="tabs"
        label="Status mutasi"
        class="mt-3.5"
        @update:model-value="selecting = false"
      />
      <div class="mt-2.5 flex items-start gap-2 px-1">
        <p class="m-0 flex-1 text-xs text-muted-foreground">{{ TAB_HINT[tab] }}</p>
        <Button
          v-if="tab !== 'tercatat'"
          :variant="selecting ? 'soft' : 'ghost'"
          size="sm"
          @click="toggleSelecting"
        >
          {{ selecting ? 'Selesai' : 'Pilih' }}
        </Button>
      </div>

      <ListGroup
        v-for="[day, rows] in days"
        :key="tab + day"
        :label="dayLabel(day)"
        :aside="`${rows.length}`"
      >
        <BankRow
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
      </ListGroup>

      <!-- Bilah simpan menempel di bawah -->
      <div
        :class="[
          'sticky z-10 mt-5 flex flex-wrap items-center gap-2 rounded-card border bg-card px-3.5 py-2.5 shadow-card',
          embedded
            ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] md:bottom-0'
            : 'bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] md:bottom-4',
        ]"
      >
        <template v-if="selecting">
          <div class="flex w-full items-center gap-2">
            <span class="flex-1 text-meta">{{ selected.size }} dipilih</span>
            <Button variant="ghost" size="sm" @click="toggleAll">
              {{ allSelected ? 'Batal pilih semua' : 'Pilih semua' }}
            </Button>
          </div>
          <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <Button :disabled="!selected.size" @click="pickSelected('category')">
              <Tag />Kategori
            </Button>
            <Button variant="secondary" :disabled="!selected.size" @click="pickSelected('account')">
              <ArrowLeftRight />Jadikan transfer
            </Button>
            <Button variant="secondary" :disabled="!selected.size" @click="includeSelected(false)">
              Lewati
            </Button>
            <Button variant="secondary" :disabled="!selected.size" @click="includeSelected(true)">
              Pakai
            </Button>
          </div>
        </template>
        <template v-else>
          <span class="flex-1 text-meta">
            <template v-if="missingAccount">
              <span class="text-warn">{{ missingAccount }} transfer belum ada akun lawannya</span>
            </template>
            <template v-else-if="included.length">
              <b class="tabular-nums">{{ n(included.length) }}</b> akan disimpan
            </template>
            <template v-else>Tidak ada yang dipilih</template>
          </span>
          <Button
            size="touch"
            :disabled="!included.length || !!missingAccount || !canEdit"
            @click="save"
          >
            Simpan {{ included.length ? n(included.length) : '' }}
          </Button>
        </template>
      </div>
      <p
        v-if="flow.commit.error.value"
        class="mt-3 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-meta text-bad"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.commit.error.value.message }}
      </p>
    </template>

    <!-- ---------- 3. menyimpan ---------- -->
    <Card
      v-else-if="step === 'saving'"
      class="mt-3.5 flex flex-col items-center gap-3 px-5 py-10 text-center"
      aria-live="polite"
    >
      <RefreshCw class="size-6 animate-spin text-primary-accent" aria-hidden="true" />
      <b class="text-panel">Menyimpan {{ n(included.length) }} transaksi…</b>
    </Card>

    <!-- ---------- 4. hasil ---------- -->
    <template v-else-if="step === 'done' && result">
      <Card
        class="mt-3.5 flex flex-col items-center gap-3 px-5 py-8 text-center"
        aria-live="polite"
      >
        <ToneIcon :icon="CircleCheck" tone="ok" />
        <b class="text-panel">
          {{
            result.inserted
              ? `${n(result.inserted)} transaksi disimpan`
              : 'Tidak ada transaksi baru'
          }}
        </b>
        <p class="m-0 text-meta text-muted-foreground">
          Bisa dibatalkan dari Riwayat impor.<template v-if="result.duplicates">
            {{ n(result.duplicates) }} sudah pernah diimpor, dilewati.</template
          >
        </p>
      </Card>
      <div class="mt-3.5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" size="touch" @click="finish">Lihat transaksi</Button>
        <Button variant="ghost" size="touch" @click="startOver">{{
          isPhoto ? 'Baca foto lain' : 'Impor mutasi lain'
        }}</Button>
      </div>
    </template>

    <Overlay v-model:open="pickerOpen" labelledby="bank-picker-title">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="bank-picker-title" class="m-0 min-w-0 flex-1 truncate text-panel font-bold">
            {{ pickerTitle }}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            class="press-icon"
            aria-label="Tutup pilihan"
            @click="pickerOpen = false"
          >
            <X />
          </Button>
        </div>
        <SegmentedControl
          v-model="pickerMode"
          :options="[
            { value: 'category', label: pickerDirection === 'in' ? 'Pemasukan' : 'Pengeluaran' },
            { value: 'account', label: 'Transfer' },
          ]"
          label="Jenis transaksi"
        />
        <div class="max-h-[55dvh] overflow-y-auto overscroll-contain rounded-[10px]" data-no-drag>
          <GridPicker
            v-if="pickerMode === 'category'"
            :key="`cat-${pickerDirection}`"
            :items="pickerCategoryItems"
            :model-value="pickerValue"
            label="Pilih kategori"
            @select="pick"
          />
          <GridPicker
            v-else
            key="acc"
            :items="pickerAccountItems"
            :model-value="pickerValue"
            :label="pickerDirection === 'out' ? 'Transfer ke akun' : 'Transfer dari akun'"
            @select="pick"
          />
        </div>
      </div>
    </Overlay>
  </div>
</template>
