<script setup lang="ts">
import { useTxEditor } from '@/features/transactions/useTxEditor';

// /add?text=kopi%2025rb%20gopay — dibuka dari Shortcut iOS (tombol layar
// utama, Back Tap, atau Siri). Langsung pindah ke form catat dengan teks terisi;
// pakai replace supaya tombol Kembali tidak kembali ke sini.
definePageMeta({ layout: false });

const route = useRoute();
const editor = useTxEditor();
const prefill = useState('tx:prefill', () => '');

// Form mana pun membuka Ketik cepat berisi teks ini (tx:prefill)
onMounted(async () => {
  prefill.value = String(route.query.text ?? '').slice(0, 200) || ' ';
  if (isPhoneWidth()) {
    // HP: halaman form penuh
    editor.transaction.value = null;
    editor.draft.value = null;
    editor.session.value++;
    navigateTo('/transaction', { replace: true });
    return;
  }
  await navigateTo('/', { replace: true });
  // iPad portrait: sheet form; iPad landscape/desktop: dialog form
  editor.create();
});
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-background text-meta text-muted-foreground">
    Membuka form catat…
  </div>
</template>
