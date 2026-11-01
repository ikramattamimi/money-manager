<script setup lang="ts">
import GroupRow from '@/components/ios/GroupRow.vue';

// Baris isian form gaya iOS (mockup label.row + input.fin): label di kiri,
// kontrol (input tanpa bingkai, tombol pilihan) di kanan, di dalam
// GroupedList. Pesan salah tampil merah di bawah label.
withDefaults(
  defineProps<{
    label: string;
    /** id kontrol di slot, supaya ketuk label memfokuskan input */
    for?: string;
    error?: string;
    /** Lebar kolom label (px) */
    labelWidth?: number;
  }>(),
  { for: undefined, error: '', labelWidth: 96 },
);
</script>

<template>
  <GroupRow>
    <span class="flex min-h-[34px] items-center gap-3">
      <label
        :for="$props.for"
        class="shrink-0 text-row font-medium tracking-[-0.01em]"
        :style="{ width: `${labelWidth}px` }"
        >{{ label }}</label
      >
      <span class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <slot />
      </span>
    </span>
    <span v-if="error" class="text-meta text-exp" role="alert">{{ error }}</span>
  </GroupRow>
</template>
