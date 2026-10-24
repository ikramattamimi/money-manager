<script setup lang="ts">
import { Repeat } from '@lucide/vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { usePendingRecurring, useRecurringMutations } from '@/features/recurring/useRecurring';
import { formatRupiah } from '@/lib/format';
import { dayLabel } from '@/lib/time';

// Draf transaksi berulang "tanya dulu" yang sudah jatuh tempo, di atas daftar
// Transaksi. Catat = pakai nominal aturan; nominal lain lewat menu aturannya.
const { canEdit } = useActiveBook();
const pending = usePendingRecurring();
const mutations = useRecurringMutations();
const categories = useCategories();

const busy = computed(() => mutations.confirm.isPending.value || mutations.skip.isPending.value);
const due = (date: string) => dayLabel(`${date}T07:00:00+07:00`);
</script>

<template>
  <ListGroup
    v-if="pending.data.value?.length"
    label="Perlu dikonfirmasi"
    :aside="`${pending.data.value.length} transaksi berulang`"
  >
    <ListRow
      v-for="p in pending.data.value"
      :key="p.id"
      :title="p.rule.name"
      :subtitle="`${due(p.due_on)} · ${formatRupiah(p.rule.amount)}`"
    >
      <template #lead>
        <ToneIcon
          v-bind="
            p.rule.category_id
              ? categories.style(p.rule.category_id)
              : { icon: Repeat, tone: 'neutral' }
          "
          size="sm"
        />
      </template>
      <template #end>
        <div v-if="canEdit" class="flex gap-1">
          <Button variant="ghost" size="default" :disabled="busy" @click="mutations.skip.mutate(p)">
            Lewati
          </Button>
          <Button
            variant="soft"
            size="default"
            :disabled="busy"
            @click="mutations.confirm.mutate({ pending: p })"
          >
            Catat
          </Button>
        </div>
      </template>
    </ListRow>
  </ListGroup>
</template>
