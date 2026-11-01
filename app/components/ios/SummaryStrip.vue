<script setup lang="ts">
// Ringkasan tiga kolom di bawah bar (mockup .strip): Pemasukan / Pengeluaran /
// Total, Aset / Liabilitas / Total, dst. Angka langsung berganti saat bulan
// berganti (tidak ikut bergeser bersama daftar).
defineProps<{
  items: readonly { label: string; value: string; tone?: 'inc' | 'exp' | 'ok' }[];
}>();
const TONE = { inc: 'text-inc', exp: 'text-exp', ok: 'text-ok' } as const;
</script>

<template>
  <div
    class="grid grid-cols-3 bg-card px-2 pb-2.5 pt-2 shadow-[0_0.5px_0_var(--sep)]"
    role="group"
  >
    <div v-for="i in items" :key="i.label" class="flex min-w-0 flex-col items-center gap-0.5">
      <small class="text-xs font-medium text-muted-foreground">{{ i.label }}</small>
      <b
        :class="[
          'max-w-full truncate text-body font-bold tracking-[-0.01em]',
          i.tone && TONE[i.tone],
        ]"
        >{{ i.value }}</b
      >
    </div>
  </div>
</template>
