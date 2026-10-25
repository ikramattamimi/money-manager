import { useAuth } from '@/features/auth/useAuth';
import {
  canUsePin,
  hashPin,
  MAX_ATTEMPTS,
  randomSalt,
  sameHash,
  shouldLock,
  type PinConfig,
} from './pin';

const CONFIG_KEY = 'mm-pin';
const HIDDEN_KEY = 'mm-pin-hidden-at';

function readConfig(): PinConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as PinConfig) : null;
  } catch {
    return null;
  }
}

function writeConfig(config: PinConfig | null) {
  try {
    if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    // Mode privat: PIN tidak bisa dipasang, app tetap jalan tanpa kunci
  }
}

/**
 * Kunci PIN app di perangkat ini. Terkunci saat app dibuka dan saat kembali
 * dari latar belakang lebih lama dari batas waktu. Lupa PIN = keluar dan
 * masuk lagi dengan kode email (PIN ikut dihapus).
 */
export function useLock() {
  const { user, signOut } = useAuth();
  const config = useState<PinConfig | null>('lock:config', () => null);
  const locked = useState('lock:locked', () => false);
  const attempts = useState('lock:attempts', () => 0);

  /** PIN aktif untuk user yang sedang masuk */
  const active = computed(() => !!config.value && config.value.userId === user.value?.id);

  function load() {
    config.value = readConfig();
  }

  async function enable(pin: string, timeoutMin: number) {
    if (!user.value) return;
    const salt = randomSalt();
    const next: PinConfig = {
      userId: user.value.id,
      salt,
      hash: await hashPin(pin, salt),
      length: pin.length,
      timeoutMin,
    };
    writeConfig(next);
    config.value = next;
  }

  function setTimeoutMin(timeoutMin: number) {
    if (!config.value) return;
    const next = { ...config.value, timeoutMin };
    writeConfig(next);
    config.value = next;
  }

  async function check(pin: string): Promise<boolean> {
    const c = config.value;
    if (!c) return false;
    return sameHash(await hashPin(pin, c.salt), c.hash);
  }

  /** Layar kunci: PIN benar membuka kunci, salah menambah hitungan percobaan */
  async function unlock(pin: string): Promise<boolean> {
    if (await check(pin)) {
      locked.value = false;
      attempts.value = 0;
      return true;
    }
    attempts.value++;
    return false;
  }

  async function disable(pin: string): Promise<boolean> {
    if (!(await check(pin))) return false;
    writeConfig(null);
    config.value = null;
    return true;
  }

  function lockNow() {
    if (active.value) locked.value = true;
  }

  /** Lupa PIN: hapus PIN di perangkat ini dan masuk ulang dengan kode email */
  async function forget() {
    writeConfig(null);
    config.value = null;
    locked.value = false;
    attempts.value = 0;
    await signOut();
    await navigateTo('/login');
  }

  return {
    config,
    active,
    locked,
    attempts,
    tooMany: computed(() => attempts.value >= MAX_ATTEMPTS),
    supported: canUsePin,
    load,
    enable,
    setTimeoutMin,
    unlock,
    disable,
    lockNow,
    forget,
  };
}

/** Pasang sekali (plugin): kunci saat app dibuka dan saat kembali dari latar belakang */
export function installLock() {
  const lock = useLock();
  lock.load();
  lock.lockNow();

  document.addEventListener('visibilitychange', () => {
    if (!lock.active.value) return;
    if (document.visibilityState === 'hidden') {
      try {
        localStorage.setItem(HIDDEN_KEY, String(Date.now()));
      } catch {
        // abaikan
      }
      return;
    }
    let hiddenAt: number | null = null;
    try {
      hiddenAt = Number(localStorage.getItem(HIDDEN_KEY)) || null;
    } catch {
      // abaikan
    }
    if (shouldLock(hiddenAt, Date.now(), lock.config.value!.timeoutMin)) lock.lockNow();
  });
}

export { MAX_ATTEMPTS };
