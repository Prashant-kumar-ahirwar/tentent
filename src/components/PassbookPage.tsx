import React, { useState, useMemo } from 'react';
import { KirayaRoom, KirayaEntry, getBillAmount, getEntryStatus, formatINR } from '../types';
import { 
  filterAndSortEntries, 
  SortOrder, 
  FilterStatus, 
  getNextMonthName, 
  getLatestEntry,
  getDefaultDueDate,
  getDefaultEntryDate,
  getWhatsAppShareUrl,
  generateWhatsAppBillText,
  getWhatsAppReminderUrl,
  generateWhatsAppReminderText
} from '../lib/ledgerUtils';
import { 
  Phone, 
  MapPin, 
  CreditCard, 
  User, 
  Edit3, 
  Plus, 
  FileText, 
  Zap, 
  MessageCircle, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Receipt, 
  Clock, 
  Trash2, 
  Filter, 
  ArrowUpDown, 
  Sparkles,
  Search,
  Check,
  ExternalLink,
  ShieldCheck,
  Bell
} from 'lucide-react';

interface PassbookPageProps {
  room: KirayaRoom;
  defaultRate?: number;
  onEditTenant: (room: KirayaRoom) => void;
  onOpenAddEntry: (roomId: string, entryId?: string) => void;
  onOpenBillReceipt: (roomId: string, entryId: string) => void;
  onDeleteEntry?: (roomId: string, entryId: string) => void;
  onAutoAddNextMonth?: (roomId: string, targetMonth: string) => void;
  onOpenAutoGenerateModal?: () => void;
  searchQuery?: string;
}

