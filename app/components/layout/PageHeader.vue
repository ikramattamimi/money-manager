<script setup lang="ts">
// Pita gradien di atas setiap halaman (Opnamix PageHeader): judul + alat di
// baris atas, lalu isi bebas (angka utama, chip statistik, segmented kaca).
// Saat pita tergulir keluar layar, CompactTopBar mengambil alih judulnya.
const props = defineProps<{ title: string; summary?: string }>();

const header = ref<HTMLElement>();
const compact = useCompactHeader();

let observer: IntersectionObserver | undefined;
onMounted(() => {
  compact.title.value = props.title;
  compact.summary.value = props.summary ?? '';
  observer = new IntersectionObserver(
    ([entry]) => (compact.visible.value = !entry!.isIntersecting),
    // Muncul tepat saat tepi bawah pita melewati bagian atas layar
    { rootMargin: '-20px 0px 0px 0px' },
  );
  if (header.value) observer.observe(header.value);
});
watch(
  () => props.summary,
  (value) => (compact.summary.value = value ?? ''),
);
onBeforeUnmount(() => {
  observer?.disconnect();
  compact.visible.value = false;
});
</script>

<template>
  <header
    ref="header"
    class="grad-stripes relative flex flex-col gap-2.5 overflow-hidden rounded-2xl bg-grad-hero px-3 pb-3 pt-2.5 text-on-grad md:gap-3 md:rounded-[18px] md:px-4 md:pb-4 md:pt-3.5 [&>*]:relative [&>*]:z-[1]"
  >
    <div class="flex min-h-8 items-center gap-2">
      <h1
        class="min-w-0 flex-1 truncate text-lg font-bold leading-tight tracking-tight md:text-[22px]"
      >
        {{ title }}
      </h1>
      <slot name="actions" />
    </div>
    <slot />
  </header>
</template>
