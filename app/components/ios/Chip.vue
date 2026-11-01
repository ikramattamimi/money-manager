<script setup lang="ts">
// Chip bulat (mockup .chip): isian abu; `on` = aksen lembut, `danger` = merah
// lembut. Jadi tombol kalau ada @click, selain itu label statis.
const props = withDefaults(defineProps<{ on?: boolean; danger?: boolean; size?: 'sm' | 'lg' }>(), {
  on: false,
  danger: false,
  size: 'sm',
});
const attrs = useAttrs();
const tag = computed(() => (attrs.onClick ? 'button' : 'span'));
</script>

<template>
  <component
    :is="tag"
    :type="tag === 'button' ? 'button' : undefined"
    :aria-pressed="tag === 'button' && !props.danger ? props.on : undefined"
    :class="[
      'ios-chip inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold',
      props.size === 'lg' ? 'h-[38px] px-4 text-body' : 'h-[30px] px-[11px] text-meta',
      props.danger
        ? 'bg-bad-soft text-exp'
        : props.on
          ? 'bg-primary-soft text-primary-accent'
          : 'bg-fill text-foreground',
      tag === 'button' && 'active:scale-95',
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.ios-chip {
  transition: transform 120ms var(--ease-out);
}
</style>
