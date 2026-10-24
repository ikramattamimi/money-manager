<script setup lang="ts">
import { ArrowLeft, Copy, Hand, Mic, Smartphone } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';

// Panduan Shortcut iOS: Siri, Back Tap, dan tombol layar utama membuka
// /add?text=... sehingga satu kalimat langsung jadi isian catat transaksi.
definePageMeta({ layout: 'app' });
useHead({ title: 'Shortcut iPhone · Money Manager' });

const toast = useToast();
const origin = import.meta.client ? window.location.origin : '';
const url = `${origin}/add?text=`;

async function copy() {
  try {
    await navigator.clipboard.writeText(url);
    toast.show('Alamat disalin');
  } catch {
    // Clipboard hanya ada di HTTPS; di alamat lokal pilih teksnya manual
    toast.show('Tidak bisa menyalin otomatis. Tekan lama alamatnya untuk menyalin.');
  }
}

const STEPS = [
  'Buka app Pintasan (Shortcuts), ketuk + untuk pintasan baru.',
  'Tambah tindakan "Dikte Teks" (untuk Siri) atau "Minta Input" jenis Teks (untuk mengetik).',
  'Tambah tindakan "URL", tempel alamat di bawah, lalu sisipkan variabel hasil Dikte Teks / Input di ujungnya.',
  'Tambah tindakan "Buka URL".',
  'Beri nama "Catat pengeluaran". Nama ini juga jadi perintah Siri.',
];
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Shortcut iPhone">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <p class="mx-2.5 mt-3.5 text-meta text-muted-foreground">
      Ucapkan atau ketik satu kalimat seperti "kopi 25 ribu gopay", lalu app terbuka dengan nominal,
      akun, dan kategori sudah terisi. Tinggal tap Simpan.
    </p>

    <Card class="mt-3.5">
      <CardHead title="1. Buat pintasan" />
      <ol class="m-0 flex list-decimal flex-col gap-2 px-3.5 pb-3.5 pl-8 text-meta">
        <li v-for="step in STEPS" :key="step">{{ step }}</li>
      </ol>
      <div class="flex flex-col gap-2 border-t px-3.5 py-3">
        <span class="text-xs text-muted-foreground">Alamat untuk tindakan URL</span>
        <code
          class="select-all break-all rounded-lg bg-surface-2 px-2.5 py-2 font-mono text-meta"
          >{{ url }}</code
        >
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" size="default" @click="copy"><Copy />Salin alamat</Button>
          <Button variant="ghost" size="default" @click="navigateTo('/add?text=kopi 25rb')"
            >Coba: "kopi 25rb"</Button
          >
        </div>
      </div>
    </Card>

    <Card class="mt-3.5 flex flex-col gap-3 p-3.5">
      <b class="text-panel">2. Pilih cara membukanya</b>
      <div class="flex items-start gap-3">
        <ToneIcon :icon="Mic" tone="primary" size="sm" />
        <p class="m-0 text-meta">
          <b>Siri</b>: "Hai Siri, catat pengeluaran", lalu ucapkan transaksinya.
        </p>
      </div>
      <div class="flex items-start gap-3">
        <ToneIcon :icon="Hand" tone="ok" size="sm" />
        <p class="m-0 text-meta">
          <b>Ketuk belakang</b>: Pengaturan → Aksesibilitas → Sentuh → Ketuk Belakang → Ketuk Dua
          Kali → pilih "Catat pengeluaran".
        </p>
      </div>
      <div class="flex items-start gap-3">
        <ToneIcon :icon="Smartphone" tone="warn" size="sm" />
        <p class="m-0 text-meta">
          <b>Layar utama</b>: di app Pintasan, tekan lama pintasannya → Bagikan → Tambah ke Layar
          Utama.
        </p>
      </div>
    </Card>

    <p class="mx-2.5 mt-3.5 text-xs text-muted-foreground">
      Catatan: iOS membuka alamat dari Pintasan di Safari, bukan di app yang dipasang ke layar
      utama. Pastikan kamu sudah masuk di Safari juga.
    </p>
  </div>
</template>
