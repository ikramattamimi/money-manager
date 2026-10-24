import type { Component } from 'vue';
import {
  ArrowLeftRight,
  Briefcase,
  ChartPie,
  Coffee,
  Coins,
  Cookie,
  Fuel,
  Gift,
  HeartPulse,
  House,
  Landmark,
  Receipt,
  ShoppingBag,
  Smartphone,
  SquareParking,
  Sprout,
  Utensils,
  Wallet,
} from '@lucide/vue';
import type { Tone } from '@/components/data/tone';

// Data tiruan untuk layar prototipe. Bentuk mengikuti ekspor Realbyte (tanggal
// + jam, akun, kategori, catatan, nominal IDR), isinya disamarkan.

export interface MockAccount {
  id: string;
  name: string;
  group: string;
  balance: number;
  aliases: string[];
}

export interface MockCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense' | 'transfer';
  icon: Component;
  tone: Tone | 'neutral';
  keywords: string[];
}

export interface MockTx {
  id: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  categoryId: string;
  note: string;
  accountId: string;
  toAccountId?: string;
}

export const TODAY = new Date(2026, 9, 24, 14, 0);

export const ACCOUNTS: MockAccount[] = [
  { id: 'cash', name: 'Tunai', group: 'Tunai', balance: 412000, aliases: ['tunai', 'cash'] },
  { id: 'bca', name: 'BCA', group: 'Bank', balance: 6820500, aliases: ['bca'] },
  { id: 'jago', name: 'Jago · Utama', group: 'Bank', balance: 2215000, aliases: ['jago'] },
  { id: 'seabank', name: 'Seabank', group: 'Bank', balance: 931250, aliases: ['seabank'] },
  { id: 'jago-dd', name: 'Jago · Dana Darurat', group: 'Tabungan', balance: 5400000, aliases: [] },
  { id: 'gopay', name: 'GoPay', group: 'E-Wallet', balance: 284300, aliases: ['gopay'] },
  {
    id: 'spay',
    name: 'ShopeePay',
    group: 'E-Wallet',
    balance: 46000,
    aliases: ['spay', 'shopeepay'],
  },
  {
    id: 'bibit',
    name: 'Bibit · Reksa Dana',
    group: 'Investasi',
    balance: 3150000,
    aliases: ['bibit'],
  },
  { id: 'piutang', name: 'Iuran Spotify Family', group: 'Piutang', balance: 220000, aliases: [] },
  { id: 'cc', name: 'Kartu Kredit', group: 'Utang', balance: -1186750, aliases: [] },
];

export const GROUP_STYLE: Record<string, { icon: Component; tone: Tone }> = {
  Tunai: { icon: Wallet, tone: 'r3' },
  Bank: { icon: Landmark, tone: 'r1' },
  Tabungan: { icon: Sprout, tone: 'r3' },
  'E-Wallet': { icon: Smartphone, tone: 'r6' },
  Investasi: { icon: ChartPie, tone: 'r4' },
  Piutang: { icon: Coins, tone: 'r5' },
  Utang: { icon: Receipt, tone: 'r2' },
};

export const CATEGORIES: MockCategory[] = [
  {
    id: 'food',
    name: 'Makan',
    kind: 'expense',
    icon: Utensils,
    tone: 'r2',
    keywords: ['makan', 'shopeefood', 'gofood', 'warteg', 'bubur', 'lunch', 'dinner'],
  },
  {
    id: 'snack',
    name: 'Jajan',
    kind: 'expense',
    icon: Cookie,
    tone: 'r4',
    keywords: ['jajan', 'snack', 'martabak'],
  },
  {
    id: 'coffee',
    name: 'Kopi',
    kind: 'expense',
    icon: Coffee,
    tone: 'r2',
    keywords: ['kopi', 'coffee'],
  },
  {
    id: 'fuel',
    name: 'Bensin',
    kind: 'expense',
    icon: Fuel,
    tone: 'r5',
    keywords: ['bensin', 'pertalite'],
  },
  {
    id: 'parking',
    name: 'Parkir',
    kind: 'expense',
    icon: SquareParking,
    tone: 'r1',
    keywords: ['parkir'],
  },
  {
    id: 'shop',
    name: 'Belanja',
    kind: 'expense',
    icon: ShoppingBag,
    tone: 'r6',
    keywords: ['indomaret', 'shopee', 'belanja'],
  },
  {
    id: 'sub',
    name: 'Langganan',
    kind: 'expense',
    icon: Smartphone,
    tone: 'r1',
    keywords: ['spotify', 'icloud', 'pulsa', 'kuota'],
  },
  {
    id: 'gift',
    name: 'Hadiah',
    kind: 'expense',
    icon: Gift,
    tone: 'r5',
    keywords: ['kado', 'hadiah'],
  },
  {
    id: 'health',
    name: 'Kesehatan',
    kind: 'expense',
    icon: HeartPulse,
    tone: 'r3',
    keywords: ['obat', 'halodoc'],
  },
  { id: 'rent', name: 'Kos', kind: 'expense', icon: House, tone: 'r1', keywords: ['kos'] },
  { id: 'salary', name: 'Gaji', kind: 'income', icon: Wallet, tone: 'r3', keywords: ['gaji'] },
  {
    id: 'project',
    name: 'Proyek',
    kind: 'income',
    icon: Briefcase,
    tone: 'r1',
    keywords: ['proyek'],
  },
  { id: 'interest', name: 'Bunga', kind: 'income', icon: Sprout, tone: 'r3', keywords: ['bunga'] },
  {
    id: 'receivable',
    name: 'Piutang',
    kind: 'income',
    icon: Coins,
    tone: 'r4',
    keywords: ['iuran'],
  },
  {
    id: 'transfer',
    name: 'Transfer',
    kind: 'transfer',
    icon: ArrowLeftRight,
    tone: 'neutral',
    keywords: [],
  },
];

