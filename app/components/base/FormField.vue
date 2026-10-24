<script setup lang="ts">
// Label + isian + pesan error. Isian memakai kelas .field-input (effects.css).
defineProps<{ label: string; for: string; error?: string; hint?: string }>();
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label :for="$props.for" class="text-label font-semibold">{{ label }}</label>
    <slot />
    <p v-if="error" :id="`${$props.for}-error`" class="m-0 text-xs text-bad" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" class="m-0 text-xs text-faint">{{ hint }}</p>
  </div>
</template>
