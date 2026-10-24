<script setup lang="ts">
// Saklar on/off dengan label dan keterangan. Elemen aslinya checkbox
// (role="switch"), jadi bisa dioperasikan keyboard dan pembaca layar.
const model = defineModel<boolean>({ required: true });
defineProps<{ id: string; label: string; description?: string }>();
</script>

<template>
  <label :for="id" class="flex cursor-pointer items-center gap-3 rounded-[10px] py-1">
    <span class="min-w-0 flex-1">
      <b class="block text-label font-semibold">{{ label }}</b>
      <small v-if="description" class="block text-xs text-muted-foreground">{{
        description
      }}</small>
    </span>
    <input :id="id" v-model="model" type="checkbox" role="switch" class="peer sr-only" />
    <span
      aria-hidden="true"
      class="relative h-7 w-12 shrink-0 rounded-full bg-border-strong transition-colors duration-150 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow-card after:transition-transform after:duration-200 after:ease-out peer-checked:after:translate-x-5"
    />
  </label>
</template>
