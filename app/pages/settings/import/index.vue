<script setup lang="ts">
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  History,
  RefreshCw,
  Scale,
  Upload,
} from '@lucide/vue';
import type { AccountKind, ImportCategory, ImportResult } from '#shared/types/import';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import KpiStrip from '@/components/data/KpiStrip.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { ACCOUNT_KIND_STYLE } from '@/features/accounts/style';
import { useActiveBook } from '@/features/books/useActiveBook';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useImportFlow } from '@/features/import/useImport';
import { jakartaParts, MONTHS_SHORT } from '@/lib/time';

// Impor ekspor Realbyte: pilih file → preview → simpan → hasil.
// File hanya dikirim ke server untuk dibaca; tidak disimpan.
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

// ---------- tampilan preview ----------
const date = (iso: string) => {
  const d = jakartaParts(iso);
  return `${d.day} ${MONTHS_SHORT[d.month - 1]} ${d.year}`;
};
const n = (value: number) => value.toLocaleString('id-ID');

const kpis = computed(() => {
  const p = preview.value;
  if (!p) return [];
  return [
    { label: 'Pengeluaran', value: n(p.counts.expense), tone: 'bad' as const },
    { label: 'Pemasukan', value: n(p.counts.income), tone: 'primary' as const },
    { label: 'Transfer', value: n(p.counts.transfer), tone: 'neutral' as const },
    { label: 'Koreksi saldo', value: n(p.counts.adjustment), tone: 'neutral' as const },
  ];
});

const newAccounts = computed(() => preview.value?.accounts.filter((a) => !a.existingId) ?? []);
const existingAccounts = computed(() => preview.value?.accounts.filter((a) => a.existingId) ?? []);

/** Kategori baru dikelompokkan per induk (induk bisa sudah ada di buku) */
const categoryGroups = computed(() => {
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
  return [...groups.values()].map((g) => ({ ...g, label: g.parent?.name ?? g.label }));
});

const KIND_OPTIONS = Object.entries(ACCOUNT_KIND_STYLE).map(([value, s]) => ({
  value: value as AccountKind,
  label: s.label,
}));
const showErrors = ref(false);
</script>

