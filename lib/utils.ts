import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nano21 = customAlphabet(ALPHABET, 21);
const nano16 = customAlphabet(ALPHABET, 16);
const nano32 = customAlphabet(ALPHABET, 32);
const nano8 = customAlphabet(ALPHABET, 8);

export const nano = { n21: nano21, n16: nano16, n32: nano32, n8: nano8 };

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatRupiah(n: number): string {
  return n.toLocaleString('id-ID');
}

const PALETTE = [
  'oklch(0.72 0.15 250)',
  'oklch(0.78 0.14 60)',
  'oklch(0.74 0.15 155)',
  'oklch(0.7 0.16 320)',
  'oklch(0.7 0.16 200)',
  'oklch(0.75 0.13 30)',
  'oklch(0.7 0.14 130)',
  'oklch(0.72 0.15 290)',
];

export function pickColor(seedIndex: number): string {
  return PALETTE[seedIndex % PALETTE.length];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
