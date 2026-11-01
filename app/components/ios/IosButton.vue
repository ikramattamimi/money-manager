<script setup lang="ts">
// Tombol besar iOS (mockup .btn): 50px, radius 14px, 17px semibold.
// Varian: primary (isi aksen), soft (aksen lembut), gray, red (merah lembut).
// Tekan mengecil 0,97 (160ms ease-out).
withDefaults(
  defineProps<{
    variant?: 'primary' | 'soft' | 'gray' | 'red';
    block?: boolean;
    type?: 'button' | 'submit';
    to?: string;
  }>(),
  { variant: 'primary', block: false, type: 'button', to: undefined },
);
const NuxtLink = resolveComponent('NuxtLink');

const VARIANT = {
  primary: 'bg-primary text-primary-foreground',
  soft: 'bg-primary-soft text-primary-accent',
  gray: 'bg-fill-2 text-foreground',
  red: 'bg-bad-soft text-exp',
} as const;
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :class="[
      'ios-btn inline-flex h-[50px] items-center justify-center gap-1.5 rounded-[14px] px-[18px] text-bar font-semibold tracking-[-0.01em] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5',
      VARIANT[variant],
      block && 'w-full',
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.ios-btn {
  transition:
    transform 160ms var(--ease-out),
    opacity 150ms ease;
}
</style>
