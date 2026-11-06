<script setup lang="ts">
import { ChevronRight, CircleAlert, FileSpreadsheet } from '@lucide/vue';
import type { AccountKind, ImportCategory, ImportResult } from '#shared/types/import';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Chip from '@/components/ios/Chip.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import GlassBar from '@/components/data/GlassBar.vue';
import ImportStage from '@/components/money/ImportStage.vue';
import { ACCOUNT_KIND_STYLE } from '@/features/accounts/style';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useImportFlow } from '@/features/import/useImport';
import { jakartaParts, MONTHS_SHORT } from '@/lib/time';

// Impor Realbyte (mockup import-realbyte*): pilih file → membaca → pratinjau
// (KPI, akun baru dengan pilihan jenis, kategori baru, baris dilewati) → bar
// Simpan → progres → selesai dengan centang → Cocokkan saldo. File hanya
// dikirim ke server untuk dibaca, tidak disimpan.
definePageMeta({ layout: 'app' });
useHead({ title: 'Impor Realbyte · Money Manager' });

const { canEdit } = useActiveBook();
const flow = useImportFlow();

const file = shallowRef<File | null>(null);
const kinds = ref<Record<string, AccountKind>>({});
const result = ref<ImportResult | null>(null);
const preview = computed(() => flow.preview.data.value ?? null);
const step = computed(() =>
  result.value
    ? 'done'
    : flow.commit.isPending.value
      ? 'saving'
      : preview.value
        ? 'preview'
        : flow.preview.isPending.value
          ? 'reading'
          : 'pick',
);

const input = ref<HTMLInputElement>();
function choose(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = '';
  if (!picked) return;
  file.value = picked;
  result.value = null;
  flow.commit.reset();
  flow.preview.mutate(picked, {
    onSuccess: (p) => {
      kinds.value = Object.fromEntries(p.accounts.map((a) => [a.name.toLowerCase(), a.kind]));
    },
  });
}

function startOver() {
  file.value = null;
  result.value = null;
  showErrors.value = false;
  flow.preview.reset();
  flow.commit.reset();
}

function save() {
  if (!file.value) return;
  flow.commit.mutate(
    { file: file.value, kinds: kinds.value },
    { onSuccess: (r) => (result.value = r) },
  );
}

// ---------- tampilan pratinjau ----------
const n = (value: number) => value.toLocaleString('id-ID');
const range = computed(() => {
  const r = preview.value?.range;
  if (!r) return '';
  const from = jakartaParts(r.from);
  const to = jakartaParts(r.to);
  return `${MONTHS_SHORT[from.month - 1]} ${from.year} – ${MONTHS_SHORT[to.month - 1]} ${to.year}`;
});

const kpis = computed(() => {
  const p = preview.value;
  if (!p) return [];
  return [
    { label: 'Keluar', value: n(p.counts.expense), tone: 'text-exp' },
    { label: 'Masuk', value: n(p.counts.income), tone: 'text-inc' },
    { label: 'Transfer', value: n(p.counts.transfer), tone: '' },
    { label: 'Koreksi', value: n(p.counts.adjustment), tone: '' },
  ];
});

const newAccounts = computed(() => preview.value?.accounts.filter((a) => !a.existingId) ?? []);
const existingAccounts = computed(() => preview.value?.accounts.filter((a) => a.existingId) ?? []);

// Jenis akun: lima yang paling sering dulu, sisanya di balik "Lainnya…"
const MAIN_KINDS: AccountKind[] = ['bank', 'ewallet', 'cash', 'card', 'savings'];
const ALL_KINDS = Object.keys(ACCOUNT_KIND_STYLE) as AccountKind[];
const expanded = ref<Record<string, boolean>>({});
const kindsFor = (key: string) =>
  expanded.value[key] || !MAIN_KINDS.includes(kinds.value[key] ?? 'other') ? ALL_KINDS : MAIN_KINDS;

