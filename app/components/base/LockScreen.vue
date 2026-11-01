<script setup lang="ts">
import { Delete, LockKeyhole } from '@lucide/vue';
import IosButton from '@/components/ios/IosButton.vue';
import { MAX_ATTEMPTS, useLock } from '@/features/lock/useLock';

// Layar kunci PIN penuh gaya layar kunci iOS: titik di atas, tombol angka
// bulat 76px dengan huruf kecil di bawahnya; keyboard fisik juga bisa. PIN
// diperiksa otomatis setelah digit terakhir, salah = titik bergetar lalu
// kosong. Setelah 5 kali salah hanya bisa masuk ulang dengan kode email.
const lock = useLock();
const pin = ref('');
const checking = ref(false);
const wrong = ref(false);
const dots = ref<HTMLElement>();
const length = computed(() => lock.config.value?.length ?? 4);

async function press(digit: string) {
  if (checking.value || lock.tooMany.value || pin.value.length >= length.value) return;
  wrong.value = false;
  pin.value += digit;
  if (pin.value.length < length.value) return;
  checking.value = true;
  const ok = await lock.unlock(pin.value);
  checking.value = false;
  if (ok) {
    pin.value = '';
    return;
  }
  wrong.value = true;
  navigator.vibrate?.(80);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  dots.value?.animate(
    reduce
      ? [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }]
      : [0, -10, 9, -6, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 320, easing: 'ease-out' },
  );
  setTimeout(() => (pin.value = ''), 320);
}

function back() {
  if (!checking.value) pin.value = pin.value.slice(0, -1);
}

function onKey(event: KeyboardEvent) {
  if (/^\d$/.test(event.key)) press(event.key);
  else if (event.key === 'Backspace') back();
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const LETTERS: Record<string, string> = {
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
};
const left = computed(() => MAX_ATTEMPTS - lock.attempts.value);
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-background px-6 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lock-title"
  >
    <div class="flex flex-col items-center gap-2 text-center">
      <LockKeyhole class="size-7 text-muted-foreground" stroke-width="2" aria-hidden="true" />
      <h1 id="lock-title" class="m-0 text-sheet font-semibold tracking-[-0.02em]">Masukkan PIN</h1>
      <p
        :class="['m-0 min-h-5 text-meta', wrong ? 'text-exp' : 'text-muted-foreground']"
        aria-live="polite"
      >
        <template v-if="lock.tooMany.value"
          >Terlalu banyak salah. Masuk lagi dengan kode email.</template
        >
        <template v-else-if="wrong">PIN salah, sisa {{ left }} percobaan</template>
        <template v-else>Money Manager terkunci</template>
      </p>
    </div>

    <div ref="dots" class="flex gap-4" aria-hidden="true">
      <span
        v-for="i in length"
        :key="i"
        :class="[
          'size-[13px] rounded-full border-[1.5px]',
          i <= pin.length
            ? wrong
              ? 'border-transparent bg-[var(--exp)]'
              : 'border-transparent bg-foreground'
            : 'border-[var(--chevron)]',
        ]"
      />
    </div>
    <span class="sr-only" aria-live="polite">{{ pin.length }} dari {{ length }} digit</span>

    <div v-if="!lock.tooMany.value" class="grid grid-cols-3 gap-x-6 gap-y-4">
      <button
        v-for="k in KEYS"
        :key="k"
        type="button"
        class="lock-key flex size-[76px] flex-col items-center justify-center rounded-full bg-fill"
        @click="press(k)"
      >
        <span class="text-[32px] font-normal leading-none">{{ k }}</span>
        <span
          class="mt-0.5 h-3 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground"
          >{{ LETTERS[k] ?? '' }}</span
        >
      </button>
      <span />
      <button
        type="button"
        class="lock-key flex size-[76px] items-center justify-center rounded-full bg-fill"
        @click="press('0')"
      >
        <span class="text-[32px] font-normal leading-none">0</span>
      </button>
      <button
        type="button"
        class="lock-key grid size-[76px] place-items-center rounded-full text-foreground"
        aria-label="Hapus satu digit"
        @click="back"
      >
        <Delete class="size-7" stroke-width="1.8" aria-hidden="true" />
      </button>
    </div>

    <IosButton v-if="lock.tooMany.value" class="min-w-[240px]" @click="lock.forget()">
      Masuk dengan kode email
    </IosButton>
    <button
      v-else
      type="button"
      class="px-3 py-1.5 text-body text-primary-accent active:opacity-50"
      @click="lock.forget()"
    >
      Lupa PIN?
    </button>
  </div>
</template>

<style scoped>
/* Tekan: isian lebih gelap seketika, lepas memudar (seperti keypad iOS) */
.lock-key {
  transition: background-color 280ms ease-out;
}
.lock-key:active {
  background: var(--fill-press);
  transition: none;
}
</style>
