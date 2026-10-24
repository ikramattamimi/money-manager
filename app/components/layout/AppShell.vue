<script setup lang="ts">
import AddButton from './AddButton.vue';
import AppSidebar, { type SidebarExtra } from './AppSidebar.vue';
import CompactTopBar from './CompactTopBar.vue';
import TabBar from './TabBar.vue';
import BottomSheet from '@/components/base/BottomSheet.vue';
import CenterDialog from '@/components/base/CenterDialog.vue';
import Toaster from '@/components/base/Toaster.vue';
import QuickAddPanel from '@/components/money/QuickAddPanel.vue';
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { NAV_ITEMS, navHref } from '@/lib/navigation';

// Kerangka aplikasi untuk tiga ukuran (lihat .ai/plans/mvp/fase-3-design.md):
// HP: tab bar bawah + tombol +, sheet catat transaksi.
// iPad: tab bar atas tengah + tombol +, dialog catat transaksi;
//       landscape (>= 1024px) panel catat inline di halaman Transaksi.
// Desktop (>= 1180px): sidebar, panel catat inline, pintasan N.
// Halaman digulir oleh window supaya bar ringkas dan safe area sederhana.
const props = withDefaults(
  defineProps<{
    base: string;
    bookName: string;
    userName: string;
    userRole: string;
    extras?: SidebarExtra[];
    /** false untuk peran viewer: tanpa tombol tambah, panel catat, dan pintasan N */
    canAdd?: boolean;
    /** Ada = tombol + di HP membuka ini (halaman form penuh), bukan sheet catat cepat */
    phoneAdd?: () => void;
  }>(),
  { extras: undefined, canAdd: true, phoneAdd: undefined },
);
const emit = defineEmits<{ logout: [] }>();

const route = useRoute();
const { md, lg } = useBreakpoint();
const ui = useQuickAddUi();
const panel = ref<InstanceType<typeof QuickAddPanel>>();

const txPath = navHref(props.base, NAV_ITEMS[0]!);
const active = computed(() => {
  const match = [...NAV_ITEMS]
    .reverse()
    .find((item) =>
      [item.path, ...(item.also ?? [])].some((p) => p && route.path.startsWith(props.base + p)),
    );
  return match?.key ?? 'tx';
});

/** Tombol +, tombol sidebar, dan pintasan N */
async function startQuickAdd() {
  if (!props.canAdd) return;
  if (!md.value && props.phoneAdd) {
    props.phoneAdd();
    return;
  }
  if (!lg.value) {
    ui.open.value = true;
    return;
  }
  // Layar lebar: panel inline di halaman Transaksi, cukup fokus ke inputnya
  if (route.path !== txPath) await navigateTo(txPath);
  ui.focusTick.value++;
}

function onKey(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  startQuickAdd();
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));

// Masuk ke layar lebar saat sheet terbuka: panel pindah ke kolom kanan
watch(lg, (wide) => {
  if (wide && ui.open.value) {
    ui.open.value = false;
    startQuickAdd();
  }
});
</script>

<template>
  <AppSidebar
    :base="base"
    :active="active"
    :book-name="bookName"
    :user-name="userName"
    :user-role="userRole"
    :extras="extras"
    :can-add="canAdd"
    @add="startQuickAdd"
    @logout="emit('logout')"
  />

  <main
    class="min-h-dvh px-3 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] pt-[calc(env(safe-area-inset-top,0px)+8px)] md:px-6 md:pb-12 md:pt-[calc(env(safe-area-inset-top,0px)+80px)] xl:pb-10 xl:pl-[calc(232px+28px)] xl:pr-7 xl:pt-5"
  >
    <div class="mx-auto max-w-[1120px]">
      <slot />
    </div>
  </main>

  <CompactTopBar />
  <TabBar :base="base" :active="active" />
  <AddButton v-if="canAdd" @press="startQuickAdd" />
  <Toaster />

  <template v-if="!lg && canAdd">
    <CenterDialog
      v-if="md"
      v-model:open="ui.open.value"
      labelledby="qa-title"
      @opened="nextTick(() => panel?.focus())"
    >
      <QuickAddPanel
        ref="panel"
        title-id="qa-title"
        @close="ui.open.value = false"
        @saved="ui.open.value = false"
      />
    </CenterDialog>
    <BottomSheet
      v-else
      v-model:open="ui.open.value"
      labelledby="qa-title"
      @opened="nextTick(() => panel?.focus())"
    >
      <QuickAddPanel
        ref="panel"
        title-id="qa-title"
        @close="ui.open.value = false"
        @saved="ui.open.value = false"
      />
    </BottomSheet>
  </template>
</template>
