<script setup lang="ts">
import { ArrowLeft, Plus, Repeat } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { RecurringRule } from '@/features/recurring/api';
import { FREQUENCY_LABEL, useRecurringRules } from '@/features/recurring/useRecurring';
import { formatRupiah } from '@/lib/format';
import { MONTHS_SHORT } from '@/lib/time';

// Transaksi berulang: dicatat database setiap pagi 07.00 WIB, walau app tidak dibuka.
definePageMeta({ layout: 'app' });
useHead({ title: 'Transaksi berulang · Money Manager' });

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
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Transaksi berulang">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton v-if="canEdit" @click="openForm(null)"
          ><Plus aria-hidden="true" />Aturan</HeaderButton
        >
      </template>
    </PageHeader>

    <p class="mx-2.5 mt-3.5 text-meta text-muted-foreground">
      Dicatat otomatis setiap pagi pukul 07.00 WIB, walaupun app tidak dibuka. Aturan "tanya dulu"
      muncul di halaman Transaksi untuk dikonfirmasi.
    </p>

    <Card v-if="rules.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="4" /></Card>
    <Card v-else-if="!rules.data.value?.length" class="mt-3.5">
      <EmptyState
        :icon="Repeat"
        title="Belum ada transaksi berulang"
        description="Contoh: kos tiap tanggal 1, Spotify tiap bulan, gaji tiap tanggal 25."
      />
    </Card>

    <template v-else>
      <ListGroup v-if="active.length" label="Aktif" :aside="`${active.length} aturan`">
        <ListRow
          v-for="r in active"
          :key="r.id"
          :as="canEdit ? 'button' : 'div'"
          :title="r.name"
          :subtitle="subtitle(r)"
          :value="formatRupiah(r.amount)"
          :value-class="
            r.type === 'income' ? 'text-primary-accent' : r.type === 'expense' ? 'text-bad' : ''
          "
          @click="openForm(r)"
        >
          <template #lead><ToneIcon v-bind="style(r)" /></template>
        </ListRow>
      </ListGroup>
      <ListGroup v-if="inactive.length" label="Nonaktif atau selesai">
        <ListRow
          v-for="r in inactive"
          :key="r.id"
          :as="canEdit ? 'button' : 'div'"
          :title="r.name"
          :subtitle="subtitle(r)"
          :value="formatRupiah(r.amount)"
          class="opacity-70"
          @click="openForm(r)"
        >
          <template #lead><ToneIcon v-bind="style(r)" /></template>
        </ListRow>
      </ListGroup>
    </template>

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
