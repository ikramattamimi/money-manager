// Terapkan tema sebelum halaman pertama dirender, lalu ikuti perubahan tema
// sistem kalau pilihan user "Sistem".
export default defineNuxtPlugin({
  name: 'theme',
  enforce: 'pre',
  setup() {
    const { preference, apply } = useTheme();
    apply(preference.value);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (preference.value === 'system') apply('system');
    });
  },
});
