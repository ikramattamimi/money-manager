<script setup lang="ts">
import { NAV_ITEMS, navHref } from '@/lib/navigation';

// Tab bar Liquid Glass. HP: mengambang di bawah, ikon di atas label.
// iPad: mengambang di atas tengah, ikon dan label sebaris (gaya iPadOS).
// Lensa meluncur ke tab aktif (220ms, kurva drawer); pindah halaman sendiri
// tanpa animasi. Tap tab aktif = gulir ke atas.
const props = defineProps<{ base: string; active: string }>();

const bar = ref<HTMLElement>();
const lensStyle = ref<Record<string, string>>({});
const instant = ref(true);

function placeLens() {
  const btn = bar.value?.querySelector<HTMLElement>(`[data-key="${props.active}"]`);
  if (!btn || !btn.offsetWidth) return;
  lensStyle.value = {
    width: `${btn.offsetWidth}px`,
    transform: `translateX(${btn.offsetLeft - 4}px)`,
  };
}

watch(
  () => props.active,
  () => {
    instant.value = false;
    nextTick(placeLens);
  },
);
let resize: ResizeObserver | undefined;
onMounted(() => {
  placeLens();
  resize = new ResizeObserver(() => {
    instant.value = true;
    placeLens();
  });
  if (bar.value) resize.observe(bar.value);
});
onBeforeUnmount(() => resize?.disconnect());

function onTap(key: string) {
  if (key !== props.active) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
</script>

<template>
  <nav
    ref="bar"
    aria-label="Navigasi utama"
    class="lg fixed bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] left-3 right-3 z-40 grid h-15.5 grid-cols-4 rounded-[31px] p-1 md:bottom-auto md:left-1/2 md:right-auto md:top-[calc(env(safe-area-inset-top,0px)+14px)] md:h-12.5 md:w-[460px] md:-translate-x-1/2 md:rounded-[25px] xl:hidden"
  >
    <span
      :class="[
        'absolute bottom-1 left-1 top-1 rounded-[27px] bg-primary-accent/12 md:rounded-[21px]',
        !instant && 'transition-transform duration-[220ms] ease-[var(--ease-drawer)]',
      ]"
      :style="lensStyle"
      aria-hidden="true"
    />
    <NuxtLink
      v-for="item in NAV_ITEMS"
      :key="item.key"
      :to="navHref(base, item)"
      :data-key="item.key"
      :aria-current="item.key === active ? 'page' : undefined"
      class="press relative z-[1] grid content-center justify-items-center gap-0.5 rounded-[27px] text-[10.5px] font-semibold text-muted-foreground aria-[current=page]:text-primary-accent md:flex md:items-center md:justify-center md:gap-1.5 md:rounded-[21px] md:text-label [&_svg]:size-5.5 md:[&_svg]:size-4.5"
      @click="onTap(item.key)"
    >
      <component :is="item.icon" aria-hidden="true" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
