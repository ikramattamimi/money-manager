<script setup lang="ts">
import { ChevronLeft, CircleAlert, Eye, EyeOff, FileUp, Users, Wallet, Zap } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import IosButton from '@/components/ios/IosButton.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { OTP_LENGTH, authApi } from '@/features/auth/api';
import { safeNext } from '@/features/auth/redirect';

// Masuk dengan kode OTP email, atau email + kata sandi kalau sudah diatur di
// Profil. Kode email selalu bisa dipakai (juga untuk lupa kata sandi).
// Gaya iOS: ikon app dan judul besar di atas, isian dalam grup putih, tombol
// besar. iPad/desktop: dua kolom, kiri keterangan fitur.
const FEATURES = [
  { icon: Zap, tone: 'orange', text: 'Catat cepat: ketik "kopi 25rb gopay", langsung tersimpan' },
  { icon: FileUp, tone: 'green', text: 'Impor dari Realbyte, mutasi bank PDF, dan foto struk' },
  { icon: Users, tone: 'blue', text: 'Buku bersama keluarga atau pasangan' },
] as const;
useHead({ title: 'Masuk · Money Manager' });

const route = useRoute();
const RESEND_SECONDS = 60;

const step = ref<'email' | 'code'>('email');
const email = ref('');
const code = ref('');
const pending = ref(false);
const error = ref('');
const resendIn = ref(0);
const codeInput = ref<HTMLInputElement>();
const emailInput = ref<HTMLInputElement>();
const codeFocused = ref(false);

let timer: ReturnType<typeof setInterval> | undefined;
onBeforeUnmount(() => clearInterval(timer));
onMounted(() => emailInput.value?.focus({ preventScroll: true }));

function startCooldown() {
  resendIn.value = RESEND_SECONDS;
  clearInterval(timer);
  timer = setInterval(() => {
    resendIn.value -= 1;
    if (resendIn.value <= 0) clearInterval(timer);
  }, 1000);
}

async function sendCode() {
  if (pending.value) return;
  error.value = '';
  pending.value = true;
  try {
    await authApi.sendOtp(email.value);
    step.value = 'code';
    code.value = '';
    startCooldown();
    await nextTick();
    codeInput.value?.focus();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    pending.value = false;
  }
}

async function verify() {
  if (pending.value || code.value.length !== OTP_LENGTH) return;
  error.value = '';
  pending.value = true;
  try {
    await authApi.verifyOtp(email.value, code.value);
    await navigateTo(safeNext(route.query.next), { replace: true });
  } catch (e) {
    error.value = (e as Error).message;
    code.value = '';
    codeInput.value?.focus();
  } finally {
    pending.value = false;
  }
}

function onCodeInput(event: Event) {
  // Kode dari saran keyboard iOS kadang berisi spasi; ambil angkanya saja
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, OTP_LENGTH);
  code.value = digits;
  if (digits.length === OTP_LENGTH) verify();
}

async function changeEmail() {
  step.value = 'email';
  error.value = '';
  code.value = '';
  await nextTick();
  emailInput.value?.focus();
}

// ---------- masuk dengan kata sandi (opsional, diatur di Profil) ----------
const MODES = [
  { value: 'code', label: 'Kode email' },
  { value: 'password', label: 'Kata sandi' },
] as const;
const mode = ref<(typeof MODES)[number]['value']>('code');
const password = ref('');
const showPassword = ref(false);
watch(mode, () => (error.value = ''));

async function signInPassword() {
  if (pending.value || !email.value || !password.value) return;
  error.value = '';
  pending.value = true;
  try {
    await authApi.signInWithPassword(email.value, password.value);
    await navigateTo(safeNext(route.query.next), { replace: true });
  } catch (e) {
    error.value = (e as Error).message;
    password.value = '';
  } finally {
    pending.value = false;
  }
}

/** Sel kode yang sedang diisi (untuk kursor) */
const activeCell = computed(() => Math.min(code.value.length, OTP_LENGTH - 1));
</script>

