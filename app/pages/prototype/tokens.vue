<script setup lang="ts">
import Card from '@/components/base/Card.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import StatChip from '@/components/layout/StatChip.vue';

// Katalog token (fase 3 T1): bandingkan dengan design/prototype.html di kedua tema.
definePageMeta({ layout: 'prototype' });

const GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Permukaan', tokens: ['background', 'card', 'surface-2', 'border', 'border-strong'] },
  { title: 'Teks', tokens: ['foreground', 'muted-foreground', 'faint'] },
  { title: 'Primer', tokens: ['primary', 'primary-accent', 'primary-ink', 'primary-soft'] },
  { title: 'Status', tokens: ['ok', 'ok-soft', 'warn', 'warn-soft', 'bad', 'bad-soft'] },
  { title: 'Kategori & grafik', tokens: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] },
];
const TYPE = [
  { cls: 'text-[30px] font-bold tracking-[-0.025em]', name: 'Angka utama 30/34px' },
  { cls: 'text-lg font-bold', name: 'Judul halaman 18/22px' },
  { cls: 'text-panel font-bold', name: 'Judul panel 15,5px' },
  { cls: 'text-label font-semibold', name: 'Judul baris 13,5px' },
  { cls: 'text-meta', name: 'Meta 13px' },
  { cls: 'text-xs text-muted-foreground', name: 'Keterangan 12px' },
  {
    cls: 'text-2xs font-semibold uppercase tracking-wider text-muted-foreground',
    name: 'Label grup 11px',
  },
];
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <PageHeader title="Token desain">
      <div class="flex flex-wrap gap-1.5">
        <StatChip label="Kaca" value="glass" />
        <StatChip label="Status" value="ok" tone="ok" />
        <StatChip label="Status" value="warn" tone="warn" />
        <StatChip label="Status" value="bad" tone="bad" />
      </div>
    </PageHeader>

    <Card v-for="g in GROUPS" :key="g.title" class="p-3.5">
      <b class="text-panel">{{ g.title }}</b>
      <div class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
        <div v-for="t in g.tokens" :key="t" class="flex items-center gap-2">
          <span class="size-8 shrink-0 rounded-lg border" :style="{ background: `var(--${t})` }" />
          <code class="truncate font-mono text-xs">{{ t }}</code>
        </div>
      </div>
    </Card>

    <Card class="flex flex-col gap-2 p-3.5">
      <b class="text-panel">Tipografi · DM Sans</b>
      <div
        v-for="t in TYPE"
        :key="t.name"
        class="flex items-baseline justify-between gap-3 border-t pt-2"
      >
        <span :class="['tabular-nums', t.cls]">Rp 6.891.312</span>
        <small class="text-xs text-faint">{{ t.name }}</small>
      </div>
    </Card>

    <Card class="grid gap-3 p-3.5 md:grid-cols-3">
      <div>
        <b class="text-panel">Radius</b>
        <div class="mt-2 flex gap-2">
          <span class="size-12 rounded-card border bg-surface-2" title="card 14px" />
          <span class="size-12 rounded-[10px] border bg-surface-2" title="kontrol besar 10px" />
          <span class="size-12 rounded-control border bg-surface-2" title="kontrol 8px" />
        </div>
      </div>
      <div>
        <b class="text-panel">Bayangan</b>
        <div class="mt-2 flex gap-3">
          <span class="size-12 rounded-card bg-card shadow-card" title="card" />
          <span class="size-12 rounded-card bg-card shadow-float" title="float" />
        </div>
      </div>
      <div>
        <b class="text-panel">Liquid Glass</b>
        <div class="mt-2 grid h-12 place-items-center rounded-card bg-grad-hero">
          <span class="lg rounded-full px-4 py-1.5 text-meta font-semibold"
            >tab bar / tombol +</span
          >
        </div>
      </div>
    </Card>
  </div>
</template>
