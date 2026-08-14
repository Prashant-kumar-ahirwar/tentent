export interface KirayaTenant {
  name: string;
  relationship?: string;
  mobile: string;
  aadhar: string;
  voterId?: string;
  address: string;
  baseRent: number;
}

export type KirayaStatus = 'paid' | 'partial' | 'due';

export interface KirayaEntry {
  id: string;
  month: string; // e.g. "July", "August", "Advance"
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD optional payment due date
  rent: number;
  meter?: number; // current meter reading
  prevMeter?: number; // previous reading if specified
  units?: number; // units consumed
  elec: number; // electricity amount
  rate?: number; // rate per unit used (e.g. 13)
  total: number; // raw total (rent + elec)
  paid: number; // paid amount
  note?: string; // e.g. "Security deposit"
  paymentMethod?: 'Cash' | 'UPI / PhonePe / GPay' | 'Bank Transfer' | 'Cheque';
}

export interface KirayaRoom {
  id: string;
  name: string;
  lastMeter: number;
  tenant: KirayaTenant;
  entries: KirayaEntry[];
}

export interface KirayaData {
  rate: number; // e.g. 13
  activeRoom: string;
  rooms: KirayaRoom[];
}

// Helpers for calculations
export function roundUp10(n: number): number {
  const num = Number(n) || 0;
  return Math.ceil(num / 10) * 10;
}

export function getBillAmount(entry: KirayaEntry): number {
  // If total is 0 or it's a pure advance note with 0 total, don't round up 0
  if (entry.total === 0) return 0;
  return roundUp10(entry.total);
}

export function getEntryStatus(entry: KirayaEntry): KirayaStatus {
  const bAmt = getBillAmount(entry);
  const paid = Number(entry.paid) || 0;
  const rem = bAmt - paid;
  
  if (rem <= 0 && (bAmt > 0 || paid > 0)) {
    return 'paid';
  }
  if (paid > 0) {
    return 'partial';
  }
  return 'due';
}

export function getRoomStatus(room: KirayaRoom): KirayaStatus {
  if (!room.entries || room.entries.length === 0) return 'due';
  const last = room.entries[room.entries.length - 1];
  if (!last) return 'due';
  return getEntryStatus(last);
}

export function formatINR(n: number): string {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

export type AppTheme = 'light' | 'purple-blue';
export type PaletteTheme = AppTheme;