<template>
  <main
    class="min-h-dvh bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+48px)] md:grid md:grid-cols-2 md:items-center md:gap-10 md:px-10 md:py-10 lg:px-20"
  >
    <section class="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
      <span
        class="grid size-[72px] place-items-center rounded-[18px] bg-primary text-primary-foreground shadow-[var(--fab-shadow)]"
        aria-hidden="true"
      >
        <Wallet class="size-9" stroke-width="2" />
      </span>
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-large font-bold tracking-[-0.03em]">Money Manager</h1>
        <p class="m-0 text-body text-muted-foreground">Catat keuangan tanpa ribet input manual.</p>
      </div>
      <ul class="m-0 mt-6 hidden list-none flex-col gap-3.5 p-0 md:flex">
        <li v-for="f in FEATURES" :key="f.text" class="flex items-center gap-3 text-body">
          <ToneIcon :icon="f.icon" :tone="f.tone" size="sm" solid />
          {{ f.text }}
        </li>
      </ul>
      <p class="m-0 mt-4 hidden text-meta text-muted-foreground md:block">
        Data tersimpan aman di akunmu. Masuk dengan kode email atau kata sandi.
      </p>
    </section>

    <section class="mx-auto mt-8 w-full max-w-[400px] md:mt-0">
      <Transition name="step" mode="out-in">
        <!-- Langkah 1: email -->
        <form
          v-if="step === 'email'"
          key="email"
          class="flex flex-col gap-3.5"
          @submit.prevent="mode === 'code' ? sendCode() : signInPassword()"
        >
          <Segmented v-model="mode" :options="MODES" label="Cara masuk" />
          <p class="m-0 px-4 text-meta leading-[1.45] text-muted-foreground">
            <template v-if="mode === 'password'"
              >Kata sandi diatur di Profil setelah masuk dengan kode email. Lupa kata sandi? Pakai
              Kode email.</template
            >
            <template v-else
              >Kami kirim kode {{ OTP_LENGTH }} digit ke emailmu. Kode ini untuk masuk atau membuat
              akun baru.</template
            >
          </p>
          <div class="login-grp overflow-hidden rounded-group bg-card">
            <label class="flex min-h-[50px] items-center gap-3 px-4">
              <span class="w-[86px] shrink-0 text-row font-medium">Email</span>
              <input
                ref="emailInput"
                v-model="email"
                type="email"
                name="email"
                inputmode="email"
                autocomplete="email"
                autocapitalize="off"
                spellcheck="false"
                required
                placeholder="nama@email.com"
                class="h-[50px] min-w-0 flex-1 bg-transparent text-amount outline-none placeholder:text-ter"
              />
            </label>
            <label v-if="mode === 'password'" class="flex min-h-[50px] items-center gap-3 px-4">
              <span class="w-[86px] shrink-0 text-row font-medium">Kata sandi</span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                required
                class="h-[50px] min-w-0 flex-1 bg-transparent text-amount outline-none placeholder:text-ter"
              />
              <button
                type="button"
                class="-mr-3 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground active:opacity-50"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showPassword = !showPassword"
              >
                <component
                  :is="showPassword ? EyeOff : Eye"
                  class="size-[18px]"
                  aria-hidden="true"
                />
              </button>
            </label>
          </div>
          <IosButton
            type="submit"
            block
            :disabled="pending || !email || (mode === 'password' && !password)"
          >
            <template v-if="mode === 'code'">{{
              pending ? 'Mengirim kode…' : 'Kirim kode'
            }}</template>
            <template v-else>{{ pending ? 'Memeriksa…' : 'Masuk' }}</template>
          </IosButton>
        </form>

        <!-- Langkah 2: kode -->
        <form v-else key="code" class="flex flex-col gap-3.5" @submit.prevent="verify">
          <button
            type="button"
            class="-ml-1 flex items-center gap-0.5 self-start text-bar text-primary-accent active:opacity-50"
            @click="changeEmail"
          >
            <ChevronLeft class="size-[22px]" stroke-width="2.4" aria-hidden="true" />Ganti email
          </button>
          <div class="flex flex-col gap-1 px-1">
            <h2 class="m-0 text-sheet font-bold tracking-[-0.02em]">Masukkan kode</h2>
            <p class="m-0 text-meta leading-[1.45] text-muted-foreground">
              Dikirim ke <b class="break-all text-foreground">{{ email }}</b
              >. Cek juga folder spam.
            </p>
          </div>

          <!-- Satu input asli (autofill kode iOS tetap jalan), digambar sebagai sel -->
          <label class="relative block" @click="codeInput?.focus()">
            <span class="sr-only">Kode masuk {{ OTP_LENGTH }} digit</span>
            <span
              class="grid gap-1.5"
              :style="{ gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))` }"
              aria-hidden="true"
            >
              <span
                v-for="i in OTP_LENGTH"
                :key="i"
                :class="[
                  'grid h-[54px] place-items-center rounded-[12px] bg-card text-[24px] font-semibold',
                  codeFocused && i - 1 === activeCell && !pending
                    ? 'shadow-[0_0_0_2px_var(--primary-accent)]'
                    : '',
                ]"
              >
                {{ code[i - 1] ?? '' }}
              </span>
            </span>
            <input
              ref="codeInput"
              :value="code"
              type="text"
              name="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              :maxlength="OTP_LENGTH + 2"
              required
              class="absolute inset-0 h-full w-full cursor-text opacity-0"
              @input="onCodeInput"
              @focus="codeFocused = true"
              @blur="codeFocused = false"
            />
          </label>

          <IosButton type="submit" block :disabled="pending || code.length !== OTP_LENGTH">
            {{ pending ? 'Memeriksa…' : 'Masuk' }}
          </IosButton>
          <p class="m-0 text-center text-meta text-muted-foreground">
            Tidak menerima kode?
            <button
              type="button"
              class="font-semibold text-primary-accent active:opacity-50 disabled:font-normal disabled:text-muted-foreground"
              :disabled="resendIn > 0 || pending"
              @click="sendCode"
            >
              {{ resendIn > 0 ? `Kirim ulang dalam ${resendIn} dtk` : 'Kirim ulang' }}
            </button>
          </p>
        </form>
      </Transition>

      <p
        v-if="error"
        role="alert"
        class="mt-4 flex items-start gap-1.5 rounded-group bg-bad-soft px-3 py-2.5 text-meta text-exp"
      >
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ error }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.login-grp > label + label {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
/* Ganti langkah: geser sedikit + pudar, keluar lebih cepat dari masuk */
.step-enter-active {
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}
.step-leave-active {
  transition:
    opacity 120ms var(--ease-out),
    transform 120ms var(--ease-out);
}
.step-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
@media (prefers-reduced-motion: reduce) {
  .step-enter-from,
  .step-leave-to {
    transform: none;
  }
}
</style>
