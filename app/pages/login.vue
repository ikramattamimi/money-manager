<script setup lang="ts">
import { WalletIcon } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { OTP_LENGTH, authApi } from '@/features/auth/api';
import { safeNext } from '@/features/auth/redirect';

// Tampilan sementara memakai token fase 1. Dirapikan dengan komponen fase 3
// saat fase 4 dikerjakan.
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

let timer: ReturnType<typeof setInterval> | undefined;
onBeforeUnmount(() => clearInterval(timer));

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

function changeEmail() {
  step.value = 'email';
  error.value = '';
  code.value = '';
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-10">
    <header class="flex flex-col items-center gap-3 text-center">
      <WalletIcon class="size-12 text-primary" aria-hidden="true" />
      <h1 class="text-3xl font-bold tracking-tight">Money Manager</h1>
      <p v-if="step === 'email'" class="text-muted-foreground">
        Masukkan email. Kami kirim kode {{ OTP_LENGTH }} digit untuk masuk, tanpa password.
      </p>
      <p v-else class="text-muted-foreground">
        Kode dikirim ke <strong class="text-foreground">{{ email }}</strong
        >. Cek juga folder spam.
      </p>
    </header>

    <form v-if="step === 'email'" class="flex flex-col gap-4" @submit.prevent="sendCode">
      <label class="flex flex-col gap-2">
        <span class="text-sm font-medium">Email</span>
        <input
          v-model="email"
          type="email"
          name="email"
          inputmode="email"
          autocomplete="email"
          autocapitalize="off"
          spellcheck="false"
          required
          placeholder="nama@email.com"
          class="h-12 rounded-xl border border-input bg-card px-4 text-[17px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Button type="submit" size="lg" class="h-12 text-[17px]" :disabled="pending || !email">
        {{ pending ? 'Mengirim…' : 'Kirim kode' }}
      </Button>
    </form>

    <form v-else class="flex flex-col gap-4" @submit.prevent="verify">
      <label class="flex flex-col gap-2">
        <span class="text-sm font-medium">Kode masuk</span>
        <input
          ref="codeInput"
          :value="code"
          type="text"
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="OTP_LENGTH + 2"
          required
          :placeholder="'•'.repeat(OTP_LENGTH)"
          class="h-14 rounded-xl border border-input bg-card px-4 text-center text-3xl font-semibold tracking-[0.4em] tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          @input="onCodeInput"
        />
      </label>
      <Button
        type="submit"
        size="lg"
        class="h-12 text-[17px]"
        :disabled="pending || code.length !== OTP_LENGTH"
      >
        {{ pending ? 'Memeriksa…' : 'Masuk' }}
      </Button>
      <div class="flex items-center justify-between text-sm">
        <button type="button" class="text-primary" @click="changeEmail">Ganti email</button>
        <button
          type="button"
          class="text-primary disabled:text-muted-foreground"
          :disabled="resendIn > 0 || pending"
          @click="sendCode"
        >
          {{ resendIn > 0 ? `Kirim ulang (${resendIn})` : 'Kirim ulang kode' }}
        </button>
      </div>
    </form>

    <p
      v-if="error"
      role="alert"
      class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {{ error }}
    </p>
  </main>
</template>
