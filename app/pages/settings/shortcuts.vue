<script setup lang="ts">
import { Copy, Hand, Mic, Smartphone } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';

// Pintasan iOS: Siri, Ketuk Belakang, dan tombol layar utama membuka
// /add?text=... sehingga satu kalimat langsung jadi isian catat transaksi.
definePageMeta({ layout: 'app' });
useHead({ title: 'Pintasan iOS · Money Manager' });

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
const WAYS = [
  {
    icon: Mic,
    tone: 'purple',
    title: 'Siri',
    text: '"Hai Siri, catat pengeluaran", lalu ucapkan transaksinya.',
  },
  {
    icon: Hand,
    tone: 'green',
    title: 'Ketuk belakang',
    text: 'Pengaturan → Aksesibilitas → Sentuh → Ketuk Belakang → Ketuk Dua Kali → "Catat pengeluaran".',
  },
  {
    icon: Smartphone,
    tone: 'blue',
    title: 'Layar utama',
    text: 'Di app Pintasan, tekan lama pintasannya → Bagikan → Tambah ke Layar Utama.',
  },
] as const;
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Pintasan iOS"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    />

    <div class="pb-8">
      <p class="mx-8 mb-0 mt-3.5 text-meta leading-[1.45] text-muted-foreground">
        Ucapkan atau ketik satu kalimat seperti "kopi 25 ribu gopay", lalu app terbuka dengan
        nominal, akun, dan kategori sudah terisi. Tinggal ketuk Simpan.
      </p>

      <GroupedList label="1. Buat pintasan">
        <GroupRow v-for="(step, i) in STEPS" :key="step" :inset="52">
          <template #icon>
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full bg-fill text-meta font-semibold"
              aria-hidden="true"
              >{{ i + 1 }}</span
            >
          </template>
          <span class="text-body leading-[1.4]">{{ step }}</span>
        </GroupRow>
      </GroupedList>

      <GroupedList label="Alamat untuk tindakan URL">
        <GroupRow>
          <code class="select-all break-all font-mono text-meta">{{ url }}</code>
        </GroupRow>
      </GroupedList>
      <div class="flex gap-2.5 px-4 pt-3">
        <IosButton variant="soft" class="flex-1" @click="copy"
          ><Copy aria-hidden="true" />Salin alamat</IosButton
        >
        <IosButton variant="gray" class="flex-1" to="/add?text=kopi 25rb"
          >Coba "kopi 25rb"</IosButton
        >
      </div>

      <GroupedList label="2. Pilih cara membukanya">
        <GroupRow v-for="w in WAYS" :key="w.title">
          <template #icon><ToneIcon :icon="w.icon" :tone="w.tone" size="sm" solid /></template>
          <b class="text-row font-medium tracking-[-0.01em]">{{ w.title }}</b>
          <span class="text-meta leading-[1.4] text-muted-foreground">{{ w.text }}</span>
        </GroupRow>
      </GroupedList>

      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        iOS membuka alamat dari Pintasan di Safari, bukan di app yang dipasang ke layar utama.
        Pastikan kamu sudah masuk di Safari juga.
      </p>
    </div>
  </div>
</template>