/** Kategori baru: induk lalu subnya (induk bisa sudah ada di buku) */
const categoryRows = computed(() => {
  const list = preview.value?.newCategories ?? [];
  const groups = new Map<
    string,
    { label: string; kind: string; parent?: ImportCategory; children: ImportCategory[] }
  >();
  for (const c of list) {
    const key = c.parentKey ?? c.key;
    const label = c.parentKey ? c.parentKey.split(':')[1]! : c.name;
    const group = groups.get(key) ?? { label, kind: c.kind, children: [] };
    if (c.parentKey) group.children.push(c);
    else group.parent = c;
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((g) => {
    const kind = g.kind === 'income' ? 'Pemasukan' : 'Pengeluaran';
    const head = {
      key: `${g.kind}:${g.label}`,
      title: g.parent ? `${g.parent.emoji} ${g.parent.name}`.trim() : g.label,
      caption: g.parent ? `${kind} · ${n(g.parent.count)} transaksi` : `${kind} · induk sudah ada`,
      sub: false,
    };
    return [
      head,
      ...g.children.map((c) => ({
        key: c.key,
        title: `${c.emoji} ${c.name}`.trim(),
        caption: `Sub ${g.parent?.name ?? g.label} · ${n(c.count)} transaksi`,
        sub: true,
      })),
    ];
  });
});
const showErrors = ref(false);
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:rounded-2xl"
  >
    <NavBar
      title="Impor Realbyte"
      back="Impor"
      back-to="/settings/import"
      line
      class="sticky top-0 md:static md:rounded-t-2xl"
    />

    <input
      ref="input"
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="choose"
    />

    <!-- 1. pilih file -->
    <ImportStage
      v-if="step === 'pick'"
      state="pick"
      :icon="FileSpreadsheet"
      title="Pindahkan data dari Realbyte"
      text="Di Realbyte buka Lainnya → Backup → Ekspor ke Excel, simpan ke app File, lalu pilih file .xlsx itu di sini."
    >
      <p
        v-if="flow.preview.error.value"
        class="m-0 flex items-start gap-1.5 self-stretch rounded-xl bg-bad-soft px-3 py-2 text-left text-meta text-exp"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.preview.error.value.message }}
      </p>
      <IosButton block class="mt-1" :disabled="!canEdit" @click="input?.click()"
        >Pilih file .xlsx</IosButton
      >
      <span class="text-note text-muted-foreground">{{
        canEdit
          ? 'File hanya dibaca untuk pratinjau, tidak disimpan.'
          : 'Peranmu di buku ini hanya melihat, jadi tidak bisa mengimpor.'
      }}</span>
    </ImportStage>

    <!-- 2. membaca -->
    <ImportStage
      v-else-if="step === 'reading'"
      state="reading"
      :title="`Membaca ${file?.name ?? 'file'}`"
      text="Mengelompokkan akun, kategori, dan transfer…"
    />

    <!-- 3. pratinjau -->
    <div v-else-if="step === 'preview' && preview" class="pb-2">
      <GroupedList class="mt-3.5">
        <GroupRow
          :title="preview.filename"
          :subtitle="[range, `${n(preview.rowCount)} baris`].filter(Boolean).join(' · ')"
          :inset="62"
        >
          <template #icon><ToneIcon :icon="FileSpreadsheet" tone="green" solid /></template>
          <template #end><Chip @click="startOver">Ganti</Chip></template>
        </GroupRow>
      </GroupedList>

      <div class="mx-4 mt-2.5 grid grid-cols-4 gap-1.5">
        <div
          v-for="k in kpis"
          :key="k.label"
          class="flex min-w-0 flex-col gap-px rounded-group bg-card px-2.5 py-[9px]"
        >
          <small class="truncate text-2xs text-muted-foreground">{{ k.label }}</small>
          <b :class="['truncate text-bar font-bold tracking-[-0.02em]', k.tone]">{{ k.value }}</b>
        </div>
      </div>

      <p class="mx-5 mb-0 mt-3 text-label leading-[1.45]">
        <b>{{ n(preview.newCount) }}</b> transaksi baru akan disimpan.
        <span class="text-muted-foreground">
          Transfer Realbyte (2 baris Out/In) digabung jadi satu.<template v-if="preview.duplicates">
            {{ n(preview.duplicates) }} sudah pernah diimpor, dilewati.</template
          ><template v-if="preview.unpairedTransfers">
            {{ n(preview.unpairedTransfers) }} transfer tanpa pasangan tetap diimpor dari satu
            sisi.</template
          >
        </span>
      </p>

      <GroupedList
        v-if="newAccounts.length"
        :label="`Akun baru · ${newAccounts.length}`"
        aside="pilih jenisnya"
      >
        <GroupRow v-for="a in newAccounts" :key="a.name">
          <b class="truncate text-row font-medium tracking-[-0.01em]">{{ a.name }}</b>
          <span class="truncate text-meta text-muted-foreground"
            >{{ n(a.count) }} transaksi ·
            {{ ACCOUNT_KIND_STYLE[kinds[a.name.toLowerCase()] ?? a.kind].label }}</span
          >
          <div
            class="flex w-full flex-wrap gap-1.5 pb-1 pt-2"
            role="radiogroup"
            :aria-label="`Jenis akun ${a.name}`"
          >
            <button
              v-for="k in kindsFor(a.name.toLowerCase())"
              :key="k"
              type="button"
              role="radio"
              :aria-checked="kinds[a.name.toLowerCase()] === k"
              :class="[
                'imp-kind h-[30px] rounded-full px-3 text-meta font-semibold',
                kinds[a.name.toLowerCase()] === k
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-fill text-foreground',
              ]"
              @click="kinds[a.name.toLowerCase()] = k"
            >
              {{ ACCOUNT_KIND_STYLE[k].label }}
            </button>
            <button
              v-if="kindsFor(a.name.toLowerCase()).length < ALL_KINDS.length"
              type="button"
              class="imp-kind h-[30px] rounded-full px-3 text-meta font-semibold text-primary-accent"
              @click="expanded[a.name.toLowerCase()] = true"
            >
              Lainnya…
            </button>
          </div>
        </GroupRow>
      </GroupedList>
      <p
        v-if="existingAccounts.length"
        class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground"
      >
        Sudah ada di buku: {{ existingAccounts.map((a) => a.name).join(', ') }}. Transaksinya masuk
        ke akun yang sama.
      </p>

      <GroupedList
        v-if="categoryRows.length"
        :label="`Kategori baru · ${preview.newCategories.length}`"
      >
        <GroupRow
          v-for="c in categoryRows"
          :key="c.key"
          :title="c.title"
          :subtitle="c.caption"
          :class="c.sub && 'pl-8'"
          :inset="c.sub ? 32 : 16"
        />
      </GroupedList>
      <p
        v-if="preview.matchedCategories"
        class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground"
      >
        {{ preview.matchedCategories }} kategori lain sudah ada di buku dan akan dipakai.
      </p>

      <template v-if="preview.errors.length">
        <button
          type="button"
          class="flex items-center gap-1 px-8 pb-[7px] pt-[18px] text-meta uppercase tracking-[0.02em] text-muted-foreground active:opacity-50"
          :aria-expanded="showErrors"
          @click="showErrors = !showErrors"
        >
          <ChevronRight
            :class="['imp-chev size-3', showErrors && 'rotate-90']"
            stroke-width="3"
            aria-hidden="true"
          />
          Baris dilewati · {{ n(preview.errors.length) }}
        </button>
        <GroupedList v-if="showErrors">
          <GroupRow
            v-for="e in preview.errors.slice(0, 200)"
            :key="e.row"
            :title="`Baris ${e.row + 1}`"
            :subtitle="e.reason"
          />
        </GroupedList>
      </template>

      <p
        v-if="flow.commit.error.value"
        class="mx-4 mt-3 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-meta text-exp"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.commit.error.value.message }}
      </p>

      <GlassBar>
        <span class="min-w-0 flex-1 text-label text-muted-foreground">
          <template v-if="preview.newCount"
            ><b class="text-bar text-foreground">{{ n(preview.newCount) }}</b> transaksi
            baru</template
          >
          <template v-else>Semua transaksi di file ini sudah ada</template>
        </span>
        <IosButton class="w-[140px]" :disabled="!preview.newCount || !canEdit" @click="save"
          >Simpan</IosButton
        >
      </GlassBar>
    </div>

    <!-- 4. menyimpan -->
    <ImportStage
      v-else-if="step === 'saving'"
      state="saving"
      :title="`Menyimpan ${n(preview?.newCount ?? 0)} transaksi`"
      text="Jangan tutup halaman ini. Biasanya kurang dari setengah menit."
    />

    <!-- 5. selesai -->
    <ImportStage
      v-else-if="step === 'done' && result"
      state="done"
      :title="
        result.inserted ? `${n(result.inserted)} transaksi tersimpan` : 'Tidak ada transaksi baru'
      "
      :text="
        [
          result.inserted
            ? `${range ? `${range} sudah ada` : 'Sudah ada'} di Transaksi. Bisa dibatalkan dari Riwayat impor.`
            : 'Semua transaksi di file ini sudah pernah diimpor.',
          result.accountsCreated || result.categoriesCreated
            ? `${n(result.accountsCreated)} akun dan ${n(result.categoriesCreated)} kategori baru dibuat.`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      "
    >
      <div
        v-if="result.inserted"
        class="mb-1 mt-1.5 self-stretch rounded-group bg-warn-soft px-[13px] py-[11px] text-left text-label leading-[1.45]"
      >
        <b>Satu langkah lagi.</b> Ekspor Realbyte tidak berisi saldo awal, jadi saldo hasil hitungan
        bisa beda dari aslinya. Isi saldo hari ini supaya cocok.
      </div>
      <IosButton v-if="result.inserted" block to="/settings/import/balances"
        >Cocokkan saldo</IosButton
      >
      <IosButton block variant="gray" to="/">Lihat transaksi</IosButton>
      <button
        type="button"
        class="p-1.5 text-body text-primary-accent active:opacity-50"
        @click="startOver"
      >
        Impor file lain
      </button>
    </ImportStage>
  </div>
</template>

<style scoped>
.imp-kind {
  transition: transform 120ms var(--ease-out);
}
.imp-kind:active {
  transform: scale(0.95);
}
.imp-chev {
  transition: transform 200ms var(--ease-out);
}
</style>
