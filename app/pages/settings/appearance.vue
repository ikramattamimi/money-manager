<script setup lang="ts">
import { Check, Monitor, Moon, Sun } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import type { ThemePreference } from '@/composables/useTheme';

// Gaya & warna: Terang, Gelap, atau ikut sistem. Disimpan per perangkat
// (useTheme), langsung berlaku tanpa memuat ulang.
definePageMeta({ layout: 'app' });
useHead({ title: 'Gaya & warna · Money Manager' });

const { preference, setTheme } = useTheme();
const OPTIONS = [
  { value: 'light', label: 'Terang', icon: Sun, tone: 'amber' },
  { value: 'dark', label: 'Gelap', icon: Moon, tone: 'indigo' },
  {
    value: 'system',
    label: 'Sistem',
    icon: Monitor,
    tone: 'gray',
    hint: 'Ikut pengaturan tampilan HP',
  },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  icon: unknown;
  tone: string;
  hint?: string;
}[];
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      title="Gaya & warna"
      back="Lainnya"
      back-to="/more"
      line
      class="sticky top-0 md:static"
    />

    <div class="pb-8" role="radiogroup" aria-label="Tema">
      <GroupedList label="Tampilan">
        <GroupRow
          v-for="o in OPTIONS"
          :key="o.value"
          :title="o.label"
          :subtitle="'hint' in o ? o.hint : undefined"
          role="radio"
          :aria-checked="preference === o.value"
          @click="setTheme(o.value)"
        >
          <template #icon><ToneIcon :icon="o.icon" :tone="o.tone" size="sm" solid /></template>
          <template #end>
            <Check
              v-if="preference === o.value"
              class="size-5 text-primary-accent"
              stroke-width="2.6"
              aria-hidden="true"
            />
          </template>
        </GroupRow>
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Pilihan ini hanya untuk perangkat ini. Sistem mengikuti mode terang/gelap HP dan ikut
        berganti otomatis.
      </p>
    </div>
  </div>
</template>
