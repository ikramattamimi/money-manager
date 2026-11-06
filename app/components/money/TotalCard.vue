<script setup lang="ts">
// Kartu total akun di halaman Akun (mockup .totcard): nama, saldo, keterangan.
// `on` = total yang tampil di Transaksi (nama beraksen dan bergaris aksen).
// `add` = kartu bergaris putus "+ Total baru". Tekan mengecil 0,97 (140ms).
withDefaults(
  defineProps<{ name: string; value?: string; caption?: string; on?: boolean; add?: boolean }>(),
  { value: undefined, caption: undefined, on: false, add: false },
);
</script>

<template>
  <button
    type="button"
    :aria-pressed="add ? undefined : on"
    :class="[
      'total-card flex min-h-[84px] shrink-0 flex-col justify-center gap-0.5 rounded-[14px] px-[13px] py-3 text-left active:scale-[0.97]',
      add ? 'w-[120px] shadow-[inset_0_0_0_1.5px_var(--chevron)]' : 'w-[150px] bg-card',
      on && 'shadow-[inset_0_0_0_1.5px_var(--primary-accent)]',
    ]"
  >
    <small
      :class="[
        'truncate text-note font-semibold',
        on || add ? 'text-primary-accent' : 'text-muted-foreground',
      ]"
      >{{ name }}</small
    >
    <b v-if="value" class="truncate text-sheet font-bold tracking-[-0.025em]">{{ value }}</b>
    <span v-if="caption" class="truncate text-xs text-muted-foreground">{{ caption }}</span>
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
