<script setup lang="ts">
import SectionHeader from '@/components/ios/SectionHeader.vue';

// Grup isian form gaya iOS (mockup .sh + .grp) untuk form yang tampil di
// FormPage (HP, latar abu → grup putih) maupun dialog (latar putih → grup abu).
// Tanpa margin samping: wadah form sudah memberi padding. `foot` = keterangan
// kecil di bawah grup (mockup .imfoot).
withDefaults(defineProps<{ label?: string; foot?: string; page?: boolean }>(), {
  label: undefined,
  foot: undefined,
  page: false,
});
</script>

<template>
  <section>
    <SectionHeader v-if="label" :label="label" class="px-4! pt-1!" />
    <div :class="['overflow-hidden rounded-group', page ? 'bg-card' : 'bg-background']">
      <slot />
    </div>
    <p
      v-if="foot || $slots.foot"
      class="mx-4 mb-0 mt-2 text-meta leading-[1.45] text-muted-foreground"
    >
      <slot name="foot">{{ foot }}</slot>
    </p>
  </section>
</template>
