<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';

// Bar navigasi iOS (mockup .nav/.navrow): latar kartu solid, kembali berlabel
// di kiri, judul tengah, aksi kanan. Slot default = baris di bawahnya
// (navigasi bulan, sub-tab). `large` = judul besar 34px.
// Tinggi: safe area atas + 44px baris.
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Label tombol kembali (mis. "Akun"); ada = tombol kembali tampil */
    back?: string;
    /** Tujuan kembali kalau tidak ada riwayat (dibuka langsung dari tautan) */
    backTo?: string;
    /** Garis tipis di bawah bar */
    line?: boolean;
    large?: boolean;
  }>(),
  { title: '', back: undefined, backTo: '/', line: false, large: false },
);
const emit = defineEmits<{ back: [] }>();
const attrs = useAttrs();
const router = useRouter();

function goBack() {
  // Pemakai bisa mengganti perilaku (mis. menutup modal) dengan @back
  if (attrs.onBack) return emit('back');
  if (window.history.state?.back) router.back();
  else navigateTo(props.backTo, { replace: true });
}
</script>

<template>
  <header
    :class="[
      'relative z-[4] shrink-0 bg-card pt-[env(safe-area-inset-top,0px)]',
      line && 'shadow-[0_0.5px_0_var(--sep)]',
    ]"
  >
    <div class="flex h-11 items-center px-1">
      <div :class="['flex items-center', $slots.center ? 'min-w-11' : 'min-w-[88px]']">
        <button
          v-if="back"
          type="button"
          class="ios-back flex h-11 max-w-[140px] items-center gap-0.5 pl-1 pr-2 text-bar text-primary-accent active:opacity-50"
          @click="goBack"
        >
          <ChevronLeft class="size-[26px] shrink-0 -ml-1" stroke-width="2.4" aria-hidden="true" />
          <span class="truncate">{{ back }}</span>
        </button>
        <slot name="left" />
      </div>
      <!-- #center menggantikan judul (mis. navigasi bulan); judul tetap ada untuk pembaca layar -->
      <template v-if="$slots.center">
        <h1 class="sr-only">{{ title }}</h1>
        <slot name="center" />
      </template>
      <h1
        v-else-if="!large"
        class="min-w-0 flex-1 truncate text-center text-bar font-semibold tracking-[-0.02em]"
      >
        <slot name="title">{{ title }}</slot>
      </h1>
      <span v-else class="flex-1" />
      <div :class="['flex items-center justify-end', $slots.center ? 'min-w-11' : 'min-w-[88px]']">
        <slot name="right" />
      </div>
    </div>
    <h1 v-if="large" class="px-4 pb-2 pt-0.5 text-large font-bold tracking-[-0.03em]">
      {{ title }}
    </h1>
    <slot />
  </header>
</template>
