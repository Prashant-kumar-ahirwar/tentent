import { KirayaRoom, KirayaEntry, KirayaStatus, getBillAmount } from '../types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses a month string like "August 2026", "Aug 2026", "August", "8/2026"
 * into a month index (0-11) and year (e.g. 2026)
 */
export function parseMonthString(monthStr: string): { monthIndex: number; year: number } {
  const str = monthStr.trim();
  const currentYear = new Date().getFullYear();

  // Try extracting 4-digit year
  const yearMatch = str.match(/\b(20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  // Check month name
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i].toLowerCase();
    const short = full.slice(0, 3);
    const lowerStr = str.toLowerCase();
    if (lowerStr.includes(full) || lowerStr.includes(short)) {
      return { monthIndex: i, year };
    }
  }

  // Check numeric month 1-12
  const numMatch = str.match(/\b(0?[1-9]|1[0-2])\b/);
  if (numMatch) {
    return { monthIndex: parseInt(numMatch[1], 10) - 1, year };
  }

  return { monthIndex: new Date().getMonth(), year };
}

/**
 * Returns the next consecutive month name formatted like "September 2026"
 */
export function getNextMonthName(currentMonthStr?: string): string {
  if (!currentMonthStr) {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }

  const { monthIndex, year } = parseMonthString(currentMonthStr);
  const nextMonthIndex = (monthIndex + 1) % 12;
  const nextYear = nextMonthIndex === 0 ? year + 1 : year;

  return `${MONTH_NAMES[nextMonthIndex]} ${nextYear}`;
}

/**
 * Formats a default due date string (YYYY-MM-DD) for a given month & day
 * e.g., 5th of September 2026 -> "2026-09-05"
 */
