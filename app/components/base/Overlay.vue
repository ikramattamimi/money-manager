<script setup lang="ts">
import BottomSheet from './BottomSheet.vue';
import CenterDialog from './CenterDialog.vue';

// Panel form: sheet dari bawah di HP, dialog di tengah mulai iPad.
const open = defineModel<boolean>('open', { required: true });
defineProps<{ labelledby: string }>();
const emit = defineEmits<{ opened: [] }>();
const { md } = useBreakpoint();
</script>

<template>
  <component
    :is="md ? CenterDialog : BottomSheet"
    v-model:open="open"
    :labelledby="labelledby"
    @opened="emit('opened')"
  >
    <slot />
  </component>
</template>
