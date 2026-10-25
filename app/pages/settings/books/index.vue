<script setup lang="ts">
import { ArrowLeft, BookOpen, Check, ChevronRight, Plus } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import BookForm from '@/components/money/BookForm.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { ROLE_LABEL } from '@/features/books/useBookAdmin';

// Daftar buku: tap untuk membuka (pindah buku aktif di perangkat ini),
// "Atur" untuk anggota, undangan, nama, dan hapus.
definePageMeta({ layout: 'app' });
useHead({ title: 'Buku · Money Manager' });

const { books, bookId, setActiveBook, isPending } = useActiveBook();
const toast = useToast();

function open(id: string, name: string) {
  if (id === bookId.value) return;
  setActiveBook(id);
  toast.show(`Buku ${name} dibuka`);
}

const { openAsPage } = useFormPage();
const formOpen = ref(false);
const session = ref(0);
function newBook() {
  if (openAsPage('/settings/books/new')) return;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div class="mx-auto md:max-w-[620px]">
    <PageHeader title="Buku">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton @click="newBook"><Plus aria-hidden="true" />Buku</HeaderButton>
      </template>
    </PageHeader>

    <p class="mx-2.5 mt-3.5 text-meta text-muted-foreground">
      Setiap buku punya akun, kategori, dan transaksinya sendiri. Buku yang dibuka diingat di
      perangkat ini.
    </p>

    <Card v-if="isPending" class="mt-3.5 p-1"><Skeleton :rows="2" /></Card>
    <ListGroup v-else label="Bukumu" :aside="`${books?.length ?? 0} buku`">
      <div v-for="b in books ?? []" :key="b.id" class="flex items-center gap-1">
        <ListRow
          as="button"
          class="flex-1"
          :title="b.name"
          :subtitle="`${b.role ? ROLE_LABEL[b.role] : 'Anggota'}${b.id === bookId ? ' · sedang dibuka' : ''}`"
          :aria-current="b.id === bookId ? 'true' : undefined"
          @click="open(b.id, b.name)"
        >
          <template #lead
            ><ToneIcon :icon="BookOpen" :tone="b.id === bookId ? 'primary' : 'neutral'"
          /></template>
          <template #end>
            <Check v-if="b.id === bookId" class="size-4.5 text-primary-accent" aria-hidden="true" />
          </template>
        </ListRow>
        <Button
          variant="ghost"
          size="default"
          :aria-label="`Atur buku ${b.name}`"
          @click="navigateTo(`/settings/books/${b.id}`)"
        >
          Atur<ChevronRight />
        </Button>
      </div>
    </ListGroup>

    <Overlay v-model:open="formOpen" labelledby="book-form-title">
      <BookForm
        :key="session"
        title-id="book-form-title"
        @close="formOpen = false"
        @created="
          (id) => {
            formOpen = false;
            navigateTo(`/settings/books/${id}`);
          }
        "
      />
    </Overlay>
  </div>
</template>