export function getDefaultDueDate(monthStr: string, dayOfMonth: number = 5): string {
  const { monthIndex, year } = parseMonthString(monthStr);
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(Math.min(28, Math.max(1, dayOfMonth))).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Returns entry date for 1st of that month or current date if in same month
 */
export function getDefaultEntryDate(monthStr: string): string {
  const { monthIndex, year } = parseMonthString(monthStr);
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() === monthIndex) {
    return now.toISOString().slice(0, 10);
  }
  const m = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${m}-01`;
}

/**
 * Finds the latest/most recent entry across a room or ledger
 */
export function getLatestEntry(entries: KirayaEntry[]): KirayaEntry | null {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => compareEntriesNewestFirst(a, b));
  return sorted[0] || null;
}

/**
 * Stable comparator to sort entries with NEWEST entries on top.
 * Prioritizes parsed Year & Month descending, then Date descending, then ID.
 */
export function compareEntriesNewestFirst(a: KirayaEntry, b: KirayaEntry): number {
  // If month includes "advance" or "deposit", handle specially
  const aIsAdv = a.month.toLowerCase().includes('advance');
  const bIsAdv = b.month.toLowerCase().includes('advance');
  if (aIsAdv && !bIsAdv) return 1;
  if (!aIsAdv && bIsAdv) return -1;

  const parsedA = parseMonthString(a.month);
  const parsedB = parseMonthString(b.month);

  const valA = parsedA.year * 100 + parsedA.monthIndex;
  const valB = parsedB.year * 100 + parsedB.monthIndex;

  if (valA !== valB) {
    return valB - valA; // Descending (Newest first)
  }

  // If same month/year, compare date string if available
  if (a.date && b.date) {
    const comp = b.date.localeCompare(a.date);
    if (comp !== 0) return comp;
  }

  return b.id.localeCompare(a.id);
}

export type SortOrder = 'newest' | 'oldest' | 'amount-desc' | 'due-desc';
export type FilterStatus = 'all' | 'due' | 'paid' | 'partial';

/**
 * Filters and sorts entries based on user preferences
 */
export function filterAndSortEntries(
  entries: KirayaEntry[],
  filters: {
    status: FilterStatus;
    selectedMonth: string; // 'all' or specific month name
    searchQuery: string;
    sortOrder: SortOrder;
    tenantName?: string;
    tenantMobile?: string;
  }
): KirayaEntry[] {
  let result = entries.filter((entry) => {
    // 1. Status filter
    const bAmt = getBillAmount(entry);
    const paid = Number(entry.paid) || 0;
    const remaining = bAmt - paid;
    const isPaid = remaining <= 0 && (bAmt > 0 || paid > 0);
    const isPartial = paid > 0 && remaining > 0;
    const isDue = remaining > 0;

    if (filters.status === 'paid' && !isPaid) return false;
    if (filters.status === 'partial' && !isPartial) return false;
    if (filters.status === 'due' && !isDue) return false;

    // 2. Month filter
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
      if (entry.month.trim().toLowerCase() !== filters.selectedMonth.trim().toLowerCase()) {
        return false;
      }
    }

    // 3. Search query filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchMonth = entry.month.toLowerCase().includes(q);
      const matchDate = entry.date && entry.date.includes(q);
      const matchNote = entry.note && entry.note.toLowerCase().includes(q);
      const matchMethod = entry.paymentMethod && entry.paymentMethod.toLowerCase().includes(q);
      const matchTenant = filters.tenantName && filters.tenantName.toLowerCase().includes(q);
      const matchPhone = filters.tenantMobile && filters.tenantMobile.includes(q);

      if (!matchMonth && !matchDate && !matchNote && !matchMethod && !matchTenant && !matchPhone) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  return result.sort((a, b) => {
    if (filters.sortOrder === 'newest') {
      return compareEntriesNewestFirst(a, b);
    }
    if (filters.sortOrder === 'oldest') {
      return -compareEntriesNewestFirst(a, b);
    }
    if (filters.sortOrder === 'amount-desc') {
      const amtA = getBillAmount(a);
      const amtB = getBillAmount(b);
      return amtB - amtA;
    }
    if (filters.sortOrder === 'due-desc') {
      const dueA = Math.max(0, getBillAmount(a) - (Number(a.paid) || 0));
      const dueB = Math.max(0, getBillAmount(b) - (Number(b.paid) || 0));
      return dueB - dueA;
    }
    return 0;
  });
}

/**
 * Generates a pre-formatted WhatsApp bill receipt summary message for a specific room & entry
 */
export function generateWhatsAppBillText(room: KirayaRoom, entry: KirayaEntry): string {
  const bAmt = getBillAmount(entry);
  const paid = Number(entry.paid) || 0;
  const rem = Math.max(bAmt - paid, 0);
  const tenant = room.tenant;
  const tenantName = tenant?.name || 'Tenant';

  let dateStr = '—';
  if (entry.date) {
    try {
      dateStr = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(entry.date + 'T00:00:00'));
    } catch (e) {
      dateStr = entry.date;
    }
  }

  const isRounded = bAmt !== Number(entry.total || 0) && entry.total > 0;

  const lines: string[] = [];
  lines.push(`📜 *RENT & UTILITY BILL* 📜`);
  lines.push(`────────────────────────`);
  lines.push(`🏠 *Room:* ${room.name}`);
  lines.push(`👤 *Tenant:* ${tenantName}`);
  if (tenant?.mobile) {
    lines.push(`📱 *Contact:* ${tenant.mobile}`);
  }
  lines.push(`🗓️ *Month / Period:* ${entry.month}`);
  if (dateStr && dateStr !== '—') {
    lines.push(`📅 *Date:* ${dateStr}`);
  }
  if (entry.dueDate) {
    try {
      const dStr = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.dueDate + 'T00:00:00'));
      lines.push(`⏰ *Due Date:* ${dStr}`);
    } catch (e) {
      lines.push(`⏰ *Due Date:* ${entry.dueDate}`);
    }
  }
  lines.push(`────────────────────────`);
  lines.push(`💵 *Room Rent:* ₹${entry.rent.toLocaleString('en-IN')}`);
  
  if (Number(entry.elec) > 0) {
    lines.push(`⚡ *Electric Bill:* ₹${entry.elec.toLocaleString('en-IN')}`);
  }
  
  if (entry.total > 0 && isRounded) {
    lines.push(`📋 *Total Bill:* ₹${entry.total.toLocaleString('en-IN')} (Rounded: ₹${bAmt.toLocaleString('en-IN')})`);
  } else {
    lines.push(`📋 *Total Bill:* ₹${bAmt.toLocaleString('en-IN')}`);
  }
  
  if (paid > 0) {
    const modeText = entry.paymentMethod ? ` via ${entry.paymentMethod}` : '';
    lines.push(`✅ *Amount Paid:* ₹${paid.toLocaleString('en-IN')}${modeText}`);
  }
  
  lines.push(`────────────────────────`);
  if (rem > 0) {
    lines.push(`🔴 *TOTAL AMOUNT TO PAY: ₹${rem.toLocaleString('en-IN')}*`);
    lines.push(`\nKindly pay ₹${rem.toLocaleString('en-IN')} via UPI / Cash.`);
  } else {
    lines.push(`🟢 *STATUS: FULLY PAID (₹${bAmt.toLocaleString('en-IN')})*`);
    lines.push(`\nThank you for paying on time! Have a great month.`);
  }
  
  if (entry.note) {
    lines.push(`\n📝 *Note:* ${entry.note}`);
  }
  
  return lines.join('\n');
}

/**
 * Returns a direct WhatsApp URL with pre-filled message text and recipient number (if available)
 */
export function getWhatsAppShareUrl(room: KirayaRoom, entry: KirayaEntry): string {
  const text = generateWhatsAppBillText(room, entry);
  const rawMobile = room.tenant?.mobile || '';
  const firstPhoneMatch = rawMobile.match(/\d{10}/);
  const phoneDigits = firstPhoneMatch ? firstPhoneMatch[0] : '';
  const phone = phoneDigits ? `91${phoneDigits}` : '';
  
  return phone 
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Generates a pre-formatted WhatsApp payment reminder message draft with outstanding balance
 */
export function generateWhatsAppReminderText(room: KirayaRoom, entry: KirayaEntry): string {
  const bAmt = getBillAmount(entry);
  const paid = Number(entry.paid) || 0;
  const rem = Math.max(bAmt - paid, 0);
  const tenant = room.tenant;
  const tenantName = tenant?.name?.trim() ? tenant.name.trim() : 'Tenant';

  let dateStr = '';
  if (entry.date) {
    try {
      dateStr = new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(entry.date + 'T00:00:00'));
    } catch (e) {
      dateStr = entry.date;
    }
  }

  const lines: string[] = [];
  lines.push(`🔔 *RENT & ELECTRICITY PAYMENT REMINDER* 🔔`);
  lines.push(`────────────────────────`);
  lines.push(`Namaste *${tenantName}* ji,`);
  lines.push(`This is a reminder regarding your rent & electric bill for *${room.name}*.`);
  lines.push(``);
  lines.push(`🗓️ *Month / Period:* ${entry.month}`);
  if (dateStr) {
    lines.push(`📅 *Bill Date:* ${dateStr}`);
  }
  lines.push(`💵 *Room Rent:* ₹${entry.rent.toLocaleString('en-IN')}`);
  if (Number(entry.elec) > 0) {
    lines.push(`⚡ *Electric Bill:* ₹${entry.elec.toLocaleString('en-IN')}`);
  }
  lines.push(`📋 *Total Bill:* ₹${bAmt.toLocaleString('en-IN')}`);
  if (paid > 0) {
    lines.push(`✅ *Amount Paid:* ₹${paid.toLocaleString('en-IN')}`);
  }
  lines.push(`🔴 *TOTAL AMOUNT YOU HAVE TO PAY: ₹${rem.toLocaleString('en-IN')}*`);

  if (entry.dueDate) {
    try {
      const dStr = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.dueDate + 'T00:00:00'));
      lines.push(`⏰ *Payment Due Date:* ${dStr}`);
    } catch (e) {
      lines.push(`⏰ *Payment Due Date:* ${entry.dueDate}`);
    }
  }

  lines.push(`────────────────────────`);
  if (rem > 0) {
    lines.push(`Kindly pay the amount of *₹${rem.toLocaleString('en-IN')}* via UPI or Cash.`);
  } else {
    lines.push(`All dues for ${entry.month} are fully cleared. Thank you for your prompt payment!`);
  }
  lines.push(`\nIf already paid, please share the payment confirmation screenshot. Thank you! 🙏`);

  return lines.join('\n');
}

/**
 * Returns a direct WhatsApp URL pre-filled with payment reminder draft addressed to the tenant
 */
export function getWhatsAppReminderUrl(room: KirayaRoom, entry: KirayaEntry): string {
  const text = generateWhatsAppReminderText(room, entry);
  const rawMobile = room.tenant?.mobile || '';
  const firstPhoneMatch = rawMobile.match(/\d{10}/);
  const phoneDigits = firstPhoneMatch ? firstPhoneMatch[0] : '';
  const phone = phoneDigits ? `91${phoneDigits}` : '';
  
  return phone 
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
