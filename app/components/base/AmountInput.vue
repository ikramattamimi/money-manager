<script setup lang="ts">
// Isian nominal rupiah: hanya angka, ditampilkan dengan titik ribuan saat
// diketik ("25.000"). Keyboard angka di HP.
const model = defineModel<number>({ required: true });
defineProps<{ id: string; invalid?: boolean; placeholder?: string }>();

const display = computed(() => (model.value ? model.value.toLocaleString('id-ID') : ''));

function onInput(event: Event) {
  const el = event.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, '').slice(0, 13);
  model.value = Number(digits) || 0;
  // Tulis ulang supaya format titik langsung terlihat
  el.value = display.value;
}
</script>

<template>
  <div class="relative">
    <span
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground"
      >Rp</span
    >
    <input
      :id="id"
      :value="display"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="placeholder ?? '0'"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? `${id}-error` : undefined"
      class="field-input pl-10 font-semibold tabular-nums"
      @input="onInput"
    />
  </div>
</template>
