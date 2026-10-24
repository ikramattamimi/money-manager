<script setup lang="ts">
import { ArrowLeft, Plus, Zap } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { Template } from '@/features/templates/api';
import { useTemplates } from '@/features/templates/useTemplates';
import { formatRupiah } from '@/lib/format';

// Template (bookmark Realbyte): transaksi yang sering dicatat. Diurutkan dari
// yang paling sering dipakai; muncul sebagai tombol di Catat cepat.
definePageMeta({ layout: 'app' });
useHead({ title: 'Template · Money Manager' });

const { canEdit } = useActiveBook();
const templates = useTemplates();
const accounts = useAccounts();
const categories = useCategories();

const style = (t: Template) =>
  t.type === 'transfer' ? TRANSFER_STYLE : categories.style(t.category_id);
const subtitle = (t: Template) =>
  [
    t.amount ? formatRupiah(t.amount) : 'Nominal saat dipakai',
    t.type === 'transfer'
      ? `${accounts.name(t.account_id)} → ${accounts.name(t.to_account_id)}`
      : accounts.name(t.account_id) || 'Akun terakhir',
    t.use_count ? `${t.use_count}× dipakai` : '',
  ]
    .filter(Boolean)
    .join(' · ');

const { openAsPage } = useFormPage();
const formOpen = ref(false);
const editing = ref<Template | null>(null);
const session = ref(0);
function openForm(template: Template | null) {
  if (!canEdit.value) return;
  if (openAsPage(template ? `/settings/templates/${template.id}` : '/settings/templates/new'))
    return;
  editing.value = template;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Template">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton v-if="canEdit" @click="openForm(null)">
          <Plus aria-hidden="true" />Template
        </HeaderButton>
      </template>
    </PageHeader>

    <Card v-if="templates.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="4" /></Card>
    <Card v-else-if="!templates.data.value?.length" class="mt-3.5">
      <EmptyState
        :icon="Zap"
        title="Belum ada template"
        description="Simpan transaksi yang sering dicatat (langganan, parkir, kos) supaya cukup satu tap."
      />
    </Card>
    <ListGroup
      v-else
      label="Paling sering dipakai"
      :aside="`${templates.data.value.length} template`"
    >
      <ListRow
        v-for="t in templates.data.value"
        :key="t.id"
        :as="canEdit ? 'button' : 'div'"
        :title="t.name"
        :subtitle="subtitle(t)"
        @click="openForm(t)"
      >
        <template #lead><ToneIcon v-bind="style(t)" /></template>
      </ListRow>
    </ListGroup>

    <Overlay v-model:open="formOpen" labelledby="template-form-title">
      <TemplateForm
        :key="session"
        :template="editing"
        title-id="template-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
