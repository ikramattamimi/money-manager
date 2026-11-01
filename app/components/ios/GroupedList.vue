<script setup lang="ts">
import SectionHeader from './SectionHeader.vue';

// Grup iOS inset (mockup .grp): kartu putih radius 12px, 16px dari tepi.
// Isinya GroupRow; garis pemisah digambar oleh baris itu sendiri.
// `flush` = tanpa inset dan radius (daftar selebar layar).
withDefaults(defineProps<{ label?: string; aside?: string; flush?: boolean }>(), {
  label: undefined,
  aside: undefined,
  flush: false,
});
</script>

<template>
  <section>
    <SectionHeader v-if="label" :label="label" :aside="aside">
      <template v-if="$slots.aside" #aside><slot name="aside" /></template>
    </SectionHeader>
    <div :class="['overflow-hidden bg-card', flush ? '' : 'mx-4 rounded-group']">
      <slot />
    </div>
  </section>
</template>
