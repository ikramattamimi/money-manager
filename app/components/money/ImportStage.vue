<script setup lang="ts">
import type { Component } from 'vue';

// Kartu tahap impor (mockup .impick): pilih file (ikon besar), membaca
// (spinner), menyimpan (bar progres), selesai (lingkaran hijau dengan
// centang yang digambar sekali: mmPop 460ms + mmDraw 380ms). Server tidak
// melaporkan progres, jadi bar merayap pelan ke 90% dan penuh saat selesai.
// Reduce Motion: centang langsung tampil, bar tanpa gerak.
withDefaults(
  defineProps<{
    state: 'pick' | 'reading' | 'saving' | 'done';
    title: string;
    text?: string;
    icon?: Component;
  }>(),
  { text: '', icon: undefined },
);
</script>

<template>
  <section
    class="mx-4 my-4 flex flex-col items-center gap-2.5 rounded-[20px] bg-card px-5 pb-6 pt-7 text-center"
    :aria-live="state === 'pick' ? undefined : 'polite'"
    :aria-busy="state === 'reading' || state === 'saving' || undefined"
  >
    <span
      v-if="state === 'pick' && icon"
      class="mb-1 grid size-16 place-items-center rounded-[18px] bg-ok-soft text-[var(--tone-green-ink)] [&_svg]:size-[30px]"
      aria-hidden="true"
    >
      <component :is="icon" stroke-width="1.9" />
    </span>
    <span v-else-if="state === 'reading'" class="imp-spin mb-1.5" aria-hidden="true" />
    <span
      v-else-if="state === 'done'"
      class="imp-ok mb-1 grid size-[72px] place-items-center rounded-full bg-ok-soft text-[var(--tone-green-ink)]"
      aria-hidden="true"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path class="imp-check" d="M5 12.5 10 17.5 19 7" />
      </svg>
    </span>

    <b class="text-sheet font-bold tracking-[-0.02em]">{{ title }}</b>
    <div
      v-if="state === 'saving'"
      class="my-1.5 h-2 w-full overflow-hidden rounded-full bg-fill"
      role="progressbar"
      :aria-label="title"
    >
      <i class="imp-prog block h-full rounded-full bg-primary" />
    </div>
    <p v-if="text" class="m-0 max-w-[320px] text-[14px] leading-[1.45] text-muted-foreground">
      {{ text }}
    </p>
    <slot />
  </section>
</template>

<style scoped>
.imp-spin {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid var(--fill-2);
  border-top-color: var(--primary-accent);
  animation: imp-spin 650ms linear infinite;
}
.imp-ok {
  animation: imp-pop 460ms var(--ease-spring);
}
.imp-check {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: imp-draw 380ms 180ms var(--ease-out) forwards;
}
.imp-prog {
  transform-origin: left center;
  transform: scaleX(0.9);
  transition: transform 9s var(--ease-out);
}
@starting-style {
  .imp-prog {
    transform: scaleX(0.04);
  }
}
@keyframes imp-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes imp-pop {
  from {
    transform: scale(0.86);
    opacity: 0;
  }
}
@keyframes imp-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  /* Animasi keyframe dimatikan global; centang harus tetap terlihat */
  .imp-check {
    stroke-dashoffset: 0;
  }
  .imp-prog {
    transition: none;
  }
  .imp-spin {
    animation: imp-spin 1.6s linear infinite !important;
  }
}
</style>
