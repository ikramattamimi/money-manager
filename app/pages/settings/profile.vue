<script setup lang="ts">
import { ArrowLeft, Camera, Eye, EyeOff, KeyRound, RefreshCw, Trash2 } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import FormField from '@/components/base/FormField.vue';
import Avatar from '@/components/data/Avatar.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { authApi } from '@/features/auth/api';
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

// ---------- kata sandi (opsional, untuk masuk tanpa kode email) ----------
const password = ref('');
const confirmPassword = ref('');
const passwordError = ref('');
const savingPassword = ref(false);
const showPassword = ref(false);
async function savePassword() {
  passwordError.value = '';
  if (password.value.length < 8) return (passwordError.value = 'Minimal 8 karakter.');
  if (password.value !== confirmPassword.value)
    return (passwordError.value = 'Kedua kata sandi tidak sama.');
  savingPassword.value = true;
  try {
    await authApi.setPassword(password.value);
    password.value = confirmPassword.value = '';
    toast.show('Kata sandi disimpan. Sekarang bisa masuk dengan email dan kata sandi.');
  } catch (e) {
    passwordError.value = (e as Error).message;
  } finally {
    savingPassword.value = false;
  }
}
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
      <!-- Label di atas, input dan tombol satu baris, petunjuk di bawah: tombol sejajar input -->
      <form class="flex flex-col gap-1.5" @submit.prevent="saveName">
        <label for="profile-name" class="text-label font-semibold">Nama</label>
        <div class="flex items-center gap-2">
          <input
            id="profile-name"
            v-model="name"
            type="text"
            maxlength="60"
            class="field-input min-w-0 flex-1"
            autocomplete="name"
            placeholder="Nama panggilan"
          />
          <Button
            type="submit"
            size="touch"
            variant="secondary"
            :disabled="!nameChanged || mutations.rename.isPending.value"
            >Simpan</Button
          >
        </div>
        <p class="m-0 text-xs text-muted-foreground">Terlihat oleh anggota buku yang sama.</p>
      </form>
    </Card>

    <Card class="mt-3.5 p-3.5">
      <form class="flex flex-col gap-3" @submit.prevent="savePassword">
        <div class="flex items-start gap-3">
          <KeyRound class="mt-0.5 size-5 shrink-0 text-primary-accent" aria-hidden="true" />
          <div class="flex flex-col gap-0.5">
            <b class="text-label">Kata sandi</b>
            <p class="m-0 text-xs text-muted-foreground">
              Opsional. Dengan kata sandi kamu bisa masuk tanpa menunggu kode email. Kode email
              tetap bisa dipakai kapan saja, termasuk kalau lupa kata sandi.
            </p>
          </div>
        </div>
        <!-- Kolom email tersembunyi supaya pengelola kata sandi menyimpan pasangan yang benar -->
        <input
          type="email"
          name="email"
          autocomplete="username"
          :value="user?.email"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          readonly
        />
        <FormField label="Kata sandi baru" for="profile-password">
          <div class="relative">
            <input
              id="profile-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              minlength="8"
              class="field-input pr-11!"
            />
            <button
              type="button"
              class="press absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              @click="showPassword = !showPassword"
            >
              <component :is="showPassword ? EyeOff : Eye" class="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </FormField>
        <FormField label="Ulangi kata sandi" for="profile-password-confirm">
          <input
            id="profile-password-confirm"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="field-input"
          />
        </FormField>
        <p v-if="passwordError" class="m-0 text-meta text-bad" role="alert">{{ passwordError }}</p>
        <Button
          type="submit"
          size="touch"
          variant="secondary"
          :disabled="savingPassword || !password || !confirmPassword"
        >
          {{ savingPassword ? 'Menyimpan…' : 'Simpan kata sandi' }}
        </Button>
      </form>
    </Card>
  </div>
</template>
