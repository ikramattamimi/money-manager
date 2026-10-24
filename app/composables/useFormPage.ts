/**
 * Form di HP tampil sebagai halaman penuh (bukan modal); di iPad/desktop
 * sebagai dialog. Lihat .ai/conventions/design.md bagian Form.
 */
export function useFormPage() {
  const router = useRouter();

  /** HP: pindah ke halaman form dan kembalikan true. Lebih lebar: false, pemanggil membuka dialog. */
  function openAsPage(path: string) {
    if (!isPhoneWidth()) return false;
    router.push(path);
    return true;
  }

  /** Tutup halaman form: kembali ke layar sebelumnya, atau `fallback` kalau dibuka langsung */
  function closePage(fallback: string) {
    if (window.history.state?.back) router.back();
    else router.replace(fallback);
  }

  return { openAsPage, closePage };
}
