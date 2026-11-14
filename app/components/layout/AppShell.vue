<script setup lang="ts">
import AddButton, { type QuickAction } from './AddButton.vue';
import IosAlert from '@/components/ios/IosAlert.vue';
import AppSidebar, { type SidebarExtra } from './AppSidebar.vue';
import TabBar from './TabBar.vue';
import Toaster from '@/components/base/Toaster.vue';
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { NAV_ITEMS, navHref } from '@/lib/navigation';

// Kerangka aplikasi untuk tiga ukuran (lihat .ai/plans/mvp/fase-3-design.md):
// HP: tab bar bawah + tombol +, halaman form catat.
// iPad: tab bar bawah tengah + tombol +, sheet form catat;
//       landscape (>= 1024px) kartu Catat di halaman Transaksi.
// Desktop (>= 1180px): sidebar, kartu Catat, pintasan N.
// Halaman digulir oleh window supaya bar ringkas dan safe area sederhana.
const props = withDefaults(
  defineProps<{
    base: string;
    bookName: string;
    userName: string;
    userAvatar?: string | null;
    userRole: string;
    extras?: SidebarExtra[];
    /** false untuk peran viewer: tanpa tombol tambah, panel catat, dan pintasan N */
    canAdd?: boolean;
    /** Ada = tombol + di HP membuka ini (halaman form penuh), bukan sheet catat cepat */
    phoneAdd?: () => void;
  }>(),
  { extras: undefined, canAdd: true, phoneAdd: undefined, userAvatar: null },
);
const emit = defineEmits<{ logout: [] }>();

const route = useRoute();
const { md, lg } = useBreakpoint();
const ui = useQuickAddUi();
const editor = useTxEditor();

const txPath = navHref(props.base, NAV_ITEMS[0]!);
const active = computed(() => {
  const match = [...NAV_ITEMS]
    .reverse()
    .find((item) =>
      [item.path, ...(item.also ?? [])].some((p) => p && route.path.startsWith(props.base + p)),
    );
  return match?.key ?? 'tx';
});

// Tombol + selalu di samping tab bar seperti mockup (semua tab).
// Disembunyikan saat memilih banyak (transaksi, akun): bilah aksi ada di tempat yang sama
const txSelecting = useState('ui:selecting', () => false);
const showAdd = computed(() => props.canAdd && !txSelecting.value);

/**
 * Ketuk ulang tab aktif = kembali ke bulan ini. Penghitung per tab
 * (`nav:retap:<key>`) didengar halamannya: Transaksi, Statistik, Akun.
 */
const retapState = (key: string) => useState(`nav:retap:${key}`, () => 0);
const retaps = Object.fromEntries(NAV_ITEMS.map((i) => [i.key, retapState(i.key)]));
function onRetap(key: string) {
  const counter = retaps[key];
  if (counter) counter.value++;
}

/** Menu tahan tombol +: Ketik cepat membuka form dengan Ketik cepat terfokus, sisanya halaman impor/bookmark */
const QUICK_PATH: Record<Exclude<QuickAction, 'quick'>, string> = {
  bookmark: '/bookmarks',
  bank: '/settings/import/bank',
  photo: '/settings/import/photo',
};
function onQuick(action: QuickAction) {
  if (action === 'quick') {
    startQuickAdd(true);
    return;
  }
  navigateTo(props.base + QUICK_PATH[action]);
}

/** Tombol +, tombol sidebar, dan pintasan N. `quick` = langsung ke Ketik cepat */
const quickRequest = useState('tx:quick', () => false);
async function startQuickAdd(quick = false) {
  if (!props.canAdd) return;
  if (!lg.value) quickRequest.value = quick;
  if (!md.value && props.phoneAdd) {
    props.phoneAdd();
    return;
  }
  // iPad tanpa kolom kanan: form catat baru (sheet portrait)
  if (!lg.value) {
    editor.create();
    return;
  }
  // Layar lebar: kartu Catat di halaman Transaksi, buka Ketik cepat di sana
  if (route.path !== txPath) await navigateTo(txPath);
  ui.focusTick.value++;
}

function onKey(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  startQuickAdd(true);
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));

</script>

<template>
  <AppSidebar
    :base="base"
    :active="active"
    :book-name="bookName"
    :user-name="userName"
    :user-avatar="userAvatar"
    :user-role="userRole"
    :extras="extras"
    :can-add="canAdd"
    @add="startQuickAdd()"
    @logout="emit('logout')"
  />

  <main
    data-page-stage
    class="min-h-dvh bg-background px-3 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] pt-[calc(env(safe-area-inset-top,0px)+8px)] md:px-6 md:pt-[calc(env(safe-area-inset-top,0px)+16px)] xl:pb-10 xl:pl-[calc(232px+28px)] xl:pr-7 xl:pt-5"
  >
    <div class="mx-auto max-w-[1120px]">
      <slot />
    </div>
  </main>

  <TabBar :base="base" :active="active" :with-add="showAdd" @retap="onRetap" />
  <AddButton v-if="showAdd" @press="startQuickAdd()" @quick="onQuick" />
  <Toaster />
  <IosAlert />
</template>
