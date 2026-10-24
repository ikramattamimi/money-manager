<script setup lang="ts">
import { Plus } from '@lucide/vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import { formatRupiah, formatShort } from '@/lib/format';
import { ACCOUNTS, GROUP_STYLE } from '@/mocks/data';

definePageMeta({ layout: 'prototype' });

const groups = computed(() => {
  const by = new Map<string, typeof ACCOUNTS>();
  for (const a of ACCOUNTS) by.set(a.group, [...(by.get(a.group) ?? []), a]);
  return [...by.entries()].map(([name, list]) => ({
    name,
    list,
    sum: list.reduce((s, a) => s + a.balance, 0),
    ...GROUP_STYLE[name]!,
  }));
});
const assets = ACCOUNTS.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
const debts = ACCOUNTS.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
</script>

<template>
  <div>
    <PageHeader title="Akun" :summary="formatRupiah(assets + debts)">
      <template #actions>
        <HeaderButton><Plus aria-hidden="true" />Akun</HeaderButton>
      </template>
      <PageHero label="Aset bersih" :value="formatRupiah(assets + debts)" />
      <div class="flex flex-wrap gap-1.5">
        <StatChip label="Aset" :value="formatShort(assets)" tone="ok" />
        <StatChip label="Utang" :value="formatShort(debts)" tone="bad" />
      </div>
    </PageHeader>

    <!-- iPad dan desktop: grup akun 2 kolom -->
    <div class="md:columns-2 md:gap-3.5 [&>section]:break-inside-avoid">
      <ListGroup v-for="g in groups" :key="g.name" :label="g.name" :aside="formatRupiah(g.sum)">
        <ListRow
          v-for="a in g.list"
          :key="a.id"
          as="button"
          :title="a.name"
          :subtitle="g.name"
          :value="formatRupiah(a.balance)"
          :value-class="a.balance < 0 ? 'text-bad' : ''"
        >
          <template #lead><ToneIcon :icon="g.icon" :tone="g.tone" /></template>
        </ListRow>
      </ListGroup>
    </div>
  </div>
</template>
