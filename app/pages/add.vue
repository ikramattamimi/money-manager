<script setup lang="ts">
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// /add?text=kopi%2025rb%20gopay — dibuka dari Shortcut iOS (tombol layar
// utama, Back Tap, atau Siri). Langsung pindah ke form catat dengan teks terisi;
// pakai replace supaya tombol Kembali tidak kembali ke sini.
definePageMeta({ layout: false });

const route = useRoute();
const editor = useTxEditor();
const ui = useQuickAddUi();
const { lg } = useBreakpoint();
const prefill = useState('tx:prefill', () => '');
const quickText = useState('qa:text', () => '');

onMounted(() => {
  const text = String(route.query.text ?? '').slice(0, 200);
  if (isPhoneWidth()) {
    // HP: halaman form penuh dengan kolom "Ketik saja" terisi
    prefill.value = text;
    editor.transaction.value = null;
    editor.draft.value = null;
    editor.session.value++;
    navigateTo('/transaction', { replace: true });
    return;
  }
  // iPad/desktop: panel catat cepat di halaman Transaksi
  quickText.value = text;
  if (lg.value) ui.focusTick.value++;
  else ui.open.value = true;
  navigateTo('/', { replace: true });
});
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-background text-meta text-muted-foreground">
    Membuka form catat…
  </div>
</template>
