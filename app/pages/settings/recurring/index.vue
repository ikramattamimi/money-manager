<script setup lang="ts">
import { Plus } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { RecurringRule } from '@/features/recurring/api';
import { FREQUENCY_LABEL, useRecurringRules } from '@/features/recurring/useRecurring';
import { formatRupiah } from '@/lib/format';
import { MONTHS_SHORT } from '@/lib/time';

// Ulangi & cicilan (tabel recurring_rules): dicatat database setiap pagi
// 07.00 WIB walau app tidak dibuka. Ketuk = ubah aturan.
definePageMeta({ layout: 'app' });
useHead({ title: 'Ulangi & cicilan · Money Manager' });

const { canEdit } = useActiveBook();
const rules = useRecurringRules();
const accounts = useAccounts();
const categories = useCategories();

const active = computed(() => (rules.data.value ?? []).filter((r) => r.active));
const inactive = computed(() => (rules.data.value ?? []).filter((r) => !r.active));

const date = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
};
const style = (r: RecurringRule) =>
  r.type === 'transfer' ? TRANSFER_STYLE : categories.style(r.category_id);
const schedule = (r: RecurringRule) => {
  const f = FREQUENCY_LABEL[r.frequency];
  const every = r.interval > 1 ? `Setiap ${r.interval} ${f.unit}` : f.one;
  return r.frequency === 'monthly' && r.day_of_month ? `${every} tgl ${r.day_of_month}` : every;
};
const subtitle = (r: RecurringRule) =>
  [
    schedule(r),
    r.active
      ? `berikutnya ${date(r.next_run_on)}`
      : r.end_on
        ? `selesai ${date(r.end_on)}`
        : 'nonaktif',
    r.auto_post ? '' : 'tanya dulu',
    r.type === 'transfer'
      ? `${accounts.name(r.account_id)} → ${accounts.name(r.to_account_id)}`
      : accounts.name(r.account_id),
  ]
    .filter(Boolean)
    .join(' · ');
const tone = (r: RecurringRule) =>
  r.type === 'income' ? 'inc' : r.type === 'expense' ? 'exp' : undefined;

const { openAsPage } = useFormPage();
const formOpen = ref(false);
const editing = ref<RecurringRule | null>(null);
const session = ref(0);
function openForm(rule: RecurringRule | null) {
  if (!canEdit.value) return;
  if (openAsPage(rule ? `/settings/recurring/${rule.id}` : '/settings/recurring/new')) return;
  editing.value = rule;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Ulangi & cicilan"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    >
      <template v-if="canEdit" #right>
        <IconButton label="Aturan baru" accent @click="openForm(null)"><Plus /></IconButton>
      </template>
    </NavBar>

    <div class="pb-8">
      <p class="mx-8 mb-0 mt-3.5 text-meta leading-[1.45] text-muted-foreground">
        Dicatat otomatis setiap pagi pukul 07.00 WIB, walaupun app tidak dibuka. Aturan "tanya dulu"
        muncul di halaman Transaksi untuk dikonfirmasi.
      </p>

      <EmptyCard v-if="rules.isPending.value" title="Memuat…" />
      <EmptyCard
        v-else-if="!rules.data.value?.length"
        title="Belum ada yang diulang"
        description="Contoh: kos tiap tanggal 1, Spotify tiap bulan, gaji tiap tanggal 25, cicilan HP 12 bulan."
      />

      <template v-else>
        <GroupedList v-if="active.length" label="Aktif" :aside="`${active.length} aturan`">
          <GroupRow
            v-for="r in active"
            :key="r.id"
            :title="r.name"
            :subtitle="subtitle(r)"
            :value="formatRupiah(r.amount)"
            :value-tone="tone(r)"
            :chevron="canEdit"
            v-on="canEdit ? { click: () => openForm(r) } : {}"
          >
            <template #icon><ToneIcon v-bind="style(r)" size="sm" /></template>
          </GroupRow>
        </GroupedList>
        <GroupedList v-if="inactive.length" label="Nonaktif atau selesai">
          <GroupRow
            v-for="r in inactive"
            :key="r.id"
            :title="r.name"
            :subtitle="subtitle(r)"
            :value="formatRupiah(r.amount)"
            :chevron="canEdit"
            class="opacity-70"
            v-on="canEdit ? { click: () => openForm(r) } : {}"
          >
            <template #icon><ToneIcon v-bind="style(r)" size="sm" /></template>
          </GroupRow>
        </GroupedList>
      </template>
    </div>

    <Overlay v-model:open="formOpen" labelledby="recurring-form-title">
      <RecurringForm
        :key="session"
        :rule="editing"
        title-id="recurring-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
