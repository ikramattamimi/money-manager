<script setup lang="ts">
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  FileUp,
  LockKeyhole,
  Mail,
  RefreshCw,
  Users,
  Wallet,
  Zap,
} from '@lucide/vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { Button } from '@/components/ui/button';
import { OTP_LENGTH, authApi } from '@/features/auth/api';
import { safeNext } from '@/features/auth/redirect';

// Masuk dengan kode OTP email, atau email + kata sandi kalau sudah diatur di
// Profil. Kode email selalu bisa dipakai (juga untuk lupa kata sandi). Tema sama dengan app:
// pita gradien seperti kepala halaman, kartu putih, tombol primer.
// HP: gradien di atas, kartu menumpang di bawahnya. iPad/desktop: dua kolom.
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

const FEATURES = [
  { icon: Zap, text: 'Catat cepat: ketik "kopi 25rb gopay", langsung tersimpan' },
  { icon: FileUp, text: 'Impor dari Realbyte, mutasi bank PDF, dan foto struk' },
  { icon: Users, text: 'Buku bersama keluarga atau pasangan' },
];
</script>

<template>
  <main
    class="min-h-dvh bg-background md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
  >
    <!-- Pita gradien merek: atas di HP, kolom kiri di layar lebar -->
    <section
      class="grad-stripes relative overflow-hidden bg-grad-hero px-6 pb-16 pt-[calc(env(safe-area-inset-top,0px)+40px)] text-on-grad md:flex md:flex-col md:justify-between md:rounded-[24px] md:px-10 md:pb-10 md:pt-10 [&>*]:relative [&>*]:z-[1]"
    >
      <div class="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
        <span
          class="grid size-14 place-items-center rounded-[18px] bg-on-grad text-grad-ink shadow-float md:size-12 md:rounded-2xl"
        >
          <Wallet class="size-7 md:size-6" aria-hidden="true" />
        </span>
        <div class="flex flex-col gap-1">
          <h1 class="m-0 text-[26px] font-bold leading-tight tracking-tight md:text-[34px]">
            Money Manager
          </h1>
          <p class="m-0 max-w-[30ch] text-[15px] text-on-grad-2 md:text-base">
            Catat keuangan tanpa ribet input manual.
          </p>
        </div>
      </div>

      <ul class="m-0 mt-10 hidden list-none flex-col gap-3.5 p-0 md:flex">
        <li v-for="f in FEATURES" :key="f.text" class="flex items-center gap-3 text-[15px]">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-xl border border-glass-line bg-glass"
          >
            <component :is="f.icon" class="size-4.5" aria-hidden="true" />
          </span>
          {{ f.text }}
        </li>
      </ul>
      <p class="m-0 mt-10 hidden text-xs text-on-grad-3 md:block">
        Data tersimpan aman di akunmu. Masuk dengan kode email atau kata sandi.
      </p>
    </section>

    <!-- Kartu masuk -->
    <section
      class="relative z-[2] -mt-8 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] md:mt-0 md:flex md:items-center md:justify-center md:px-0 md:pb-0"
    >
      <div
        class="mx-auto w-full max-w-[400px] rounded-[22px] border bg-card p-5 shadow-card md:p-7"
      >
        <Transition name="step" mode="out-in">
          <!-- Langkah 1: email -->
          <form
            v-if="step === 'email'"
            key="email"
            class="flex flex-col gap-4"
            @submit.prevent="mode === 'code' ? sendCode() : signInPassword()"
          >
            <SegmentedControl v-model="mode" :options="MODES" label="Cara masuk" />
            <div class="flex flex-col gap-1">
              <h2 class="m-0 text-panel font-bold">
                {{ mode === 'code' ? 'Masuk atau daftar' : 'Masuk dengan kata sandi' }}
              </h2>
              <p v-if="mode === 'password'" class="m-0 text-meta text-muted-foreground">
                Kata sandi diatur di Profil setelah masuk dengan kode email. Lupa kata sandi? Pakai
                Kode email.
              </p>
              <p v-else class="m-0 text-meta text-muted-foreground">
                Kami akan mengirim kode {{ OTP_LENGTH }} digit ke email Anda. Kode ini bisa
                digunakan untuk masuk atau membuat akun baru.
              </p>
            </div>
            <label class="flex flex-col gap-1.5">
              <span class="text-label font-semibold">Email</span>
              <span class="relative">
                <Mail
                  class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
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
                  class="field-input h-12! pl-10! text-[17px]!"
                />
              </span>
            </label>
            <label v-if="mode === 'password'" class="flex flex-col gap-1.5">
              <span class="text-label font-semibold">Kata sandi</span>
              <span class="relative">
                <LockKeyhole
                  class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  autocomplete="current-password"
                  required
                  class="field-input h-12! pl-10! pr-11! text-[17px]!"
                />
                <button
                  type="button"
                  class="press absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  @click="showPassword = !showPassword"
                >
                  <component
                    :is="showPassword ? EyeOff : Eye"
                    class="size-4.5"
                    aria-hidden="true"
                  />
                </button>
              </span>
            </label>
            <Button
              type="submit"
              size="touch"
              class="h-12 text-[16px]"
              :disabled="pending || !email || (mode === 'password' && !password)"
            >
              <RefreshCw v-if="pending" class="animate-spin" />
              <template v-if="mode === 'code'">{{
                pending ? 'Mengirim kode…' : 'Kirim kode'
              }}</template>
              <template v-else>{{ pending ? 'Memeriksa…' : 'Masuk' }}</template>
            </Button>
          </form>

          <!-- Langkah 2: kode -->
          <form v-else key="code" class="flex flex-col gap-4" @submit.prevent="verify">
            <div class="flex items-start gap-2">
              <button
                type="button"
                class="press press-icon -ml-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Ganti email"
                @click="changeEmail"
              >
                <ArrowLeft class="size-4.5" aria-hidden="true" />
              </button>
              <div class="flex min-w-0 flex-col gap-1">
                <h2 class="m-0 text-panel font-bold">Masukkan kode</h2>
                <p class="m-0 text-meta text-muted-foreground">
                  Dikirim ke <b class="break-all text-foreground">{{ email }}</b
                  >. Cek juga folder spam.
                </p>
              </div>
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
                    'grid h-12 place-items-center rounded-[10px] border bg-surface-2 text-[22px] font-bold tabular-nums transition-[border-color,box-shadow] duration-150',
                    codeFocused && i - 1 === activeCell && !pending
                      ? 'border-primary-accent ring-3 ring-primary-soft'
                      : code[i - 1]
                        ? 'border-input'
                        : 'border-border',
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

            <Button
              type="submit"
              size="touch"
              class="h-12 text-[16px]"
              :disabled="pending || code.length !== OTP_LENGTH"
            >
              <RefreshCw v-if="pending" class="animate-spin" />
              {{ pending ? 'Memeriksa…' : 'Masuk' }}
            </Button>
            <p class="m-0 text-center text-meta text-muted-foreground">
              Tidak menerima kode?
              <button
                type="button"
                class="font-semibold text-primary-ink underline-offset-4 hover:underline disabled:font-normal disabled:text-muted-foreground disabled:no-underline"
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
          class="mt-4 flex items-start gap-1.5 rounded-xl bg-bad-soft px-3 py-2.5 text-meta text-bad"
        >
          <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
          {{ error }}
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Ganti langkah: geser sedikit + pudar, keluar lebih cepat dari masuk */
.step-enter-active {
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}
.step-leave-active {
  transition:
    opacity 120ms ease-in,
    transform 120ms ease-in;
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
