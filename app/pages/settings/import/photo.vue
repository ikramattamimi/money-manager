<script setup lang="ts">
import StatementImport from '@/components/money/StatementImport.vue';

// Foto struk atau screenshot riwayat e-wallet, dibaca Claude di server (fase 11)
definePageMeta({ layout: 'app' });
useHead({ title: 'Baca foto struk · Money Manager' });
</script>

<template>
  <StatementImport source="photo" />
</template>
