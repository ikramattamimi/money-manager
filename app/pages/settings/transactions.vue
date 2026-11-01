<script setup lang="ts">
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import MonthStartSheet from '@/components/money/MonthStartSheet.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { monthStartCaption } from '@/features/books/monthStart';

// Pengaturan transaksi (mockup settings): hanya opsi yang sudah berfungsi.
// Tanggal awal bulan milik buku (sama dengan di Atur buku); carry-over budget
// diatur per budget, jadi di sini hanya penjelasan + tautan ke Atur budget.
// Opsi lain di mockup ada di Catatan fitur rencana redesign.
definePageMeta({ layout: 'app' });
useHead({ title: 'Pengaturan transaksi · Money Manager' });

const { book, bookId, isOwner, monthStartDay } = useActiveBook();
const sheetOpen = ref(false);
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Pengaturan transaksi"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    />

    <div class="pb-8">
      <GroupedList label="Periode">
        <GroupRow
          v-if="isOwner && bookId"
          title="Tanggal awal bulan"
          :subtitle="monthStartCaption(monthStartDay)"
          :value="String(monthStartDay)"
          chevron
          @click="sheetOpen = true"
        />
        <GroupRow
          v-else
          title="Tanggal awal bulan"
          :subtitle="monthStartCaption(monthStartDay)"
          :value="String(monthStartDay)"
        />
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Berlaku untuk buku {{ book?.name ?? 'ini' }} dan semua anggotanya: daftar transaksi,
        statistik, dan budget.
        <template v-if="!isOwner">Hanya pemilik buku yang bisa mengubahnya.</template>
      </p>

      <GroupedList label="Perhitungan">
        <GroupRow
          title="Bawa sisa ke bulan berikutnya"
          subtitle="Diatur per budget di Atur budget"
          to="/stats/budget"
          chevron
        />
        <GroupRow
          title="Ulangi & cicilan"
          subtitle="Dicatat otomatis tiap pagi pukul 07.00 WIB"
          to="/settings/recurring"
          chevron
        />
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Sisa budget bulan lalu ditambahkan ke batas bulan ini hanya untuk budget yang saklarnya
        dinyalakan.
      </p>
    </div>

    <MonthStartSheet
      v-if="bookId"
      v-model:open="sheetOpen"
      :book-id="bookId"
      :current="monthStartDay"
    />
  </div>
</template>
