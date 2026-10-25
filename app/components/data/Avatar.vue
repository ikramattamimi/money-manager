<script setup lang="ts">
import { cn } from '@/lib/utils';

// Foto profil bulat; tanpa foto (atau gagal dimuat) tampil inisial nama.
const props = withDefaults(
  defineProps<{
    name: string;
    url?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }>(),
  { url: null, size: 'md', class: '' },
);

const SIZE = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-24 text-2xl',
};
const failed = ref(false);
watch(
  () => props.url,
  () => (failed.value = false),
);
const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : props.name.slice(0, 2);
  return letters.toUpperCase() || '?';
});
</script>

<template>
  <span
    :class="
      cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft font-bold text-primary-ink',
        SIZE[props.size],
        props.class,
      )
    "
    aria-hidden="true"
  >
    <img
      v-if="url && !failed"
      :src="url"
      alt=""
      class="size-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <template v-else>{{ initials }}</template>
  </span>
</template>
