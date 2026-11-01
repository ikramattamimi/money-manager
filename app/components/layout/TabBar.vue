<script setup lang="ts">
import { NAV_ITEMS, navHref } from '@/lib/navigation';
import { todayWib } from '@/features/stats/period';

// Tab bar Liquid Glass (mockup .tabbar/.tab). HP: pil mengambang di bawah,
// sisakan ruang kanan untuk tombol +; ikon di atas label, tab aktif berlatar
// aksen lembut. Tab Transaksi memakai ikon kalender berisi tanggal hari ini.
// iPad: di atas tengah, ikon dan label sebaris. Pindah tab tanpa animasi;
// ketuk tab aktif = gulir ke atas (R2 menambah "kembali ke hari ini").
const props = withDefaults(defineProps<{ base: string; active: string; withAdd?: boolean }>(), {
  withAdd: true,
});
const emit = defineEmits<{ retap: [key: string] }>();

const today = computed(() => Number(todayWib().slice(8, 10)));

function onTap(key: string) {
  if (key !== props.active) return;
  emit('retap', key);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
</script>

<template>
  <nav
    data-chrome
    aria-label="Navigasi utama"
    :class="withAdd ? 'right-[84px]' : 'right-3.5'"
    class="ios-tabbar fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-3.5 z-40 flex rounded-full p-1 md:bottom-auto md:left-1/2 md:right-auto md:top-[calc(env(safe-area-inset-top,0px)+14px)] md:w-[480px] md:-translate-x-1/2 xl:hidden"
  >
    <NuxtLink
      v-for="item in NAV_ITEMS"
      :key="item.key"
      :to="navHref(base, item)"
      :aria-current="item.key === active ? 'page' : undefined"
      class="ios-tab flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold text-[var(--tab-ink)] active:scale-[0.93] aria-[current=page]:bg-[var(--tab-on)] aria-[current=page]:text-primary-accent md:h-[42px] md:flex-row md:gap-1.5 md:text-meta [&_svg]:size-[22px] md:[&_svg]:size-[18px]"
      @click="onTap(item.key)"
    >
      <span
        v-if="item.key === 'tx'"
        class="grid h-[22px] w-6 place-items-center rounded-[5px] border-[1.8px] border-current text-[11px] font-extrabold tracking-[-0.03em] md:h-[18px] md:w-5 md:text-[10px]"
        aria-hidden="true"
        >{{ today }}</span
      >
      <component :is="item.icon" v-else stroke-width="2" aria-hidden="true" />
      {{ item.label }}
    </NuxtLink>
  </nav>
  <!-- Gradasi di bawah konten supaya teks tidak beradu dengan tab bar (mockup .edge) -->
  <div data-chrome class="ios-edge pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[130px] md:hidden" aria-hidden="true" />
</template>

<style scoped>
.ios-tabbar {
  background: var(--glass-bar);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 0.5px solid var(--glass-bar-line);
  box-shadow: var(--glass-bar-shadow);
}
.ios-tab {
  transition: transform 140ms var(--ease-out);
}
.ios-edge {
  background: linear-gradient(to top, var(--edge-fade) 35%, var(--edge-fade-0));
}
@media (prefers-reduced-transparency: reduce) {
  .ios-tabbar {
    background: var(--card);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
