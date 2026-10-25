<script setup lang="ts">
import { ArrowLeft, Camera, RefreshCw, Trash2 } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import FormField from '@/components/base/FormField.vue';
import Avatar from '@/components/data/Avatar.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { useProfile, useProfileMutations } from '@/features/profile/useProfile';

// Profil: nama tampilan dan foto. Keduanya terlihat oleh anggota buku yang
// sama (daftar anggota, nama pencatat transaksi).
definePageMeta({ layout: 'app' });
useHead({ title: 'Profil · Money Manager' });

const { user } = useAuth();
const profile = useProfile();
const mutations = useProfileMutations();
const toast = useToast();

const name = ref('');
watch(
  () => profile.data.value,
  (p) => p && !name.value && (name.value = p.display_name),
  { immediate: true },
);
const nameChanged = computed(
  () => !!name.value.trim() && name.value.trim() !== (profile.data.value?.display_name ?? ''),
);
function saveName() {
  if (!nameChanged.value) return;
  mutations.rename.mutate(name.value, { onSuccess: () => toast.show('Nama disimpan') });
}

const input = ref<HTMLInputElement>();
function choose(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast.show('Pilih file gambar.');
  mutations.upload.mutate(file, { onSuccess: () => toast.show('Foto profil diganti') });
}
function removePhoto() {
  mutations.remove.mutate(undefined, { onSuccess: () => toast.show('Foto profil dihapus') });
}
const uploading = computed(() => mutations.upload.isPending.value);
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Profil">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <input
      ref="input"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="choose"
    />

    <Card class="mt-3.5 flex flex-col items-center gap-3 px-5 py-6 text-center">
      <button
        type="button"
        class="press relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Ganti foto profil"
        :disabled="uploading"
        @click="input?.click()"
      >
        <Avatar :name="profile.displayName.value" :url="profile.avatarUrl.value" size="xl" />
        <span
          class="absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-white"
        >
          <component
            :is="uploading ? RefreshCw : Camera"
            :class="['size-4', uploading && 'animate-spin']"
          />
        </span>
      </button>
      <div class="flex flex-col">
        <b class="text-panel">{{ profile.displayName.value }}</b>
        <small class="text-meta text-muted-foreground">{{ user?.email }}</small>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" :disabled="uploading" @click="input?.click()">
          <Camera />{{ profile.avatarUrl.value ? 'Ganti foto' : 'Tambah foto' }}
        </Button>
        <Button
          v-if="profile.avatarUrl.value"
          variant="ghost-danger"
          :disabled="mutations.remove.isPending.value"
          @click="removePhoto"
        >
          <Trash2 />Hapus foto
        </Button>
      </div>
    </Card>

    <Card class="mt-3.5 p-3.5">
      <form class="flex items-end gap-2" @submit.prevent="saveName">
        <FormField
          label="Nama"
          for="profile-name"
          class="flex-1"
          hint="Terlihat oleh anggota buku yang sama."
        >
          <input
            id="profile-name"
            v-model="name"
            type="text"
            maxlength="60"
            class="field-input"
            autocomplete="name"
            placeholder="Nama panggilan"
          />
        </FormField>
        <Button
          type="submit"
          size="touch"
          variant="secondary"
          :disabled="!nameChanged || mutations.rename.isPending.value"
          >Simpan</Button
        >
      </form>
    </Card>
  </div>
</template>
