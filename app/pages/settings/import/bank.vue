<script setup lang="ts">
import StatementImport from '@/components/money/StatementImport.vue';

// Impor mutasi bank dari PDF (fase 8)
definePageMeta({ layout: 'app' });
useHead({ title: 'Impor mutasi bank · Money Manager' });
</script>

<template>
  <StatementImport source="pdf" />
</template>
