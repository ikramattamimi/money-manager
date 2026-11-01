<script setup lang="ts">
// Saklar iOS 51×31 (mockup .sw): kenop meluncur 220ms kurva drawer,
// warna latar 200ms. Reduce Motion: kenop langsung pindah.
defineProps<{ label: string }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :class="['ios-sw relative h-[31px] w-[51px] shrink-0 rounded-full', model && 'is-on']"
    @click="model = !model"
  />
</template>

<style scoped>
.ios-sw {
  background: var(--switch-off);
  transition: background-color 200ms ease;
}
.ios-sw.is-on {
  background: var(--switch-on);
}
.ios-sw::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 999px;
  background: var(--knob);
  box-shadow: var(--shadow-knob);
  transition: transform 220ms var(--ease-drawer);
}
.ios-sw.is-on::after {
  transform: translateX(20px);
}
@media (prefers-reduced-motion: reduce) {
  .ios-sw::after {
    transition: none;
  }
}
</style>
