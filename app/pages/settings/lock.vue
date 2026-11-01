<script setup lang="ts">
import { LockKeyhole, ShieldCheck } from '@lucide/vue';
import FieldRow from '@/components/data/FieldRow.vue';
import { FIELD_INPUT } from '@/components/data/field';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { isValidPin, PIN_TIMEOUTS } from '@/features/lock/pin';
import { useLock } from '@/features/lock/useLock';

// Kode sandi (kunci PIN). PIN hanya tersimpan sebagai hash di perangkat ini;
// perangkat lain punya PIN sendiri. Face ID belum ada (catatan fitur).
definePageMeta({ layout: 'app' });
useHead({ title: 'Kode sandi · Money Manager' });

const lock = useLock();
const toast = useToast();
const supported = lock.supported();

const TIMEOUTS = PIN_TIMEOUTS.map((m) => ({
  value: String(m),
  label: m === 0 ? 'Langsung' : `${m} menit`,
}));
const timeout = ref(String(lock.config.value?.timeoutMin ?? 5));
watch(timeout, (value) => {
  if (lock.active.value) {
    lock.setTimeoutMin(Number(value));
    toast.show('Batas waktu kunci disimpan');
  }
});

// ---------- pasang PIN ----------
const pin = ref('');
const confirm = ref('');
const error = ref('');
const saving = ref(false);
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

async function enable() {
  error.value = '';
  if (!isValidPin(pin.value)) return (error.value = 'PIN harus 4 sampai 6 angka.');
  if (pin.value !== confirm.value) return (error.value = 'Kedua PIN tidak sama.');
  saving.value = true;
  try {
    await lock.enable(pin.value, Number(timeout.value));
    pin.value = confirm.value = '';
    toast.show('Kunci PIN aktif');
  } finally {
    saving.value = false;
  }
}

// ---------- matikan ----------
const current = ref('');
async function disable() {
  error.value = '';
  if (await lock.disable(current.value)) {
    current.value = '';
    toast.show('Kunci PIN dimatikan');
  } else {
    error.value = 'PIN salah.';
  }
}

const PIN_INPUT = `${FIELD_INPUT} tracking-[0.4em]`;
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Kode sandi" back="Lainnya" back-to="/more" line class="sticky top-0 md:static" />

    <div class="pb-8">
      <GroupedList class="mt-3.5">
        <GroupRow
          :title="lock.active.value ? 'Kunci PIN aktif' : 'Kunci PIN mati'"
          :subtitle="
            lock.active.value
              ? 'Diminta saat app dibuka dan kembali dari latar belakang'
              : 'Minta PIN 4–6 angka setiap app dibuka'
          "
          :inset="58"
        >
          <template #icon>
            <ToneIcon
              :icon="lock.active.value ? ShieldCheck : LockKeyhole"
              :tone="lock.active.value ? 'green' : 'gray'"
              size="sm"
              solid
            />
          </template>
        </GroupRow>
        <GroupRow v-if="lock.active.value" @click="lock.lockNow()">
          <b class="text-row font-medium text-primary-accent">Kunci sekarang</b>
        </GroupRow>
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        <template v-if="lock.active.value">
          Lupa PIN? Pilih Lupa PIN di layar kunci, lalu masuk lagi dengan kode email.
        </template>
        <template v-else>
          Supaya catatan keuangan tidak terbuka saat HP dipinjam orang. PIN hanya tersimpan (sebagai
          hash) di perangkat ini.
        </template>
      </p>

      <EmptyCard
        v-if="!supported"
        title="Butuh koneksi aman"
        description="Kunci PIN butuh HTTPS. Buka app dari alamat resminya untuk memasang PIN."
      />

      <template v-else>
        <GroupedList label="Kunci lagi setelah di latar belakang">
          <GroupRow>
            <Segmented v-model="timeout" :options="TIMEOUTS" label="Batas waktu kunci" />
          </GroupRow>
        </GroupedList>

        <!-- Pasang PIN -->
        <form v-if="!lock.active.value" @submit.prevent="enable">
          <GroupedList label="Pasang PIN">
            <FieldRow label="PIN baru" for="pin-new">
              <input
                id="pin-new"
                :value="pin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxlength="6"
                placeholder="4–6 angka"
                :class="PIN_INPUT"
                @input="pin = digits(($event.target as HTMLInputElement).value)"
              />
            </FieldRow>
            <FieldRow label="Ulangi PIN" for="pin-confirm" :error="error">
              <input
                id="pin-confirm"
                :value="confirm"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxlength="6"
                :class="PIN_INPUT"
                @input="confirm = digits(($event.target as HTMLInputElement).value)"
              />
            </FieldRow>
          </GroupedList>
          <div class="px-4 pt-3">
            <IosButton type="submit" block :disabled="saving || pin.length < 4"
              >Pasang PIN</IosButton
            >
          </div>
        </form>

        <!-- Matikan -->
        <form v-else @submit.prevent="disable">
          <GroupedList label="Matikan kunci PIN">
            <FieldRow label="PIN sekarang" for="pin-current" :error="error" :label-width="112">
              <input
                id="pin-current"
                :value="current"
                type="password"
                inputmode="numeric"
                autocomplete="current-password"
                maxlength="6"
                :class="PIN_INPUT"
                @input="current = digits(($event.target as HTMLInputElement).value)"
              />
            </FieldRow>
          </GroupedList>
          <div class="px-4 pt-3">
            <IosButton type="submit" block variant="red" :disabled="current.length < 4"
              >Matikan kunci PIN</IosButton
            >
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