<template>
  <div class="mx-auto md:max-w-[720px]">
    <PageHeader title="Impor Realbyte">
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
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="choose"
    />

    <!-- ---------- 1. pilih file ---------- -->
    <Card
      v-if="step === 'pick'"
      class="mt-3.5 flex flex-col items-center gap-3 px-5 py-8 text-center"
    >
      <ToneIcon :icon="FileSpreadsheet" tone="primary" />
      <div class="flex flex-col gap-1">
        <b class="text-panel">Pindahkan data dari Realbyte</b>
        <p class="m-0 max-w-[420px] text-meta text-muted-foreground">
          Di Realbyte Money Manager, ekspor data ke Excel (menu Backup), simpan ke app Files, lalu
          pilih file .xlsx itu di sini. Kamu bisa memeriksa isinya dulu sebelum disimpan.
        </p>
      </div>
      <p
        v-if="flow.preview.error.value"
        class="m-0 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2 text-left text-meta text-bad"
        role="alert"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ flow.preview.error.value.message }}
      </p>
      <Button
        size="touch"
        :disabled="!canEdit || flow.preview.isPending.value"
        @click="input?.click()"
      >
        <component
          :is="flow.preview.isPending.value ? RefreshCw : Upload"
          :class="flow.preview.isPending.value && 'animate-spin'"
        />
        {{ flow.preview.isPending.value ? 'Membaca file…' : 'Pilih file .xlsx' }}
      </Button>
      <p v-if="!canEdit" class="m-0 text-xs text-muted-foreground">
        Peranmu di buku ini hanya melihat, jadi tidak bisa mengimpor.
      </p>
      <Button variant="link" @click="navigateTo('/settings/import/bank')">
        Punya mutasi PDF dari bank? Impor mutasi bank
      </Button>
    </Card>

    <!-- ---------- 2. preview ---------- -->
    <template v-else-if="step === 'preview' && preview">
      <Card class="mt-3.5">
        <CardHead :title="preview.filename">
          <Button variant="ghost" size="default" @click="startOver">Ganti file</Button>
        </CardHead>
        <div class="flex flex-col gap-3 px-3.5 pb-3.5">
          <p class="m-0 text-meta text-muted-foreground">
            {{ n(preview.rowCount) }} baris
            <template v-if="preview.range">
              · {{ date(preview.range.from) }} – {{ date(preview.range.to) }}
            </template>
          </p>
          <KpiStrip :items="kpis" />
          <ul class="m-0 flex list-none flex-col gap-1 p-0 text-meta">
            <li>
              <b class="tabular-nums">{{ n(preview.newCount) }}</b> transaksi baru akan disimpan
            </li>
            <li v-if="preview.duplicates" class="text-muted-foreground">
              {{ n(preview.duplicates) }} sudah pernah diimpor, dilewati
            </li>
            <li v-if="preview.unpairedTransfers" class="text-warn">
              {{ n(preview.unpairedTransfers) }} transfer tanpa pasangan, tetap diimpor dari satu
              sisi
            </li>
          </ul>
        </div>
      </Card>

      <ListGroup
        v-if="newAccounts.length"
        label="Akun baru"
        :aside="`${newAccounts.length} akun · pilih grupnya`"
      >
        <ListRow
          v-for="a in newAccounts"
          :key="a.name"
          :title="a.name"
          :subtitle="`${n(a.count)} transaksi`"
        >
          <template #lead>
            <ToneIcon
              v-bind="ACCOUNT_KIND_STYLE[kinds[a.name.toLowerCase()] ?? a.kind]"
              size="sm"
            />
          </template>
          <template #end>
            <select
              v-model="kinds[a.name.toLowerCase()]"
              class="field-input h-9! w-[136px] text-meta!"
              :aria-label="`Grup akun ${a.name}`"
            >
              <option v-for="k in KIND_OPTIONS" :key="k.value" :value="k.value">
                {{ k.label }}
              </option>
            </select>
          </template>
        </ListRow>
      </ListGroup>
      <p v-if="existingAccounts.length" class="mx-2.5 mt-2 text-xs text-muted-foreground">
        {{ existingAccounts.length }} akun lain sudah ada di buku dan akan dipakai:
        {{ existingAccounts.map((a) => a.name).join(', ') }}.
      </p>

      <ListGroup
        v-if="categoryGroups.length"
        label="Kategori baru"
        :aside="`${preview.newCategories.length} kategori`"
      >
        <div v-for="g in categoryGroups" :key="g.label + g.kind" class="flex flex-col gap-0.5">
          <ListRow
            :title="g.parent ? `${g.parent.emoji} ${g.parent.name}`.trim() : g.label"
            :subtitle="`${g.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'}${g.parent ? '' : ' · induk sudah ada'}`"
          >
            <template #lead>
              <ToneIcon
                :icon="categoryIcon(g.parent?.icon)"
                :tone="asTone(g.parent?.tone)"
                size="sm"
              />
            </template>
          </ListRow>
          <ListRow
            v-for="c in g.children"
            :key="c.key"
            :title="`${c.emoji} ${c.name}`.trim()"
            subtitle="Subkategori"
            class="pl-6"
          >
            <template #lead>
              <ToneIcon :icon="categoryIcon(c.icon)" :tone="asTone(c.tone)" size="sm" />
            </template>
          </ListRow>
        </div>
      </ListGroup>
      <p v-if="preview.matchedCategories" class="mx-2.5 mt-2 text-xs text-muted-foreground">
        {{ preview.matchedCategories }} kategori lain sudah ada di buku dan akan dipakai.
      </p>

      <template v-if="preview.errors.length">
        <button
          type="button"
          class="press mt-4 flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-2xs font-semibold uppercase tracking-wider text-bad"
          :aria-expanded="showErrors"
          @click="showErrors = !showErrors"
        >
          {{ preview.errors.length }} baris gagal dibaca, tidak diimpor
          <span class="normal-case tracking-normal">{{
            showErrors ? 'Sembunyikan' : 'Lihat'
          }}</span>
        </button>
        <Card v-if="showErrors" class="flex flex-col gap-0.5 p-1">
          <ListRow
            v-for="e in preview.errors.slice(0, 200)"
            :key="e.row"
            :title="`Baris ${e.row + 1}`"
            :subtitle="e.reason"
          />
        </Card>
      </template>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <span class="flex-1 text-meta text-muted-foreground">
          {{
            preview.newCount
              ? 'Bisa dibatalkan nanti dari Riwayat impor.'
              : 'Semua transaksi di file ini sudah ada.'
          }}
        </span>
        <Button size="touch" :disabled="!preview.newCount || !canEdit" @click="save">
          Impor {{ n(preview.newCount) }} transaksi
        </Button>
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
      <b class="text-panel">Menyimpan {{ n(preview?.newCount ?? 0) }} transaksi…</b>
      <p class="m-0 text-meta text-muted-foreground">
        Jangan tutup halaman ini. Biasanya kurang dari setengah menit.
      </p>
      <div class="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-surface-2">
        <div class="import-progress h-full w-1/3 rounded-full bg-primary-accent" />
      </div>
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
            result.inserted ? `${n(result.inserted)} transaksi diimpor` : 'Tidak ada transaksi baru'
          }}
        </b>
        <p class="m-0 text-meta text-muted-foreground">
          {{ n(result.accountsCreated) }} akun baru · {{ n(result.categoriesCreated) }} kategori
          baru
          <template v-if="result.duplicates">
            · {{ n(result.duplicates) }} duplikat dilewati</template
          >
        </p>
      </Card>
      <Card v-if="result.inserted" class="mt-3.5 flex flex-col gap-3 px-3.5 py-3.5">
        <div class="flex items-start gap-3">
          <ToneIcon :icon="Scale" tone="warn" size="sm" />
          <p class="m-0 text-meta">
            <b>Satu langkah lagi.</b> Ekspor Realbyte tidak berisi saldo awal, jadi saldo akun di
            sini bisa berbeda. Cocokkan dengan saldo di Realbyte atau aplikasi bank.
          </p>
        </div>
        <Button size="touch" @click="navigateTo('/settings/import/balances')"
          >Cocokkan saldo akun</Button
        >
      </Card>
      <div class="mt-3.5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" size="touch" @click="navigateTo('/')">Lihat transaksi</Button>
        <Button variant="ghost" size="touch" @click="startOver">Impor file lain</Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Bar progres tak tentu: satu potongan bergerak bolak-balik */
.import-progress {
  animation: import-slide 1.2s var(--ease-in-out) infinite alternate;
}
@keyframes import-slide {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(200%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .import-progress {
    animation: none;
    width: 100%;
    opacity: 0.5;
  }
}
</style>
