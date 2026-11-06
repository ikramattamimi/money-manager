<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { Download, FileUp } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { backupApi } from '@/features/backup/api';
import { countsOf, parseBackup, type BookBackup } from '@/features/backup/backup';
import { bookKeys } from '@/features/books/keys';
import { useActiveBook } from '@/features/books/useActiveBook';

// Backup & pulihkan (pengganti "Backup iCloud" di mockup; PWA tidak bisa ke
// iCloud). Unduh = satu file JSON berisi seluruh buku aktif, disimpan di
// perangkat (app File). Pulihkan = buat buku BARU dari file itu; buku yang
// sedang dipakai tidak pernah ditimpa. File tidak dikirim ke server mana pun
// selain Supabase saat baris-barisnya disisipkan.
definePageMeta({ layout: 'app' });
useHead({ title: 'Backup & pulihkan · Money Manager' });

const { book, setActiveBook } = useActiveBook();
const toast = useToast();
const alert = useAlert();
const client = useQueryClient();

// ---------- unduh ----------
const exporting = ref(false);
async function download() {
  if (!book.value || exporting.value) return;
  exporting.value = true;
  try {
    const data = await backupApi.export(book.value);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = book.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'buku';
    a.href = url;
    a.download = `money-manager-${slug}-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show(`Backup ${countsOf(data).transactions.toLocaleString('id-ID')} transaksi diunduh`);
  } catch (e) {
    toast.show((e as Error).message);
  } finally {
    exporting.value = false;
  }
}

// ---------- pulihkan ----------
const fileInput = ref<HTMLInputElement>();
const picked = ref<{ name: string; data: BookBackup } | null>(null);
const newName = ref('');
const progress = ref<number | null>(null);
const counts = computed(() => (picked.value ? countsOf(picked.value.data) : null));

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = '';
  if (!file) return;
  try {
    const data = parseBackup(await file.text());
    picked.value = { name: file.name, data };
    newName.value = `${data.book.name} (pulihan)`.slice(0, 60);
  } catch (e) {
    picked.value = null;
    toast.show((e as Error).message);
  }
}

async function restore() {
  const p = picked.value;
  const name = newName.value.trim();
  if (!p || !name || progress.value !== null) return;
  const ok = await alert.confirm({
    title: `Buat buku "${name}"?`,
    body: `${counts.value!.transactions.toLocaleString('id-ID')} transaksi dan ${counts.value!.accounts} akun dari backup akan dimasukkan ke buku baru. Buku yang sekarang tidak berubah.`,
    okLabel: 'Pulihkan',
  });
  if (!ok) return;
  progress.value = 0;
  try {
    const created = await backupApi.restore(p.data, name, (done, total) => {
      progress.value = done / total;
    });
    await client.invalidateQueries({ queryKey: bookKeys.all });
    picked.value = null;
    toast.show(`Buku ${created.name} dipulihkan`);
    setActiveBook(created.id);
    await navigateTo('/');
  } catch (e) {
    toast.show((e as Error).message);
    await client.invalidateQueries({ queryKey: bookKeys.all });
  } finally {
    progress.value = null;
  }
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] pb-8 md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Backup & pulihkan"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    />

    <GroupedList label="Backup">
      <GroupRow
        title="Unduh backup"
        :subtitle="`Buku ${book?.name ?? ''} · semua akun, kategori, transaksi, budget`"
        :inset="58"
        @click="download"
      >
        <template #icon><ToneIcon :icon="Download" tone="green" size="sm" solid /></template>
        <template #end>
          <span v-if="exporting" class="text-meta text-muted-foreground">Menyiapkan…</span>
        </template>
      </GroupRow>
    </GroupedList>
    <p class="mx-8 mt-2 text-meta text-muted-foreground">
      File .json disimpan di perangkat ini (app File atau Unduhan). Simpan salinannya di tempat
      lain, misalnya iCloud Drive.
    </p>

    <GroupedList label="Pulihkan">
      <GroupRow
        title="Pilih file backup"
        :subtitle="picked ? picked.name : 'File .json dari Unduh backup'"
        :inset="58"
        @click="fileInput?.click()"
      >
        <template #icon><ToneIcon :icon="FileUp" tone="blue" size="sm" solid /></template>
      </GroupRow>
    </GroupedList>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFile"
    />

    <template v-if="picked && counts">
      <GroupedList :label="`Isi backup · ${picked.data.exportedAt.slice(0, 10)}`">
        <GroupRow title="Transaksi" :value="counts.transactions.toLocaleString('id-ID')" strong />
        <GroupRow title="Akun" :value="String(counts.accounts)" strong />
        <GroupRow title="Kategori" :value="String(counts.categories)" strong />
        <GroupRow
          title="Budget, bookmark, berulang"
          :value="`${counts.budgets} · ${counts.templates} · ${counts.recurringRules}`"
          strong
        />
      </GroupedList>
      <GroupedList label="Nama buku baru">
        <label class="flex min-h-12 items-center px-4">
          <span class="sr-only">Nama buku baru</span>
          <input
            v-model="newName"
            type="text"
            maxlength="60"
            autocomplete="off"
            class="h-12 w-full bg-transparent text-amount outline-none"
          />
        </label>
      </GroupedList>
      <div class="flex flex-col gap-2 px-4 pt-[18px]">
        <div
          v-if="progress !== null"
          class="h-2 overflow-hidden rounded-full bg-fill-2"
          role="progressbar"
          aria-label="Memulihkan backup"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <i
            class="restore-bar block h-full origin-left rounded-full bg-primary"
            :style="{ transform: `scaleX(${progress})` }"
          />
        </div>
        <IosButton block :disabled="!newName.trim() || progress !== null" @click="restore">{{
          progress !== null ? 'Memulihkan…' : 'Pulihkan ke buku baru'
        }}</IosButton>
      </div>
      <p class="mx-8 mt-2 text-meta text-muted-foreground">
        Buku yang sekarang dipakai tidak ditimpa. Setelah selesai, app pindah ke buku baru; buku
        lama tetap bisa dipilih dari Lainnya.
      </p>
    </template>
  </div>
</template>

<style scoped>
.restore-bar {
  transition: transform 80ms linear;
}
</style>
