<script setup lang="ts">
import SectionHeader from './SectionHeader.vue';

// Grup iOS inset (mockup .grp): kartu putih radius 12px, 16px dari tepi.
// Isinya GroupRow; garis pemisah digambar oleh baris itu sendiri.
// `flush` = tanpa inset dan radius (daftar selebar layar).
// `wide` = selebar header halaman dengan sudut lurus (semua ukuran); judul
// grup ikut sejajar dengan isi kartu.
withDefaults(defineProps<{ label?: string; aside?: string; flush?: boolean; wide?: boolean }>(), {
  label: undefined,
  aside: undefined,
  flush: false,
  wide: false,
});
</script>

<template>
  <section>
    <SectionHeader v-if="label" :label="label" :aside="aside" :class="wide && 'px-4!'">
      <template v-if="$slots.aside" #aside><slot name="aside" /></template>
    </SectionHeader>
    <div :class="['overflow-hidden bg-card', !flush && !wide && 'mx-4 rounded-group']">
      <slot />
    </div>
  </section>
</template>