export const PassbookPage: React.FC<PassbookPageProps> = ({
  room,
  defaultRate = 10,
  onEditTenant,
  onOpenAddEntry,
  onOpenBillReceipt,
  onDeleteEntry,
  onAutoAddNextMonth,
  onOpenAutoGenerateModal,
  searchQuery = '',
}) => {
  const tenant = room.tenant || {
    name: '',
    relationship: '',
    mobile: '',
    aadhar: '',
    voterId: '',
    address: '',
    baseRent: 0,
  };

  // Local filter states
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Extract phone digits for WhatsApp and direct calling
  const rawMobile = tenant.mobile || '';
  const firstPhoneMatch = rawMobile.match(/\d{10}/);
  const firstPhoneDigits = firstPhoneMatch ? firstPhoneMatch[0] : '';

  // Get all unique months available in this room's entries for filter dropdown
  const roomMonths = useMemo(() => {
    const months = new Set<string>();
    room.entries.forEach((e) => {
      if (e.month) months.add(e.month.trim());
    });
    return Array.from(months);
  }, [room.entries]);

  // Counts for status filter pills
  const counts = useMemo(() => {
    let due = 0;
    let paid = 0;
    let partial = 0;

    room.entries.forEach((e) => {
      const bAmt = getBillAmount(e);
      const p = Number(e.paid) || 0;
      const rem = bAmt - p;
      if (rem <= 0 && (bAmt > 0 || p > 0)) {
        paid++;
      } else if (p > 0) {
        partial++;
      } else {
        due++;
      }
    });

    return { all: room.entries.length, due, paid, partial };
  }, [room.entries]);

  // Filter and sort entries (Newest on top by default)
  const filteredAndSortedEntries = useMemo(() => {
    return filterAndSortEntries(room.entries, {
      status: statusFilter,
      selectedMonth,
      searchQuery,
      sortOrder,
      tenantName: tenant.name,
      tenantMobile: tenant.mobile,
    });
  }, [room.entries, statusFilter, selectedMonth, searchQuery, sortOrder, tenant.name, tenant.mobile]);

  // Check if next month bill is already generated
  const latestEntry = useMemo(() => getLatestEntry(room.entries), [room.entries]);
  const nextMonthName = useMemo(() => getNextMonthName(latestEntry?.month), [latestEntry]);
  const hasNextMonthEntry = useMemo(() => {
    if (!nextMonthName) return false;
    return room.entries.some(e => e.month.trim().toLowerCase() === nextMonthName.trim().toLowerCase());
  }, [room.entries, nextMonthName]);

  const hasActiveFilters = statusFilter !== 'all' || selectedMonth !== 'all' || searchQuery.trim() !== '' || sortOrder !== 'newest';

  // Quick feedback toast on WhatsApp share / reminder
  const [shareToast, setShareToast] = useState<string | null>(null);

  const handleShareWhatsApp = (entry: KirayaEntry) => {
    const url = getWhatsAppShareUrl(room, entry);
    window.open(url, '_blank');
    setShareToast(`WhatsApp opened with ${entry.month} bill receipt!`);
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleSendReminder = (entry: KirayaEntry) => {
    const url = getWhatsAppReminderUrl(room, entry);
    window.open(url, '_blank');
    const bAmt = getBillAmount(entry);
    const paid = Number(entry.paid) || 0;
    const rem = Math.max(0, bAmt - paid);
    const tenantName = tenant.name.trim() || room.name;
    setShareToast(
      rem > 0 
        ? `WhatsApp reminder draft opened for ${tenantName} (Due: ${formatINR(rem)})!`
        : `WhatsApp payment update draft opened for ${tenantName}!`
    );
    setTimeout(() => setShareToast(null), 3500);
  };

  const handleQuickAddNextMonth = () => {
    if (onAutoAddNextMonth) {
      onAutoAddNextMonth(room.id, nextMonthName);
    } else if (onOpenAutoGenerateModal) {
      onOpenAutoGenerateModal();
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl shadow-sm overflow-hidden mb-8">
      
      {/* ---------- Tenant Profile & Room Hero Banner ---------- */}
      <div className="p-4 sm:p-6 border-b border-[var(--line-strong)] bg-gradient-to-r from-[var(--paper-dark)]/80 via-[var(--card)] to-[var(--paper-dark)]/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Tenant / Room Identification */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-mono font-bold tracking-wide shadow-xs">
                {room.name}
              </span>

              <h2 className="font-bold text-lg sm:text-xl text-[var(--ink)] tracking-tight truncate">
                {tenant.name.trim() ? tenant.name : <span className="text-[var(--ink-soft)] italic font-normal">Vacant (No tenant assigned)</span>}
              </h2>

              {tenant.baseRent > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[var(--card)] text-[var(--ink)] text-xs font-mono font-bold border border-[var(--line-strong)]">
                  Rent: {formatINR(tenant.baseRent)}/mo
                </span>
              )}

              {room.lastMeter > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[var(--card)] text-[var(--ink)] text-xs font-mono font-semibold border border-[var(--line-strong)] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Meter: {room.lastMeter} kWh</span>
                </span>
              )}
            </div>

            {/* Tenant Details Metadata Strip */}
            <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs text-[var(--ink-soft)] pt-1">
              
              {/* Phone number */}
              {tenant.mobile ? (
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                  <a 
                    href={`tel:${firstPhoneDigits}`} 
                    className="font-semibold text-[var(--ink)] hover:underline hover:text-[var(--primary)]"
                    title="Click to call"
                  >
                    {tenant.mobile}
                  </a>
                  {firstPhoneDigits && (
                    <a
                      href={`https://wa.me/91${firstPhoneDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open WhatsApp chat"
                      className="text-emerald-600 hover:text-emerald-500 p-0.5 inline-flex items-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : null}

              {/* Due Date Preference */}
              {tenant.dueDay ? (
                <div className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[var(--ink-soft)] shrink-0" />
                  <span>Due day: {tenant.dueDay}th of month</span>
                </div>
              ) : null}

              {/* Permanent Address */}
              {tenant.address ? (
                <div className="flex items-center gap-1 truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-[var(--ink-soft)] shrink-0" />
                  <span className="truncate">{tenant.address}</span>
                </div>
              ) : null}

              {/* ID Proof Indicator */}
              {(tenant.aadhar || tenant.voterId) ? (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>KYC Verified</span>
                </div>
              ) : null}

            </div>
          </div>

          {/* Action Buttons for Room / Tenant */}
          <div className="flex items-center gap-2 shrink-0">
            {firstPhoneDigits && (
              <a
                href={`https://wa.me/91${firstPhoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Message Tenant on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => onEditTenant(room)}
              className="px-3.5 py-2 rounded-xl bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Edit Tenant profile, contact details, and base rent"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Room / Tenant</span>
            </button>
          </div>

        </div>
      </div>

      {/* ---------- Filter & Navigation Toolbar ---------- */}
      <div className="p-3 sm:p-4 border-b border-[var(--line-strong)] bg-[var(--card)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Status Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'all'
                ? 'bg-[var(--ink)] text-[var(--card)] shadow-2xs'
                : 'bg-[var(--paper-dark)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <span>All</span>
            <span className="font-mono text-[10px] opacity-80">({counts.all})</span>
          </button>

          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'due'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <span>Due</span>
            <span className="font-mono text-[10px] opacity-80">({counts.due})</span>
          </button>

          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'partial'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span>Partial</span>
            <span className="font-mono text-[10px] opacity-80">({counts.partial})</span>
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <span>Paid</span>
            <span className="font-mono text-[10px] opacity-80">({counts.paid})</span>
          </button>
        </div>

        {/* Right Tools: Month select, Sort, and Add Entry */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Month selector dropdown */}
          {roomMonths.length > 0 && (
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-3 pr-7 py-1.5 bg-[var(--paper-dark)] border border-[var(--line-strong)] rounded-lg text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="all">All Months</option>
                {roomMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] text-[var(--ink-soft)]">
                ▼
              </div>
            </div>
          )}

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            title={`Sort order: ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-dark)] border border-[var(--line-strong)] text-[var(--ink)] text-xs font-mono flex items-center gap-1 cursor-pointer hover:border-[var(--primary)] transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--ink-soft)]" />
            <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSelectedMonth('all');
                setSortOrder('newest');
              }}
              title="Reset all filters"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line-strong)] text-xs font-mono text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* + Add Bill Entry Action */}
          <button
            onClick={() => onOpenAddEntry(room.id)}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>

        </div>

      </div>

      {/* Share Toast Banner */}
      {shareToast && (
        <div className="mx-4 sm:mx-6 my-3 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{shareToast}</span>
          </div>
          <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Ready to Send</span>
        </div>
      )}

      {/* ---------- DESKTOP & TABLET TABLE (sm+) ---------- */}
      {filteredAndSortedEntries.length === 0 ? (
        <div className="py-16 px-4 text-center text-[var(--ink-soft)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--paper-dark)] flex items-center justify-center mx-auto mb-3.5 text-[var(--primary)] border border-[var(--line-strong)]">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base text-[var(--ink)] mb-1">No Bill Entries Found</h4>
          <p className="text-xs max-w-sm mx-auto mb-5 text-[var(--ink-soft)]">
            {hasActiveFilters 
              ? 'No bills match your current search, status, or month filters.'
              : 'Add your first rent & sub-meter reading entry for this room.'}
          </p>

          <div className="flex justify-center gap-3">
            {hasActiveFilters ? (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedMonth('all');
                }}
                className="px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--primary)] transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => onOpenAddEntry(room.id)}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Bill Entry</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile view (< sm) */}
          <div className="block sm:hidden divide-y divide-[var(--line)]">
            {filteredAndSortedEntries.map((entry) => {
              const billAmount = getBillAmount(entry);
              const paid = Number(entry.paid) || 0;
              const remaining = billAmount - paid;
              const status = getEntryStatus(entry);

              let formattedDate = '';
              if (entry.date) {
                try {
                  formattedDate = new Intl.DateTimeFormat('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(entry.date + 'T00:00:00'));
                } catch (e) {
                  formattedDate = entry.date;
                }
              }

              let dueCountdown: { text: string; subtext?: string; type: 'upcoming' | 'today' | 'overdue' } | null = null;
              if (entry.dueDate && status !== 'paid') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDateObj = new Date(entry.dueDate + 'T00:00:00');
                const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let formattedDueDate = entry.dueDate;
                try {
                  formattedDueDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dueDateObj);
                } catch (e) {
                  // ignore
                }

                if (diffDays > 1) {
                  dueCountdown = { text: `${diffDays}d left`, subtext: `Due ${formattedDueDate}`, type: 'upcoming' };
                } else if (diffDays === 1) {
                  dueCountdown = { text: `Due tomorrow`, subtext: formattedDueDate, type: 'upcoming' };
                } else if (diffDays === 0) {
                  dueCountdown = { text: `Due Today!`, subtext: formattedDueDate, type: 'today' };
                } else if (diffDays === -1) {
                  dueCountdown = { text: `1d overdue`, subtext: `Was due ${formattedDueDate}`, type: 'overdue' };
                } else {
                  dueCountdown = { text: `${Math.abs(diffDays)}d overdue`, subtext: `Was due ${formattedDueDate}`, type: 'overdue' };
                }
              }

              return (
                <div key={entry.id} className="p-4 transition-colors hover:bg-[var(--paper-dark)]/30">
                  {/* Top: Month & Stamp */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-base text-[var(--ink)]">
                          {entry.month}
                        </span>
                        {dueCountdown && (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              dueCountdown.type === 'overdue'
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                : dueCountdown.type === 'today'
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{dueCountdown.text}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--ink-soft)] font-mono mt-0.5">
                        {formattedDate && <span>Date: {formattedDate}</span>}
                        {entry.dueDate && (
                          <span className="text-[10.5px] text-[var(--primary)] ml-1">
                            • Due: {entry.dueDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`stamp shrink-0 ${
                        status === 'paid'
                          ? 'stamp-paid'
                          : status === 'partial'
                            ? 'stamp-partial'
                            : 'stamp-due'
                      }`}
                    >
                      {status === 'paid' && 'PAID ✓'}
                      {status === 'partial' && 'PARTIAL'}
                      {status === 'due' && 'DUE'}
                    </span>
                  </div>

                  {/* Middle: Key-Value Breakdown Tile */}
                  <div className="p-3 rounded-xl bg-[var(--paper-dark)]/50 border border-[var(--line)] text-xs space-y-1.5 mb-3">
                    <div className="flex justify-between items-center text-[var(--ink-soft)]">
                      <span>Room Rent:</span>
                      <span className="font-mono font-bold text-[var(--ink)]">{formatINR(entry.rent)}</span>
                    </div>

                    {entry.elec > 0 && (
                      <div className="flex justify-between items-center text-[var(--ink-soft)]">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Electricity ({entry.units || 0} units):</span>
                        </span>
                        <span className="font-mono font-bold text-[var(--ink)]">{formatINR(entry.elec)}</span>
                      </div>
                    )}

                    {entry.prevMeter !== undefined && entry.meter !== undefined && (
                      <div className="text-[10px] font-mono text-[var(--ink-soft)] pl-4">
                        Meter: {entry.prevMeter} ➔ {entry.meter} ({entry.units || 0} kWh)
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 border-t border-[var(--line)] font-bold text-[var(--ink)]">
                      <span>Total Bill:</span>
                      <span className="font-mono text-sm">{formatINR(billAmount)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--ink-soft)]">Amount Paid:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {paid > 0 ? formatINR(paid) : '₹0'} {entry.paymentMethod ? `(${entry.paymentMethod})` : ''}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        Balance Due:
                      </span>
                      <span className={`font-mono ${remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {remaining > 0 ? formatINR(remaining) : '₹0 (Cleared)'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Mobile Actions Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Remind Button */}
                    <button
                      id={`mobile-remind-btn-${entry.id}`}
                      onClick={() => handleSendReminder(entry)}
                      className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                        remaining > 0
                          ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold'
                          : 'bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] hover:border-amber-500 hover:text-amber-600'
                      }`}
                      title={
                        remaining > 0
                          ? `Send WhatsApp payment reminder for ₹${formatINR(remaining)} outstanding`
                          : `Send WhatsApp payment update for ${entry.month}`
                      }
                    >
                      <Bell className="w-4 h-4" />
                      <span>{remaining > 0 ? `Remind (₹${remaining.toLocaleString('en-IN')})` : 'Remind'}</span>
                    </button>

                    <button
                      id={`mobile-whatsapp-btn-${entry.id}`}
                      onClick={() => handleShareWhatsApp(entry)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                      title="Share bill summary directly via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Bill</span>
                    </button>

                    <button
                      id={`mobile-receipt-btn-${entry.id}`}
                      onClick={() => onOpenBillReceipt(room.id, entry.id)}
                      className="py-2.5 px-3.5 rounded-xl bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1 hover:border-[var(--primary)] transition-colors cursor-pointer shadow-2xs shrink-0"
                      title="View & Print Bill Receipt"
                    >
                      <Receipt className="w-4 h-4 text-[var(--primary)]" />
                      <span>Receipt</span>
                    </button>

                    <button
                      id={`mobile-edit-btn-${entry.id}`}
                      onClick={() => onOpenAddEntry(room.id, entry.id)}
                      className="p-2.5 rounded-xl border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer shrink-0"
                      title="Edit Entry"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {onDeleteEntry && (
                      <button
                        id={`mobile-delete-btn-${entry.id}`}
                        onClick={() => {
                          if (confirm(`Delete bill entry for ${entry.month}?`)) {
                            onDeleteEntry(room.id, entry.id);
                          }
                        }}
                        className="p-2.5 rounded-xl border border-[var(--line-strong)] text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (sm+) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-[var(--line-strong)] bg-[var(--paper-dark)]/60 text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  <th className="py-3 px-4 sm:px-6">Period & Date</th>
                  <th className="py-3 px-4">Rent & Meter Breakdown</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-xs">
                {filteredAndSortedEntries.map((entry) => {
                  const billAmount = getBillAmount(entry);
                  const paid = Number(entry.paid) || 0;
                  const remaining = billAmount - paid;
                  const status = getEntryStatus(entry);

                  let formattedDate = '';
                  if (entry.date) {
                    try {
                      formattedDate = new Intl.DateTimeFormat('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(entry.date + 'T00:00:00'));
                    } catch (e) {
                      formattedDate = entry.date;
                    }
                  }

                  let dueCountdown: { text: string; subtext?: string; type: 'upcoming' | 'today' | 'overdue' } | null = null;
                  if (entry.dueDate && status !== 'paid') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDateObj = new Date(entry.dueDate + 'T00:00:00');
                    const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let formattedDueDate = entry.dueDate;
                    try {
                      formattedDueDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dueDateObj);
                    } catch (e) {
                      // ignore
                    }

                    if (diffDays > 1) {
                      dueCountdown = { text: `${diffDays}d left`, subtext: `Due ${formattedDueDate}`, type: 'upcoming' };
                    } else if (diffDays === 1) {
                      dueCountdown = { text: `Due tomorrow`, subtext: formattedDueDate, type: 'upcoming' };
                    } else if (diffDays === 0) {
                      dueCountdown = { text: `Due Today!`, subtext: formattedDueDate, type: 'today' };
                    } else if (diffDays === -1) {
                      dueCountdown = { text: `1d overdue`, subtext: `Was due ${formattedDueDate}`, type: 'overdue' };
                    } else {
                      dueCountdown = { text: `${Math.abs(diffDays)}d overdue`, subtext: `Was due ${formattedDueDate}`, type: 'overdue' };
                    }
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-[var(--paper-dark)]/30 transition-colors group">
                      {/* Period & Date */}
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="font-bold text-sm text-[var(--ink)] flex items-center gap-2 flex-wrap">
                          <span>{entry.month}</span>
                          {dueCountdown && (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                dueCountdown.type === 'overdue'
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                  : dueCountdown.type === 'today'
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{dueCountdown.text}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--ink-soft)] font-mono flex items-center gap-2 flex-wrap mt-0.5">
                          {formattedDate && <span>{formattedDate}</span>}
                          {entry.dueDate && (
                            <span className="text-[10px] text-[var(--primary)] font-semibold">
                              (Due: {entry.dueDate})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rent & Meter Breakdown */}
                      <td className="py-4 px-4 align-middle">
                        <div className="font-mono text-xs text-[var(--ink)] font-semibold flex items-center gap-1.5">
                          <span>Rent: {formatINR(entry.rent)}</span>
                          {entry.elec > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              + Elec: {formatINR(entry.elec)}
                            </span>
                          )}
                        </div>
                        {entry.prevMeter !== undefined && entry.meter !== undefined ? (
                          <div className="text-[10.5px] font-mono text-[var(--ink-soft)] truncate mt-0.5">
                            Meter: {entry.prevMeter} ➔ {entry.meter} ({entry.units || 0} units @ ₹{entry.rate || defaultRate})
                          </div>
                        ) : (
                          entry.note && (
                            <div className="text-[10.5px] italic text-[var(--ink-soft)] truncate mt-0.5">
                              {entry.note}
                            </div>
                          )
                        )}
                      </td>

                      {/* Total Bill */}
                      <td className="py-4 px-4 text-right align-middle">
                        <div className="font-mono font-bold text-sm text-[var(--ink)]">
                          {formatINR(billAmount)}
                        </div>
                        {entry.total > 0 && billAmount !== entry.total && (
                          <div className="text-[10px] text-[var(--ink-soft)] font-mono">
                            (Raw: ₹{entry.total})
                          </div>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-4 px-4 text-right align-middle">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {paid > 0 ? formatINR(paid) : '₹0'}
                        </div>
                        {entry.paymentMethod && (
                          <div className="text-[10px] text-[var(--ink-soft)] font-mono">
                            {entry.paymentMethod}
                          </div>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="py-4 px-4 text-right align-middle">
                        {remaining > 0 ? (
                          <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatINR(remaining)}
                          </div>
                        ) : (
                          <div className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                            ₹0 (Cleared)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center align-middle">
                        <span
                          className={`stamp ${
                            status === 'paid'
                              ? 'stamp-paid'
                              : status === 'partial'
                                ? 'stamp-partial'
                                : 'stamp-due'
                          }`}
                        >
                          {status === 'paid' && 'PAID'}
                          {status === 'partial' && 'PARTIAL'}
                          {status === 'due' && 'DUE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Remind Button (Pre-filled WhatsApp draft with outstanding balance) */}
                          <button
                            id={`remind-btn-${entry.id}`}
                            onClick={() => handleSendReminder(entry)}
                            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              remaining > 0
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold'
                                : 'border border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-amber-600 hover:border-amber-400/50 hover:bg-amber-500/10'
                            }`}
                            title={
                              remaining > 0
                                ? `Send WhatsApp payment reminder for ₹${formatINR(remaining)} outstanding`
                                : `Send WhatsApp payment update for ${entry.month}`
                            }
                          >
                            <Bell className={`w-3.5 h-3.5 ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                            <span className="hidden xl:inline">Remind</span>
                          </button>

                          {/* Dedicated 1-Tap WhatsApp Share Button */}
                          <button
                            id={`whatsapp-share-${entry.id}`}
                            onClick={() => handleShareWhatsApp(entry)}
                            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer shadow-2xs shrink-0"
                            title={`Share ${entry.month} bill receipt via WhatsApp`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / View Receipt */}
                          <button
                            id={`view-receipt-${entry.id}`}
                            onClick={() => onOpenBillReceipt(room.id, entry.id)}
                            className="p-2 rounded-lg border border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer shrink-0"
                            title="View & Print Bill Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Entry */}
                          <button
                            id={`edit-entry-${entry.id}`}
                            onClick={() => onOpenAddEntry(room.id, entry.id)}
                            className="p-2 rounded-lg border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] transition-colors cursor-pointer shrink-0"
                            title="Edit Entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Entry */}
                          {onDeleteEntry && (
                            <button
                              id={`delete-entry-${entry.id}`}
                              onClick={() => {
                                if (confirm(`Delete bill entry for ${entry.month}?`)) {
                                  onDeleteEntry(room.id, entry.id);
                                }
                              }}
                              className="p-2 rounded-lg border border-[var(--line-strong)] text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------- Ledger Footer Toolbar ---------- */}
      <div className="p-4 sm:p-5 bg-[var(--paper-dark)]/50 border-t border-[var(--line-strong)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-[var(--ink-soft)] font-mono text-center sm:text-left">
          Showing <span className="font-bold text-[var(--ink)]">{filteredAndSortedEntries.length}</span> of {room.entries.length} entries for {room.name}
          {sortOrder === 'newest' && <span className="ml-1 text-[10px] text-[var(--primary)] font-semibold">(Newest first)</span>}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onOpenAutoGenerateModal && (
            <button
              onClick={onOpenAutoGenerateModal}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="Auto-roll next month bills for all rooms"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Auto-Roll Month</span>
            </button>
          )}

          <button
            onClick={() => onOpenAddEntry(room.id)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill Entry</span>
          </button>
        </div>
      </div>

    </div>
  );
};
