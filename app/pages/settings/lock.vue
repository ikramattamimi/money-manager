<script setup lang="ts">
import { ArrowLeft, LockKeyhole, ShieldCheck } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import FormField from '@/components/base/FormField.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { isValidPin, PIN_TIMEOUTS } from '@/features/lock/pin';
import { useLock } from '@/features/lock/useLock';

// Pengaturan kunci PIN (fase 11 T2). PIN hanya tersimpan sebagai hash di
// perangkat ini; perangkat lain punya PIN sendiri.
definePageMeta({ layout: 'app' });
useHead({ title: 'Kunci PIN · Money Manager' });

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
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Kunci PIN">
      <template #actions>
        <HeaderButton label="Kembali ke Lainnya" @click="navigateTo('/more')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
      </template>
    </PageHeader>

    <Card class="mt-3.5 flex items-start gap-3 px-3.5 py-4">
      <ToneIcon
        :icon="lock.active.value ? ShieldCheck : LockKeyhole"
        :tone="lock.active.value ? 'ok' : 'primary'"
        size="sm"
      />
      <p class="m-0 text-meta text-muted-foreground">
        <template v-if="lock.active.value">
          <b class="text-foreground">Kunci PIN aktif.</b> App meminta PIN saat dibuka dan saat
          kembali dari latar belakang. Lupa PIN? Pilih Lupa PIN di layar kunci, lalu masuk lagi
          dengan kode email.
        </template>
        <template v-else>
          Minta PIN 4–6 angka setiap app dibuka, supaya catatan keuangan tidak terbuka saat HP
          dipinjam orang. PIN hanya tersimpan (sebagai hash) di perangkat ini.
        </template>
      </p>
    </Card>

    <Card v-if="!supported" class="mt-3.5 px-3.5 py-3 text-meta text-warn">
      Kunci PIN butuh koneksi aman (HTTPS). Buka app dari alamat resminya untuk memasang PIN.
    </Card>

    <template v-else>
      <div class="mt-4 flex flex-col gap-1.5">
        <span class="px-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
          >Kunci lagi setelah di latar belakang</span
        >
        <SegmentedControl v-model="timeout" :options="TIMEOUTS" label="Batas waktu kunci" />
      </div>

      <!-- Pasang PIN -->
      <Card v-if="!lock.active.value" class="mt-4 p-3.5">
        <form class="flex flex-col gap-3" @submit.prevent="enable">
          <FormField label="PIN baru" for="pin-new" hint="4 sampai 6 angka.">
            <input
              id="pin-new"
              :value="pin"
              type="password"
              inputmode="numeric"
              autocomplete="new-password"
              maxlength="6"
              class="field-input tracking-[0.4em]"
              @input="pin = digits(($event.target as HTMLInputElement).value)"
            />
          </FormField>
          <FormField label="Ulangi PIN" for="pin-confirm">
            <input
              id="pin-confirm"
              :value="confirm"
              type="password"
              inputmode="numeric"
              autocomplete="new-password"
              maxlength="6"
              class="field-input tracking-[0.4em]"
              @input="confirm = digits(($event.target as HTMLInputElement).value)"
            />
          </FormField>
          <p v-if="error" class="m-0 text-meta text-bad" role="alert">{{ error }}</p>
          <Button type="submit" size="touch" :disabled="saving || pin.length < 4"
            >Pasang PIN</Button
          >
        </form>
      </Card>

      <!-- PIN aktif -->
      <template v-else>
        <Card class="mt-4 flex flex-wrap items-center gap-2 p-3.5">
          <span class="flex-1 text-meta">Kunci app sekarang tanpa menunggu.</span>
          <Button variant="secondary" size="touch" @click="lock.lockNow()">
            <LockKeyhole />Kunci sekarang
          </Button>
        </Card>
        <Card class="mt-3.5 p-3.5">
          <form class="flex flex-col gap-3" @submit.prevent="disable">
            <FormField label="PIN sekarang" for="pin-current" hint="Untuk mematikan kunci PIN.">
              <input
                id="pin-current"
                :value="current"
                type="password"
                inputmode="numeric"
                autocomplete="current-password"
                maxlength="6"
                class="field-input tracking-[0.4em]"
                @input="current = digits(($event.target as HTMLInputElement).value)"
              />
            </FormField>
            <p v-if="error" class="m-0 text-meta text-bad" role="alert">{{ error }}</p>
            <Button
              type="submit"
              variant="ghost-danger"
              size="touch"
              :disabled="current.length < 4"
            >
              Matikan kunci PIN
            </Button>
          </form>
        </Card>
      </template>
    </template>
  </div>
</template>
