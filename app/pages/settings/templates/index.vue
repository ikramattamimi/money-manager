<script setup lang="ts">
import { Plus } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { Template } from '@/features/templates/api';
import { useTemplates } from '@/features/templates/useTemplates';
import { formatRupiah } from '@/lib/format';

// Kelola Bookmark (tabel templates): transaksi yang sering dicatat, urut dari
// yang paling sering dipakai. Dipakai dari menu tahan tombol + → Dari
// bookmark, atau bintang di form catat. Ketuk = ubah.
definePageMeta({ layout: 'app' });
useHead({ title: 'Bookmark · Money Manager' });

const { canEdit } = useActiveBook();
const templates = useTemplates();
const accounts = useAccounts();
const categories = useCategories();

const style = (t: Template) =>
  t.type === 'transfer' ? TRANSFER_STYLE : categories.style(t.category_id);
const subtitle = (t: Template) =>
  [
    t.type === 'transfer'
      ? `${accounts.name(t.account_id)} → ${accounts.name(t.to_account_id)}`
      : [categories.label(t.category_id, true), accounts.name(t.account_id) || 'Akun terakhir']
          .filter(Boolean)
          .join(' · '),
    t.use_count ? `${t.use_count}× dipakai` : '',
  ]
    .filter(Boolean)
    .join(' · ');
const tone = (t: Template) =>
  t.type === 'income' ? 'inc' : t.type === 'expense' ? 'exp' : undefined;

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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Bookmark" back="Lainnya" back-to="/more" line class="sticky top-0 md:static">
      <template v-if="canEdit" #right>
        <IconButton label="Bookmark baru" accent @click="openForm(null)"><Plus /></IconButton>
      </template>
    </NavBar>

    <div class="pb-8">
      <EmptyCard v-if="templates.isPending.value" title="Memuat…" />
      <EmptyCard
        v-else-if="!templates.data.value?.length"
        title="Belum ada bookmark"
        description="Simpan transaksi yang sering dicatat (langganan, parkir, kos) supaya cukup satu ketuk. Bisa juga dari bintang di form catat."
      />
      <template v-else>
        <GroupedList
          label="Paling sering dipakai"
          :aside="`${templates.data.value.length} bookmark`"
        >
          <GroupRow
            v-for="t in templates.data.value"
            :key="t.id"
            :title="t.name"
            :subtitle="subtitle(t)"
            :value="t.amount ? formatRupiah(t.amount) : 'Isi nominal'"
            :value-tone="t.amount ? tone(t) : undefined"
            :chevron="canEdit"
            v-on="canEdit ? { click: () => openForm(t) } : {}"
          >
            <template #icon><ToneIcon v-bind="style(t)" size="sm" /></template>
          </GroupRow>
        </GroupedList>
        <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
          Pakai lewat tahan tombol + → Dari bookmark. Bookmark tanpa nominal membuka papan angka
          dulu.
        </p>
      </template>
    </div>

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
