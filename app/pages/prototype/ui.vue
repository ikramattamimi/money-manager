<script setup lang="ts">
import { Coffee, Inbox, Plus, Search, Tag, Wallet } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import ChoiceChip from '@/components/data/ChoiceChip.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import KpiStrip from '@/components/data/KpiStrip.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import Meter from '@/components/data/Meter.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import SettingRow from '@/components/data/SettingRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import type { Tone } from '@/components/data/tone';

// Katalog komponen (fase 3 T3) dalam semua state: normal, ditekan, nonaktif,
// kosong, memuat. Ganti tema dari Lainnya untuk memeriksa mode gelap.
definePageMeta({ layout: 'prototype' });

const toast = useToast();
const seg = ref<'a' | 'b' | 'c'>('a');
const TONES: Tone[] = [
  'primary',
  'ok',
  'warn',
  'bad',
  'neutral',
  'r1',
  'r2',
  'r3',
  'r4',
  'r5',
  'r6',
];
const VARIANTS = [
  'default',
  'secondary',
  'soft',
  'outline',
  'ghost',
  'ghost-danger',
  'destructive',
  'link',
] as const;
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <PageHeader title="Komponen">
      <template #actions>
        <HeaderButton label="Cari"><Search aria-hidden="true" /></HeaderButton>
        <HeaderButton><Plus aria-hidden="true" />Tambah</HeaderButton>
      </template>
      <SegmentedControl
        v-model="seg"
        :options="[
          { value: 'a', label: 'Harian' },
          { value: 'b', label: 'Kalender' },
          { value: 'c', label: 'Bulanan' },
        ]"
        label="Contoh segmented kaca"
        variant="on-grad"
      />
    </PageHeader>

    <Card class="flex flex-col gap-3 p-3.5">
      <b class="text-panel">Tombol</b>
      <div class="flex flex-wrap gap-2">
        <Button v-for="v in VARIANTS" :key="v" :variant="v">{{ v }}</Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm">sm</Button>
        <Button>default</Button>
        <Button size="lg">lg</Button>
        <Button size="touch">touch 44px</Button>
        <Button disabled>nonaktif</Button>
        <Button size="icon" variant="secondary" aria-label="Tambah"><Plus /></Button>
      </div>
      <div class="flex flex-wrap gap-2 rounded-card bg-grad-hero p-3">
        <Button variant="light">light</Button>
        <Button variant="glass">glass</Button>
        <Button variant="glass" aria-pressed="true">glass ditekan</Button>
      </div>
    </Card>

    <Card class="flex flex-col gap-3 p-3.5">
      <b class="text-panel">Segmented, chip, ikon bernada</b>
      <SegmentedControl
        v-model="seg"
        :options="[
          { value: 'a', label: 'Pengeluaran' },
          { value: 'b', label: 'Pemasukan' },
          { value: 'c', label: 'Transfer' },
        ]"
        label="Contoh segmented"
      />
      <div class="flex flex-wrap gap-1.5">
        <ChoiceChip :icon="Wallet" label="GoPay" filled />
        <ChoiceChip :icon="Tag" label="Kategori" />
      </div>
      <div class="flex flex-wrap gap-2">
        <ToneIcon v-for="t in TONES" :key="t" :icon="Coffee" :tone="t" />
      </div>
    </Card>

    <Card class="flex flex-col gap-3 p-3.5">
      <b class="text-panel">Angka</b>
      <KpiStrip
        :items="[
          { label: 'Masuk', value: 'Rp 9,06 jt', tone: 'primary' },
          { label: 'Keluar', value: 'Rp 2,17 jt', tone: 'bad' },
          { label: 'Sisa', value: 'Rp 6,89 jt', note: '76% dari pemasukan' },
        ]"
      />
      <Meter :value="0.35" tone="ok" label="Aman" />
      <Meter :value="0.86" tone="warn" label="Hampir habis" />
      <Meter :value="1" tone="bad" label="Lewat" />
    </Card>

    <ListGroup label="Baris transaksi" aside="geser kiri untuk hapus">
      <TransactionRow
        :icon="Coffee"
        tone="r2"
        title="Point Coffee"
        subtitle="Kopi · GoPay"
        amount="−Rp 18.000"
        kind="expense"
        meta="08.12"
        deletable
        @delete="toast.show('Contoh: dihapus', () => {})"
      />
      <TransactionRow
        :icon="Wallet"
        tone="r3"
        title="Gaji September"
        subtitle="Gaji · BCA"
        amount="+Rp 7.500.000"
        kind="income"
        meta="09.00"
      />
    </ListGroup>

    <div class="grid gap-3.5 md:grid-cols-2">
      <Card class="p-1">
        <CardHead title="Memuat" />
        <Skeleton :rows="3" />
      </Card>
      <Card>
        <EmptyState
          :icon="Inbox"
          title="Belum ada transaksi"
          description="Catat pengeluaran pertama dengan tombol +."
        >
          <Button variant="soft" @click="toast.show('Contoh toast dengan Urungkan', () => {})"
            >Tampilkan toast</Button
          >
        </EmptyState>
      </Card>
    </div>

    <Card class="p-1">
      <SettingRow
        :icon="Wallet"
        tone="primary"
        title="Baris pengaturan"
        subtitle="Dengan keterangan"
      />
      <SettingRow :icon="Wallet" title="Varian bahaya" danger />
    </Card>
  </div>
</template>
