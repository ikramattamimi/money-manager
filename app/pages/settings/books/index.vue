<script setup lang="ts">
import { Check, Info, Plus } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IconButton from '@/components/ios/IconButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import BookForm from '@/components/money/BookForm.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { ROLE_LABEL } from '@/features/books/useBookAdmin';

// Daftar buku: ketuk baris = buka buku itu di perangkat ini (centang),
// tombol (i) = atur anggota, undangan, nama, dan hapus.
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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Buku" back="Lainnya" back-to="/more" line class="sticky top-0 md:static">
      <template #right>
        <IconButton label="Buku baru" accent @click="newBook"><Plus /></IconButton>
      </template>
    </NavBar>

    <div class="pb-8">
      <EmptyCard v-if="isPending" title="Memuat buku…" />
      <section v-else>
        <SectionHeader label="Bukumu" :aside="`${books?.length ?? 0} buku`" />
        <div class="mx-4 overflow-hidden rounded-group bg-card">
          <div v-for="b in books ?? []" :key="b.id" class="bk-row relative flex items-center">
            <button
              type="button"
              class="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left active:bg-fill-press"
              :aria-current="b.id === bookId ? 'true' : undefined"
              @click="open(b.id, b.name)"
            >
              <span
                :class="[
                  'grid size-10 shrink-0 place-items-center rounded-full text-body font-bold',
                  b.id === bookId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-fill text-foreground',
                ]"
                aria-hidden="true"
                >{{ b.name.slice(0, 2).toUpperCase() }}</span
              >
              <span class="flex min-w-0 flex-1 flex-col">
                <b class="truncate text-row font-medium tracking-[-0.01em]">{{ b.name }}</b>
                <span class="truncate text-meta text-muted-foreground"
                  >{{ b.role ? ROLE_LABEL[b.role] : 'Anggota'
                  }}{{ b.id === bookId ? ' · sedang dibuka' : '' }}</span
                >
              </span>
              <Check
                v-if="b.id === bookId"
                class="size-5 shrink-0 text-primary-accent"
                stroke-width="2.6"
                aria-hidden="true"
              />
            </button>
            <IconButton
              :label="`Atur buku ${b.name}`"
              accent
              class="mr-1"
              :to="`/settings/books/${b.id}`"
              ><Info
            /></IconButton>
          </div>
        </div>
        <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
          Setiap buku punya akun, kategori, dan transaksinya sendiri. Buku yang dibuka diingat di
          perangkat ini. Ketuk (i) untuk mengundang anggota atau mengubah nama.
        </p>
      </section>
    </div>

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

<style scoped>
.bk-row + .bk-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 68px;
  height: 0.5px;
  background: var(--sep);
}
</style>
