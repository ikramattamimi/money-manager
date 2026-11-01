<script setup lang="ts">
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';

// Katalog token (redesign R1): bandingkan dengan design/ios/ios.css di kedua
// tema. Ganti tema dari Lainnya → Gaya & warna atau sidebar desktop.
definePageMeta({ layout: 'prototype' });

const IOS_TONES = [
  'blue',
  'orange',
  'green',
  'amber',
  'pink',
  'purple',
  'teal',
  'indigo',
  'red',
  'gray',
];
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
];
</script>

<template>
  <div class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] pb-10 md:mx-0 md:mt-0">
    <NavBar title="Token desain" line class="sticky top-0 md:static" />

    <GroupedList v-for="g in GROUPS" :key="g.title" :label="g.title">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 p-4">
        <div v-for="t in g.tokens" :key="t" class="flex items-center gap-2">
          <span
            class="size-8 shrink-0 rounded-lg shadow-[inset_0_0_0_0.5px_var(--sep)]"
            :style="{ background: `var(--${t})` }"
          />
          <code class="truncate font-mono text-xs">{{ t }}</code>
        </div>
      </div>
    </GroupedList>

    <GroupedList label="Tipografi · font sistem (SF / Inter)">
      <div
        v-for="t in TYPE"
        :key="t.name"
        class="flex items-baseline justify-between gap-3 px-4 py-2.5 shadow-[inset_0_-0.5px_0_var(--sep)] last:shadow-none"
      >
        <span :class="t.cls">Rp6.891.312</span>
        <small class="shrink-0 text-xs text-muted-foreground">{{ t.name }}</small>
      </div>
    </GroupedList>

    <GroupedList label="Kaca (hanya lapisan melayang)">
      <div
        class="m-4 grid h-14 place-items-center rounded-card bg-[linear-gradient(120deg,var(--tone-orange),var(--tone-blue))]"
      >
        <span
          class="rounded-full border-[0.5px] border-[var(--glass-bar-line)] bg-[var(--glass-bar)] px-4 py-1.5 text-meta font-semibold backdrop-blur-[22px]"
          >tab bar / menu +</span
        >
      </div>
    </GroupedList>
  </div>
</template>
