<script setup lang="ts">
import { Repeat } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Chip from '@/components/ios/Chip.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { usePendingRecurring, useRecurringMutations } from '@/features/recurring/useRecurring';
import { formatRupiah } from '@/lib/format';
import { dayLabel } from '@/lib/time';

// Draf Ulangi "tanya dulu" yang sudah jatuh tempo, di atas daftar Transaksi.
// Catat = pakai nominal aturan; nominal lain lewat Lainnya → Ulangi & cicilan.
const { canEdit } = useActiveBook();
const pending = usePendingRecurring();
const mutations = useRecurringMutations();
const categories = useCategories();

const busy = computed(() => mutations.confirm.isPending.value || mutations.skip.isPending.value);
const due = (date: string) => dayLabel(`${date}T07:00:00+07:00`);
</script>

<template>
  <GroupedList
    v-if="pending.data.value?.length"
    label="Perlu dikonfirmasi"
    :aside="`${pending.data.value.length} ulangi`"
  >
    <GroupRow
      v-for="p in pending.data.value"
      :key="p.id"
      :title="p.rule.name"
      :subtitle="`${due(p.due_on)} · ${formatRupiah(p.rule.amount)}`"
    >
      <template #icon>
        <ToneIcon
          v-bind="
            p.rule.category_id
              ? categories.style(p.rule.category_id)
              : { icon: Repeat, tone: 'neutral' }
          "
          size="sm"
        />
      </template>
      <template v-if="canEdit" #end>
        <div :class="['flex shrink-0 gap-1.5', busy && 'pointer-events-none opacity-50']">
          <Chip @click="mutations.skip.mutate(p)">Lewati</Chip>
          <Chip on @click="mutations.confirm.mutate({ pending: p })">Catat</Chip>
        </div>
      </template>
    </GroupRow>
  </GroupedList>
</template>
