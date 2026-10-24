import type { Component } from 'vue';
import {
  ArrowLeftRight,
  Award,
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  CarTaxiFront,
  Cigarette,
  Clapperboard,
  Coffee,
  Coins,
  Cookie,
  Droplet,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  Headphones,
  HeartPulse,
  House,
  Landmark,
  Music,
  Package,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Smile,
  SquareParking,
  Sprout,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from '@lucide/vue';
import type { Tone } from '@/components/data/tone';

/**
 * Ikon kategori yang dikenali. Kolom `categories.icon` menyimpan kuncinya
 * (kebab-case). Ikon yang tidak dikenal jatuh ke `tag`.
 */
export const CATEGORY_ICONS: Record<string, Component> = {
  utensils: Utensils,
  cookie: Cookie,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  'square-parking': SquareParking,
  'car-taxi-front': CarTaxiFront,
  bus: Bus,
  plane: Plane,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
  shirt: Shirt,
  house: House,
  receipt: Receipt,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  smartphone: Smartphone,
  headphones: Headphones,
  'heart-pulse': HeartPulse,
  pill: Pill,
  dumbbell: Dumbbell,
  clapperboard: Clapperboard,
  'gamepad-2': Gamepad2,
  music: Music,
  gift: Gift,
  users: Users,
  smile: Smile,
  'hand-heart': HandHeart,
  baby: Baby,
  'paw-print': PawPrint,
  'graduation-cap': GraduationCap,
  book: Book,
  cigarette: Cigarette,
  scissors: Scissors,
  wrench: Wrench,
  coins: Coins,
  landmark: Landmark,
  wallet: Wallet,
  award: Award,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  sprout: Sprout,
  'piggy-bank': PiggyBank,
  package: Package,
  tag: Tag,
};

export function categoryIcon(name: string | null | undefined): Component {
  return (name && CATEGORY_ICONS[name]) || Tag;
}

export const CATEGORY_TONES: Tone[] = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'neutral'];

export function asTone(value: string | null | undefined): Tone {
  return CATEGORY_TONES.includes(value as Tone) ? (value as Tone) : 'neutral';
}

/** Tampilan transfer dan koreksi saldo (tidak punya kategori) */
export const TRANSFER_STYLE = { icon: ArrowLeftRight, tone: 'neutral' as Tone, name: 'Transfer' };
export const ADJUSTMENT_STYLE = { icon: Coins, tone: 'neutral' as Tone, name: 'Koreksi saldo' };
