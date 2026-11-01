<script setup lang="ts">
import { FIELD_INPUT } from './field';

// Isian nominal di dalam FieldRow: tanpa bingkai, rata kanan, titik ribuan
// saat diketik ("25.000"), keyboard angka di HP. Pasangan AmountInput.
const model = defineModel<number>({ required: true });
// `label`: nama untuk pembaca layar kalau isian tidak punya <label for> sendiri
defineProps<{ id: string; invalid?: boolean; placeholder?: string; label?: string }>();

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
  <span class="text-row text-muted-foreground" aria-hidden="true">Rp</span>
  <input
    :id="id"
    :value="display"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    :placeholder="placeholder ?? '0'"
    :aria-label="label"
    :aria-invalid="invalid || undefined"
    :class="[FIELD_INPUT, 'font-semibold']"
    @input="onInput"
  />
</template>
