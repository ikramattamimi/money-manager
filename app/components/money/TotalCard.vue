<script setup lang="ts">
// Kartu total akun di halaman Akun (mockup .totcard): nama, saldo, keterangan.
// `on` = total yang tampil di Transaksi (hanya ditandai di keterangan, tanpa garis/warna aksen
// supaya tidak terbaca sebagai kartu yang sedang aktif).
// `add` = kartu bergaris putus "+ Total baru". Tekan mengecil 0,97 (140ms).
// `selected` = total yang sedang memfilter chart dan daftar akun (latar lembut aksen).
withDefaults(
  defineProps<{
    name: string;
    value?: string;
    caption?: string;
    on?: boolean;
    add?: boolean;
    selected?: boolean;
  }>(),
  { value: undefined, caption: undefined, on: false, add: false, selected: false },
);
</script>

<template>
  <button
    type="button"
    :aria-pressed="add ? undefined : selected"
    :class="[
      'total-card flex min-h-[84px] shrink-0 flex-col justify-center gap-0.5 rounded-[14px] px-[13px] py-3 text-left active:scale-[0.97]',
      add ? 'w-[120px] shadow-[inset_0_0_0_1.5px_var(--chevron)]' : 'w-[150px]',
      !add && (selected ? 'bg-primary-soft' : 'bg-card'),
    ]"
  >
    <small
      :class="[
        'truncate text-note font-semibold',
        add || selected ? 'text-primary-accent' : 'text-muted-foreground',
      ]"
      >{{ name }}</small
    >
    <b v-if="value" class="truncate text-body font-bold tracking-[-0.025em]">{{ value }}</b>
    <span v-if="caption" class="truncate text-2xs text-muted-foreground">{{ caption }}</span>
  </button>
</template>

<style scoped>
.total-card {
  transition: transform 140ms var(--ease-out);
}
@media (prefers-reduced-motion: reduce) {
  .total-card {
    transition: none;
  }
}
</style>
