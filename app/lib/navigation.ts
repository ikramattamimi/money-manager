import type { Component } from 'vue';
import { ChartPie, LayoutGrid, List, Wallet } from '@lucide/vue';

export interface NavItem {
  key: 'tx' | 'stats' | 'accounts' | 'more';
  label: string;
  icon: Component;
  /** Relatif terhadap base shell ('' untuk app, '/prototype' untuk prototipe) */
  path: string;
}

// Label spesifik, bukan "Beranda"
export const NAV_ITEMS: NavItem[] = [
  { key: 'tx', label: 'Transaksi', icon: List, path: '' },
  { key: 'stats', label: 'Statistik', icon: ChartPie, path: '/stats' },
  { key: 'accounts', label: 'Akun', icon: Wallet, path: '/accounts' },
  { key: 'more', label: 'Lainnya', icon: LayoutGrid, path: '/more' },
];

export function navHref(base: string, item: NavItem): string {
  return base + item.path || '/';
}
