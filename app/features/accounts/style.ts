import type { Component } from 'vue';
import {
  ChartPie,
  Coins,
  CreditCard,
  Landmark,
  PiggyBank,
  Receipt,
  Smartphone,
  Wallet,
  Package,
} from '@lucide/vue';
import type { Tone } from '@/components/data/tone';
import { asTone, CATEGORY_ICONS } from '@/features/categories/icons';
import type { Database, Tables } from '@/lib/database.types';

type AccountGroup = Tables<'account_groups'>;

export type AccountKind = Database['public']['Enums']['account_kind'];

/** Ikon dan warna per jenis grup akun */
export const ACCOUNT_KIND_STYLE: Record<
  AccountKind,
  { icon: Component; tone: Tone; label: string }
> = {
  cash: { icon: Wallet, tone: 'r3', label: 'Tunai' },
  bank: { icon: Landmark, tone: 'r1', label: 'Bank' },
  ewallet: { icon: Smartphone, tone: 'r6', label: 'E-Wallet' },
  card: { icon: CreditCard, tone: 'r2', label: 'Kartu kredit' },
  savings: { icon: PiggyBank, tone: 'r3', label: 'Tabungan' },
  investment: { icon: ChartPie, tone: 'r4', label: 'Investasi' },
  receivable: { icon: Coins, tone: 'r5', label: 'Piutang' },
  loan: { icon: Receipt, tone: 'r2', label: 'Utang' },
  other: { icon: Package, tone: 'neutral', label: 'Lainnya' },
};

/**
 * Ikon yang bisa dipilih untuk grup akun: ikon keuangan dulu, lalu ikon
 * kategori lainnya. Kolom `account_groups.icon` menyimpan kuncinya.
 */
export const ACCOUNT_ICONS: Record<string, Component> = {
  wallet: Wallet,
  landmark: Landmark,
  smartphone: Smartphone,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  'chart-pie': ChartPie,
  coins: Coins,
  receipt: Receipt,
  package: Package,
  ...CATEGORY_ICONS,
};

/** Ikon dan warna grup: pilihan sendiri kalau ada, selain itu ikut jenisnya */
export function groupStyle(group: Pick<AccountGroup, 'kind' | 'icon' | 'tone'> | undefined) {
  const base = ACCOUNT_KIND_STYLE[group?.kind ?? 'other'];
  return {
    icon: (group?.icon && ACCOUNT_ICONS[group.icon]) || base.icon,
    tone: group?.tone ? asTone(group.tone) : base.tone,
    label: base.label,
  };
}

/** Kunci ikon bawaan tiap jenis (pilihan awal di form grup) */
export const KIND_ICON: Record<AccountKind, string> = {
  cash: 'wallet',
  bank: 'landmark',
  ewallet: 'smartphone',
  card: 'credit-card',
  savings: 'piggy-bank',
  investment: 'chart-pie',
  receivable: 'coins',
  loan: 'receipt',
  other: 'package',
};
