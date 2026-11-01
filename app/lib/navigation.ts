import type { Component } from 'vue';
import { ChartPie, Ellipsis, List, Wallet } from '@lucide/vue';

export interface NavItem {
  key: 'tx' | 'stats' | 'accounts' | 'more';
  label: string;
  icon: Component;
  /** Relatif terhadap base shell ('' untuk app, '/prototype' untuk prototipe) */
  path: string;
  /** Awalan path lain yang termasuk tab ini, mis. halaman pengaturan di bawah Lainnya */
  also?: string[];
}

// Label spesifik, bukan "Beranda"
export const NAV_ITEMS: NavItem[] = [
  { key: 'tx', label: 'Transaksi', icon: List, path: '' },
  { key: 'stats', label: 'Statistik', icon: ChartPie, path: '/stats' },
  { key: 'accounts', label: 'Akun', icon: Wallet, path: '/accounts' },
  { key: 'more', label: 'Lainnya', icon: Ellipsis, path: '/more', also: ['/settings'] },
];

export function navHref(base: string, item: NavItem): string {
  return base + item.path || '/';
}

/** Halaman utama tab (Transaksi, Statistik, Akun, Lainnya), di app maupun prototipe */
export function isTabRoot(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  const local = clean.startsWith('/prototype') ? clean.slice('/prototype'.length) || '/' : clean;
  return NAV_ITEMS.some((item) => (item.path || '/') === local);
}

/** Jenis transisi antarhalaman (mockup playNav): geser samping, naik/turun, atau tanpa animasi */
export type NavTransition = 'push' | 'pop' | 'modal-in' | 'modal-out' | 'swap-modal' | null;

export interface NavEnd {
  path: string;
  /** Halaman form tanpa tab bar yang masuk dari bawah (layout: false) */
  modal: boolean;
}

/**
 * Tentukan transisi dari halaman `from` ke `to`.
 * `back` = navigasi mundur di riwayat (tombol kembali, gestur tepi).
 * Antar tab tanpa animasi (dipakai puluhan kali sehari).
 */
export function navTransition(from: NavEnd, to: NavEnd, back: boolean): NavTransition {
  if (from.path === to.path) return null;
  if (to.modal && from.modal) return 'swap-modal';
  if (to.modal) return 'modal-in';
  if (from.modal) return 'modal-out';
  if (isTabRoot(from.path) && isTabRoot(to.path)) return null;
  if (back) return 'pop';
  // Maju ke tab utama (mis. tautan "Lihat transaksi") terasa seperti kembali
  if (isTabRoot(to.path)) return 'pop';
  return 'push';
}