let seq = 0;
const T = (
  d: number,
  h: number,
  m: number,
  type: MockTx['type'],
  amount: number,
  categoryId: string,
  note: string,
  accountId: string,
  toAccountId?: string,
): MockTx => ({
  id: `m${++seq}`,
  date: new Date(2026, 9, d, h, m),
  type,
  amount,
  categoryId,
  note,
  accountId,
  toAccountId,
});

export const TRANSACTIONS: MockTx[] = [
  T(24, 8, 12, 'expense', 18000, 'coffee', 'Point Coffee', 'gopay'),
  T(24, 12, 40, 'expense', 35000, 'food', 'Makan siang', 'cash'),
  T(24, 13, 5, 'expense', 2000, 'parking', 'Parkir', 'cash'),
  T(23, 19, 22, 'expense', 52500, 'food', 'ShopeeFood', 'spay'),
  T(23, 9, 0, 'transfer', 200000, 'transfer', 'Isi saldo', 'bca', 'gopay'),
  T(23, 7, 45, 'expense', 100000, 'fuel', 'Pertalite', 'cash'),
  T(22, 20, 10, 'expense', 87300, 'shop', 'Indomaret', 'bca'),
  T(22, 15, 30, 'income', 1500000, 'project', 'Proyek landing page', 'jago'),
  T(21, 12, 15, 'expense', 28000, 'food', 'Warteg', 'cash'),
  T(21, 10, 0, 'expense', 54990, 'sub', 'Spotify Family', 'cc'),
  T(20, 18, 30, 'income', 44000, 'receivable', 'Iuran Spotify', 'gopay'),
  T(20, 8, 20, 'expense', 15000, 'snack', 'Bubur ayam', 'cash'),
  T(19, 21, 5, 'expense', 163900, 'health', 'Halodoc', 'gopay'),
  T(18, 16, 40, 'expense', 250000, 'gift', 'Kado ulang tahun', 'bca'),
  T(15, 9, 0, 'expense', 1200000, 'rent', 'Kos Oktober', 'bca'),
  T(10, 11, 30, 'expense', 38648, 'shop', 'Casing HP', 'seabank'),
  T(9, 14, 0, 'expense', 25770, 'coffee', 'Kopi susu', 'seabank'),
  T(5, 7, 30, 'expense', 100000, 'fuel', 'Pertalite', 'cash'),
  T(1, 9, 0, 'income', 7500000, 'salary', 'Gaji September', 'bca'),
  T(1, 9, 5, 'income', 18420, 'interest', 'Bunga Jago', 'jago'),
];

/** Bulan sebelumnya, dalam juta rupiah: [bulan, masuk, keluar] */
export const HISTORY: [string, number, number][] = [
  ['Mei', 7.5, 6.1],
  ['Jun', 8.1, 7.4],
  ['Jul', 7.5, 8.2],
  ['Agu', 9.3, 6.9],
  ['Sep', 7.6, 7.1],
];

export const BUDGETS = [
  { categoryId: 'food', limit: 1500000 },
  { categoryId: 'coffee', limit: 300000 },
  { categoryId: 'shop', limit: 500000 },
  { categoryId: 'fuel', limit: 400000 },
];

export const TEMPLATES = [
  { id: 't1', categoryId: 'coffee', label: 'Kopi', text: 'kopi 18rb gopay' },
  { id: 't2', categoryId: 'fuel', label: 'Bensin', text: 'bensin 100rb tunai' },
  { id: 't3', categoryId: 'food', label: 'Makan siang', text: 'makan siang 35rb tunai' },
  { id: 't4', categoryId: 'parking', label: 'Parkir', text: 'parkir 2rb tunai' },
  { id: 't5', categoryId: 'sub', label: 'Spotify', text: 'spotify 54990 bca' },
];
