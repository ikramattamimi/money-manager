<script setup lang="ts" generic="T extends string">
// Segmented control iOS (mockup .seg): wadah isian, pilihan aktif jadi
// "pil" putih berbayang. Ganti pilihan tanpa animasi.
defineProps<{ options: readonly { value: T; label: string }[]; label: string }>();
const model = defineModel<T>({ required: true });
</script>

<template>
  <div role="group" :aria-label="label" class="flex rounded-[9px] bg-fill p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      class="h-[30px] min-w-0 flex-1 truncate rounded-[7px] px-1 text-center text-label font-semibold aria-pressed:bg-[var(--seg-on)] aria-pressed:shadow-[var(--shadow-seg)]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
