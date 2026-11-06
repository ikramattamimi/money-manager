<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import GlassBar from '@/components/data/GlassBar.vue';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah } from '@/lib/format';

// Cocokkan saldo (mockup import-balance): setelah impor Realbyte, saldo hasil
// hitungan bisa berbeda karena ekspor tidak berisi saldo awal. Isi saldo
// sebenarnya hari ini; akun yang diisi dan berbeda mendapat transaksi koreksi
// (is_adjustment) yang tidak dihitung di statistik. Kosong = tidak diubah.
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

/** Keterangan baris: saldo tercatat, atau selisih kalau sudah diisi */
function caption(id: string, balance: number) {
  const actual = actualOf(id);
  if (actual === null) return { text: `Tercatat ${formatRupiah(balance)}`, tone: '' };
  const diff = actual - balance;
  if (!diff) return { text: 'Sudah cocok', tone: 'text-ok' };
  return {
    text: `Koreksi ${diff > 0 ? '+' : '−'}${formatRupiah(Math.abs(diff))}`,
    tone: diff > 0 ? 'text-inc' : 'text-exp',
  };
}

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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:rounded-2xl"
  >
    <NavBar
      title="Cocokkan saldo"
      back="Kembali"
      back-to="/settings/import"
      line
      class="sticky top-0 md:static md:rounded-t-2xl"
    />

    <p class="mx-8 mb-0 mt-3.5 text-meta leading-[1.45] text-muted-foreground">
      Isi saldo sebenarnya hari ini (lihat di app bank atau dompetmu). Akun yang berbeda dapat
      transaksi koreksi yang tidak dihitung di statistik. Kosongkan kalau sudah benar.
    </p>

    <EmptyCard
      v-if="!grouped.length"
      :title="accounts.isPending.value ? 'Memuat akun…' : 'Belum ada akun'"
    />

    <GroupedList v-for="g in grouped" :key="g.id" :label="g.name" :aside="formatRupiah(g.sum)">
      <GroupRow v-for="a in g.accounts" :key="a.id">
        <label :for="`bal-${a.id}`" class="truncate text-row font-medium tracking-[-0.01em]">{{
          a.name
        }}</label>
        <span
          :class="['truncate text-meta', caption(a.id, a.balance).tone || 'text-muted-foreground']"
          >{{ caption(a.id, a.balance).text }}</span
        >
        <template #end>
          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              :class="[
                'grid size-[38px] place-items-center rounded-[10px] text-bar font-bold active:opacity-60',
                entry(a.id).negative ? 'bg-bad-soft text-exp' : 'bg-fill text-muted-foreground',
              ]"
              :aria-pressed="entry(a.id).negative"
              :aria-label="`Saldo ${a.name} negatif (utang)`"
              @click="entry(a.id).negative = !entry(a.id).negative"
            >
              −
            </button>
            <span
              class="flex h-[38px] w-[136px] items-center gap-1 rounded-[10px] bg-fill px-2.5 focus-within:shadow-[0_0_0_2px_var(--primary-accent)]"
            >
              <small class="text-label text-muted-foreground">Rp</small>
              <input
                :id="`bal-${a.id}`"
                :value="entry(a.id).text"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                :placeholder="Math.abs(a.balance).toLocaleString('id-ID')"
                :aria-label="`Saldo sebenarnya ${a.name}`"
                class="min-w-0 flex-1 bg-transparent text-right text-amount font-semibold outline-none placeholder:font-medium placeholder:text-ter"
                @input="onInput(a.id, $event)"
              />
            </span>
          </div>
        </template>
      </GroupRow>
    </GroupedList>

    <GlassBar>
      <span class="min-w-0 flex-1 text-label text-muted-foreground">
        <b class="text-bar text-foreground">{{ changes.length }}</b> koreksi saldo
      </span>
      <IosButton class="w-[140px]" :disabled="!changes.length || saving || !canEdit" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan' }}
      </IosButton>
    </GlassBar>
  </div>
</template>
