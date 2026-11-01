<script setup lang="ts">
import Card from '@/components/base/Card.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import StatChip from '@/components/layout/StatChip.vue';

// Katalog token (fase 3 T1): bandingkan dengan design/prototype.html di kedua tema.
definePageMeta({ layout: 'prototype' });

const IOS_TONES = ['blue', 'orange', 'green', 'amber', 'pink', 'purple', 'teal', 'indigo', 'red', 'gray'];
const GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Permukaan', tokens: ['background', 'card', 'surface-2', 'sep', 'border-strong'] },
  { title: 'Isian kontrol', tokens: ['fill', 'fill-2', 'fill-press', 'seg-on', 'chevron'] },
  { title: 'Teks', tokens: ['foreground', 'muted-foreground', 'faint', 'ter'] },
  { title: 'Aksen & nominal', tokens: ['primary', 'primary-accent', 'primary-soft', 'inc', 'exp'] },
  { title: 'Status', tokens: ['ok', 'ok-soft', 'warn', 'warn-soft', 'bad', 'bad-soft'] },
  { title: 'Nada ikon (solid)', tokens: IOS_TONES.map((t) => `tone-${t}`) },
  { title: 'Nada ikon (lembut)', tokens: IOS_TONES.map((t) => `tone-${t}-soft`) },
  { title: 'Papan angka', tokens: ['kb-bg', 'kb-head', 'kb-key', 'kb-fn', 'kb-shadow'] },
];
const TYPE = [
  { cls: 'text-large font-bold tracking-[-0.03em]', name: 'Judul besar 34px' },
  { cls: 'text-[32px] font-bold tracking-[-0.035em]', name: 'Angka utama 32px' },
  { cls: 'text-sheet font-bold tracking-[-0.02em]', name: 'Judul lembar 19px' },
  { cls: 'text-bar font-semibold tracking-[-0.02em]', name: 'Judul bar 17px' },
  { cls: 'text-row font-medium', name: 'Baris grup 16px' },
  { cls: 'text-body font-semibold', name: 'Nominal baris 15px' },
  { cls: 'text-meta text-muted-foreground', name: 'Keterangan 13px' },
  { cls: 'text-meta uppercase tracking-[0.02em] text-muted-foreground', name: 'Judul grup 13px' },
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
      <b class="text-panel">Tipografi · font sistem (SF / Inter)</b>
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
        <div
          class="mt-2 grid h-12 place-items-center rounded-card bg-[linear-gradient(120deg,var(--tone-orange),var(--tone-blue))]"
        >
          <span
            class="rounded-full border-[0.5px] border-[var(--glass-bar-line)] bg-[var(--glass-bar)] px-4 py-1.5 text-meta font-semibold backdrop-blur-[22px]"
            >tab bar / menu +</span
          >
        </div>
      </div>
    </Card>
  </div>
</template>
