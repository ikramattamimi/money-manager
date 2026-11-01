import type { Component } from 'vue';
import { Camera, FileSpreadsheet, Landmark } from '@lucide/vue';
import type { IosTone } from '@/components/data/tone';
import { formatTime, jakartaParts, MONTHS_SHORT } from '@/lib/time';
import type { ImportBatch } from './api';

/** Ikon, warna, dan nama sumber impor (mockup HIST_ICON) */
export const IMPORT_SOURCE: Record<
  ImportBatch['source'],
  { icon: Component; tone: IosTone; label: string }
> = {
  realbyte_xlsx: { icon: FileSpreadsheet, tone: 'green', label: 'Impor Realbyte' },
  bank_statement: { icon: Landmark, tone: 'blue', label: 'Mutasi bank' },
  photo: { icon: Camera, tone: 'orange', label: 'Foto struk' },
};

/** "3 Okt 2026, 14.05" (WIB) */
export function batchWhen(iso: string): string {
  const d = jakartaParts(iso);
  return `${d.day} ${MONTHS_SHORT[d.month - 1]} ${d.year}, ${formatTime(iso)}`;
}
