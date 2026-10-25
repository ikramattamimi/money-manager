<script setup lang="ts">
import { ArrowLeft, Scale } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah } from '@/lib/format';

// Setelah impor: ekspor Realbyte tidak berisi saldo awal, jadi saldo hasil
// hitungan bisa berbeda. Isi saldo sebenarnya hari ini; akun yang diisi dan
// berbeda mendapat transaksi koreksi (is_adjustment).
definePageMeta({ layout: 'app' });
useHead({ title: 'Cocokkan saldo · Money Manager' });

const { canEdit } = useActiveBook();
const { accounts, grouped } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

/** Isian per akun: kosong = tidak diubah. Tanda minus untuk utang. */
const entries = reactive<Record<string, { text: string; negative: boolean }>>({});
const entry = (id: string) => (entries[id] ??= { text: '', negative: false });
// Siapkan isian sebelum render supaya template tidak mengubah state
watch(grouped, (list) => list.forEach((g) => g.accounts.forEach((a) => entry(a.id))), {
  immediate: true,
});

function onInput(id: string, event: Event) {
  const el = event.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, '').slice(0, 13);
  entry(id).text = digits ? Number(digits).toLocaleString('id-ID') : '';
  el.value = entry(id).text;
}

const actualOf = (id: string) => {
  const e = entries[id];
  if (!e?.text) return null;
  const value = Number(e.text.replace(/\D/g, ''));
  return e.negative ? -value : value;
};

const changes = computed(() =>
  grouped.value
    .flatMap((g) => g.accounts)
    .flatMap((a) => {
      const actual = actualOf(a.id);
      return actual === null || actual === a.balance ? [] : [{ account: a, actual }];
    }),
);

const saving = ref(false);
async function save() {
  if (!changes.value.length) return;
  saving.value = true;
  let done = 0;
  try {
    for (const { account, actual } of changes.value) {
      await mutations.adjust.mutateAsync({ id: account.id, actual });
      Reflect.deleteProperty(entries, account.id);
      done++;
    }
    toast.show(`${done} saldo akun dicocokkan`);
    await navigateTo('/accounts');
  } catch {
    // Pesan error sudah ditampilkan useAccountMutations; yang berhasil tetap tersimpan
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Cocokkan saldo">
      <template #actions>
        <HeaderButton label="Kembali ke impor" @click="navigateTo('/settings/import')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <p class="mx-2.5 mt-3.5 text-meta text-muted-foreground">
      Isi saldo yang sebenarnya hari ini (lihat di Realbyte atau aplikasi bank). Akun yang
      dikosongkan tidak diubah. Selisihnya dicatat sebagai koreksi saldo dan tidak masuk statistik.
    </p>

    <Card v-if="accounts.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="6" /></Card>
    <Card v-else-if="!grouped.length" class="mt-3.5">
      <EmptyState :icon="Scale" title="Belum ada akun" />
    </Card>

    <ListGroup v-for="g in grouped" :key="g.id" :label="g.name" :aside="formatRupiah(g.sum)">
      <ListRow
        v-for="a in g.accounts"
        :key="a.id"
        :title="a.name"
        :subtitle="`Tercatat ${formatRupiah(a.balance)}`"
        class="items-center"
      >
        <template #lead><ToneIcon v-bind="groupStyle(g)" size="sm" /></template>
        <template #end>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="press grid size-9 place-items-center rounded-[10px] border text-label font-bold tabular-nums"
              :class="entry(a.id).negative ? 'border-bad text-bad' : 'text-muted-foreground'"
              :aria-pressed="entry(a.id).negative"
              :aria-label="`Saldo ${a.name} negatif`"
              @click="entry(a.id).negative = !entry(a.id).negative"
            >
              −
            </button>
            <input
              :value="entry(a.id).text"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :placeholder="Math.abs(a.balance).toLocaleString('id-ID')"
              :aria-label="`Saldo sebenarnya ${a.name}`"
              class="field-input h-9! w-[112px] px-2.5! text-right tabular-nums"
              @input="onInput(a.id, $event)"
            />
          </div>
        </template>
      </ListRow>
    </ListGroup>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <span class="flex-1 text-meta text-muted-foreground">
        {{
          changes.length ? `${changes.length} akun akan dikoreksi` : 'Belum ada saldo yang diubah'
        }}
      </span>
      <Button size="touch" :disabled="!changes.length || saving || !canEdit" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan koreksi' }}
      </Button>
    </div>
  </div>
</template>
