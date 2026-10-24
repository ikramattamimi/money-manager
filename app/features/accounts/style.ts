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
import type { Database } from '@/lib/database.types';

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
