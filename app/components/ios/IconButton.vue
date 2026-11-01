<script setup lang="ts">
// Tombol ikon 44px di bar navigasi (mockup .ib). Tekan: mengecil 0,9 dengan
// latar isian, 120ms ease-out. `accent` = warna aksen (aksi utama bar).
withDefaults(defineProps<{ label: string; accent?: boolean; to?: string }>(), {
  accent: false,
  to: undefined,
});
const NuxtLink = resolveComponent('NuxtLink');
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :type="to ? undefined : 'button'"
    :to="to"
    :aria-label="label"
    :class="[
      'ios-ib grid size-11 shrink-0 place-items-center rounded-xl active:scale-90 active:bg-fill-press [&_svg]:size-[22px]',
      accent ? 'text-primary-accent' : 'text-foreground',
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.ios-ib {
  transition: transform 120ms var(--ease-out);
}
</style>
