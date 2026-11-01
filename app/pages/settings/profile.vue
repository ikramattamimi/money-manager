<script setup lang="ts">
import { Camera, Eye, EyeOff } from '@lucide/vue';
import Avatar from '@/components/data/Avatar.vue';
import FieldRow from '@/components/data/FieldRow.vue';
import { FIELD_INPUT } from '@/components/data/field';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { useProfile, useProfileMutations } from '@/features/profile/useProfile';

// Profil: nama tampilan dan foto (terlihat oleh anggota buku yang sama di
// daftar anggota dan nama pencatat), plus kata sandi opsional untuk masuk
// tanpa kode email.
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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Profil" back="Lainnya" back-to="/more" line class="sticky top-0 md:static" />

    <input
      ref="input"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="choose"
    />

    <div class="pb-8">
      <div class="flex flex-col items-center gap-2 px-5 pb-1 pt-6 text-center">
        <button
          type="button"
          class="press relative rounded-full"
          aria-label="Ganti foto profil"
          :disabled="uploading"
          @click="input?.click()"
        >
          <Avatar
            :name="profile.displayName.value"
            :url="profile.avatarUrl.value"
            size="xl"
            :class="uploading ? 'opacity-50' : ''"
          />
          <span
            class="absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_3px_var(--background)]"
          >
            <Camera class="size-4" aria-hidden="true" />
          </span>
        </button>
        <b class="text-sheet font-bold tracking-[-0.02em]">{{ profile.displayName.value }}</b>
        <span class="-mt-1.5 text-meta text-muted-foreground">{{ user?.email }}</span>
        <div class="flex gap-4">
          <button
            type="button"
            class="py-1 text-body text-primary-accent active:opacity-50 disabled:opacity-40"
            :disabled="uploading"
            @click="input?.click()"
          >
            {{ uploading ? 'Mengunggah…' : profile.avatarUrl.value ? 'Ganti foto' : 'Tambah foto' }}
          </button>
          <button
            v-if="profile.avatarUrl.value"
            type="button"
            class="py-1 text-body text-exp active:opacity-50 disabled:opacity-40"
            :disabled="mutations.remove.isPending.value"
            @click="removePhoto"
          >
            Hapus foto
          </button>
        </div>
      </div>

      <GroupedList label="Nama">
        <FieldRow label="Nama" for="profile-name" :label-width="64">
          <input
            id="profile-name"
            v-model="name"
            type="text"
            maxlength="60"
            enterkeyhint="done"
            :class="FIELD_INPUT"
            autocomplete="name"
            placeholder="Nama panggilan"
            @keydown.enter.prevent="saveName"
          />
          <button
            v-if="nameChanged"
            type="button"
            class="shrink-0 text-body font-semibold text-primary-accent active:opacity-50 disabled:opacity-40"
            :disabled="mutations.rename.isPending.value"
            @click="saveName"
          >
            Simpan
          </button>
        </FieldRow>
      </GroupedList>
      <p class="mx-8 mt-2 text-meta text-muted-foreground">Terlihat oleh anggota buku yang sama.</p>

      <form @submit.prevent="savePassword">
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
        <GroupedList label="Kata sandi">
          <FieldRow label="Baru" for="profile-password" :label-width="72">
            <input
              id="profile-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              minlength="8"
              placeholder="Minimal 8 karakter"
              :class="FIELD_INPUT"
            />
            <button
              type="button"
              class="-my-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground active:opacity-50"
              :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              @click="showPassword = !showPassword"
            >
              <component :is="showPassword ? EyeOff : Eye" class="size-[18px]" aria-hidden="true" />
            </button>
          </FieldRow>
          <FieldRow label="Ulangi" for="profile-password-confirm" :label-width="72">
            <input
              id="profile-password-confirm"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :class="FIELD_INPUT"
            />
          </FieldRow>
          <GroupRow v-if="passwordError">
            <span class="text-meta text-exp" role="alert">{{ passwordError }}</span>
          </GroupRow>
        </GroupedList>
        <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
          Opsional. Dengan kata sandi kamu bisa masuk tanpa menunggu kode email. Kode email tetap
          bisa dipakai kapan saja, termasuk kalau lupa kata sandi.
        </p>
        <div class="px-4 pt-3">
          <IosButton
            type="submit"
            block
            variant="soft"
            :disabled="savingPassword || !password || !confirmPassword"
          >
            {{ savingPassword ? 'Menyimpan…' : 'Simpan kata sandi' }}
          </IosButton>
        </div>
      </form>
    </div>
  </div>
</template>
