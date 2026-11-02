<script setup lang="ts" generic="T extends string">
// Sub-tab di bawah bar navigasi (mockup .subtabs/.st): teks abu, yang aktif
// hitam dengan garis aksen 2,5px. Pindah sub-tab tanpa animasi (dipakai
// puluhan kali sehari).
defineProps<{ options: readonly { value: T; label: string }[]; label: string }>();
const model = defineModel<T>({ required: true });
</script>

<template>
  <div role="tablist" :aria-label="label" class="flex px-1.5 shadow-[inset_0_-0.5px_0_var(--sep)]">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="tab"
      :aria-selected="model === o.value"
      class="relative h-11 flex-1 text-center text-[14px] font-semibold tracking-[-0.01em] text-muted-foreground aria-selected:text-foreground aria-selected:after:absolute aria-selected:after:inset-x-[18%] aria-selected:after:bottom-0 aria-selected:after:h-[2.5px] aria-selected:after:rounded-sm aria-selected:after:bg-primary-accent"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
