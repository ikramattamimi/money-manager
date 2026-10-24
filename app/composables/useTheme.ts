export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mm-theme';
const THEME_COLOR = { light: '#f2f4f9', dark: '#0c0f14' } as const;

/**
 * Pilihan tema per perangkat. "Sistem" mengikuti prefers-color-scheme dan
 * ikut berubah saat pengaturan sistem berubah. Nilai efektif ditulis ke
 * <html data-theme> (lihat tokens.css) dan meta theme-color.
 */
export function useTheme() {
  const preference = useState<ThemePreference>('theme:preference', () => readStored());

  function apply(pref: ThemePreference) {
    const dark =
      pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    const resolved = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => (meta.content = THEME_COLOR[resolved]));
  }

  function setTheme(pref: ThemePreference) {
    preference.value = pref;
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Mode privat: pilihan hanya berlaku sampai app ditutup
    }
    apply(pref);
  }

  return { preference, setTheme, apply };
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // abaikan
  }
  return 'system';
}
