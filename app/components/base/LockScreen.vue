<script setup lang="ts">
import { Delete, LockKeyhole } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { MAX_ATTEMPTS, useLock } from '@/features/lock/useLock';

// Layar kunci PIN penuh (fase 11 T2). Keypad besar seperti layar kunci iOS;
// keyboard fisik juga bisa. PIN diperiksa otomatis setelah digit terakhir,
// salah = titik bergetar lalu kosong. Setelah 5 kali salah hanya bisa masuk
// ulang dengan kode email.
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
      <span
        class="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-accent"
      >
        <LockKeyhole class="size-6" aria-hidden="true" />
      </span>
      <h1 id="lock-title" class="m-0 text-panel font-bold">Masukkan PIN</h1>
      <p
        :class="['m-0 min-h-5 text-meta', wrong ? 'text-bad' : 'text-muted-foreground']"
        aria-live="polite"
      >
        <template v-if="lock.tooMany.value"
          >Terlalu banyak salah. Masuk lagi dengan kode email.</template
        >
        <template v-else-if="wrong">PIN salah, sisa {{ left }} percobaan</template>
        <template v-else>Money Manager terkunci</template>
      </p>
    </div>

    <div ref="dots" class="flex gap-3.5" aria-hidden="true">
      <span
        v-for="i in length"
        :key="i"
        :class="[
          'size-3.5 rounded-full border-2 transition-colors duration-100',
          i <= pin.length
            ? wrong
              ? 'border-bad bg-bad'
              : 'border-primary-accent bg-primary-accent'
            : 'border-input',
        ]"
      />
    </div>
    <span class="sr-only" aria-live="polite">{{ pin.length }} dari {{ length }} digit</span>

    <div v-if="!lock.tooMany.value" class="grid w-full max-w-[280px] grid-cols-3 gap-3">
      <button
        v-for="k in KEYS"
        :key="k"
        type="button"
        class="press grid aspect-square place-items-center rounded-full bg-surface-2 text-[26px] font-semibold tabular-nums hover:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="press(k)"
      >
        {{ k }}
      </button>
      <span />
      <button
        type="button"
        class="press grid aspect-square place-items-center rounded-full bg-surface-2 text-[26px] font-semibold tabular-nums hover:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="press('0')"
      >
        0
      </button>
      <button
        type="button"
        class="press grid aspect-square place-items-center rounded-full text-muted-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Hapus satu digit"
        @click="back"
      >
        <Delete class="size-6" aria-hidden="true" />
      </button>
    </div>

    <Button
      :variant="lock.tooMany.value ? 'default' : 'link'"
      :size="lock.tooMany.value ? 'touch' : 'default'"
      @click="lock.forget()"
    >
      {{ lock.tooMany.value ? 'Masuk dengan kode email' : 'Lupa PIN?' }}
    </Button>
  </div>
</template>
