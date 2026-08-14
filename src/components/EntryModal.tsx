import React, { useState } from 'react';
import { KirayaRoom, KirayaEntry, roundUp10, formatINR } from '../types';
import { 
  getNextMonthName, 
  compareEntriesNewestFirst, 
  getDefaultDueDate, 
  getDefaultEntryDate 
} from '../lib/ledgerUtils';
import { X, Trash2, Zap, Calendar, IndianRupee, Clock, Copy, Check, Sparkles, Loader2, Wand2 } from 'lucide-react';

interface EntryModalProps {
  room: KirayaRoom;
  entry?: KirayaEntry | null;
  currentRate: number;
  onSave: (roomId: string, entry: KirayaEntry, newLastMeter?: number) => void;
  onDelete?: (roomId: string, entryId: string) => void;
  onClose: () => void;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  room,
  entry,
  currentRate,
  onSave,
  onDelete,
  onClose,
}) => {
  const isEditing = !!entry;

  // Find previous month's entry for cloning (excluding the entry currently being edited if any)
  const candidateEntries = (room.entries || [])
    .filter((e) => !entry || e.id !== entry.id)
    .sort(compareEntriesNewestFirst);
  const previousEntry = candidateEntries[0] || null;

  // Form states
  const [month, setMonth] = useState(entry?.month || '');
  const [date, setDate] = useState(entry?.date || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(entry?.dueDate || '');
  const [rent, setRent] = useState<number>(entry ? entry.rent : (room.tenant?.baseRent || 2000));
  
  // Meter states
  const [currentMeter, setCurrentMeter] = useState<string>(
    entry?.meter !== undefined && entry.meter !== null ? String(entry.meter) : ''
  );
  
  // Previous meter
  const [prevMeter, setPrevMeter] = useState<number>(() => {
    if (entry?.prevMeter !== undefined) return entry.prevMeter;
    return room.lastMeter || 0;
  });

  const [rate, setRate] = useState<number>(entry?.rate || currentRate || 10);
  const [manualElec, setManualElec] = useState<number>(entry ? entry.elec : 0);
  const [paid, setPaid] = useState<number>(entry ? entry.paid : 0);
  const [note, setNote] = useState<string>(entry?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI / PhonePe / GPay' | 'Bank Transfer' | 'Cheque'>(
    entry?.paymentMethod || 'Cash'
  );

  // Clone feedback status
  const [cloneStatus, setCloneStatus] = useState<string | null>(null);

  // AI Smart Parsing States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiRawText, setAiRawText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const handleAiParse = async () => {
    if (!aiRawText.trim()) return;
    setIsAiParsing(true);
    setAiMsg(null);

    try {
      const res = await fetch('/api/ai/parse-bill-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: aiRawText,
          currentRate: rate,
          defaultRent: rent,
          lastMeter: prevMeter,
        }),
      });
      
      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('AI parser service error. Ensure GROQ_API_KEY is configured.');
      }

      if (data.success && data.parsed) {
        const p = data.parsed;
        if (p.month) setMonth(p.month);
        if (p.rent !== undefined && p.rent > 0) setRent(p.rent);
        if (p.prevMeter !== undefined && p.prevMeter >= 0) setPrevMeter(p.prevMeter);
        if (p.meter !== undefined && p.meter > 0) setCurrentMeter(String(p.meter));
        if (p.rate !== undefined && p.rate > 0) setRate(p.rate);
        if (p.paid !== undefined) setPaid(p.paid);
        if (p.dueDate) setDueDate(p.dueDate);
        if (p.note) setNote(p.note);
        if (p.paymentMethod) {
          const pm = p.paymentMethod.toLowerCase();
          if (pm.includes('upi') || pm.includes('phonepe') || pm.includes('gpay') || pm.includes('paytm')) {
            setPaymentMethod('UPI / PhonePe / GPay');
          } else if (pm.includes('bank') || pm.includes('transfer') || pm.includes('neft')) {
            setPaymentMethod('Bank Transfer');
          } else if (pm.includes('cheque')) {
            setPaymentMethod('Cheque');
          } else {
            setPaymentMethod('Cash');
          }
        }
        setAiMsg('✨ Auto-filled fields from note!');
        setTimeout(() => {
          setIsAiOpen(false);
          setAiMsg(null);
        }, 1800);
      } else {
        setAiMsg(data.error || 'Could not parse text');
      }
    } catch (e: any) {
      setAiMsg(e.message || 'AI service error');
    } finally {
      setIsAiParsing(false);
    }
  };

  // Handler: Clone previous month's entry
  const handleClonePrevious = () => {
    if (!previousEntry) return;

    const nextMonth = getNextMonthName(previousEntry.month);
    setMonth(nextMonth);
    setRent(previousEntry.rent);

    // Pre-fill meter readings: set previous meter to last entry's final meter
    if (previousEntry.meter !== undefined && previousEntry.meter !== null) {
      setPrevMeter(previousEntry.meter);
      setCurrentMeter(''); // Reset current reading for fresh input
    } else if (previousEntry.prevMeter !== undefined) {
      setPrevMeter(previousEntry.prevMeter);
    }

    // Pre-fill rate & manual electricity
    if (previousEntry.rate) {
      setRate(previousEntry.rate);
    }
    if (previousEntry.meter === undefined && previousEntry.elec !== undefined) {
      setManualElec(previousEntry.elec);
    }

    // Dates
    setDate(getDefaultEntryDate(nextMonth));
    setDueDate(getDefaultDueDate(nextMonth, room.tenant?.dueDay || 5));

    // Payment mode
    if (previousEntry.paymentMethod) {
      setPaymentMethod(previousEntry.paymentMethod);
    }

    // Reset paid to 0 for a new month bill
    setPaid(0);

    // Show temporary feedback
    setCloneStatus(`Cloned from ${previousEntry.month}: Set month to ${nextMonth} & rent to ${formatINR(previousEntry.rent)}`);
    setTimeout(() => {
      setCloneStatus(null);
    }, 4000);
  };

  // Derived calculation
  const hasMeter = currentMeter.trim() !== '';
  const currentMeterNum = Number(currentMeter) || 0;
  const unitsConsumed = hasMeter ? Math.max(0, +(currentMeterNum - prevMeter).toFixed(2)) : 0;
  const calculatedElec = hasMeter ? +(unitsConsumed * rate).toFixed(2) : manualElec;
  
  const rawTotal = +(rent + calculatedElec).toFixed(2);
  const billAmount = rawTotal > 0 ? roundUp10(rawTotal) : 0;
  const remaining = Math.max(0, +(billAmount - paid).toFixed(2));

  // Quick month suggestions
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December', 'Advance'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!month.trim()) {
      alert('Please enter or select a month name.');
      return;
    }

    const newEntry: KirayaEntry = {
      id: entry?.id || `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      month: month.trim(),
      date,
      dueDate: dueDate.trim() || undefined,
      rent: Number(rent) || 0,
      meter: hasMeter ? currentMeterNum : undefined,
      prevMeter: hasMeter ? prevMeter : undefined,
      units: hasMeter ? unitsConsumed : undefined,
      elec: calculatedElec,
      rate: rate,
      total: rawTotal,
      paid: Number(paid) || 0,
      note: note.trim() || undefined,
      paymentMethod,
    };

    const newLastMeter = hasMeter && currentMeterNum > (room.lastMeter || 0) ? currentMeterNum : undefined;
    onSave(room.id, newEntry, newLastMeter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--line-strong)] rounded-xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-strong)] shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-[var(--ink)]">
              {isEditing ? 'Edit Bill Entry' : 'New Monthly Bill Entry'}
            </h3>
            <p className="text-xs text-[var(--ink-soft)]">
              {room.name} • {room.tenant?.name || 'Vacant'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-xs overflow-y-auto pr-1 flex-1">

          {/* AI Quick Auto-Fill Bar */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--ink)]">AI Quick-Fill Assistant</span>
                  <p className="text-[10.5px] text-[var(--ink-soft)]">Paste notes, readings, or message to auto-fill</p>
                </div>
              </div>
              <button
                type="button"
                id="toggle-ai-parser-btn"
                onClick={() => setIsAiOpen(!isAiOpen)}
                className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-purple-500/15 border border-purple-500/40 text-purple-600 dark:text-purple-300 font-mono text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              >
                {isAiOpen ? 'Close AI' : '✨ Paste Note'}
              </button>
            </div>

            {isAiOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-purple-500/20 space-y-2 animate-fadeIn">
                <textarea
                  rows={2}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder={`e.g. "${room.tenant?.name || 'Ramesh'} paid 5000 via UPI, rent 4500, meter reading is 1450"`}
                  className="w-full p-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:border-purple-500 font-mono"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--ink-soft)] italic">
                    {aiMsg || 'Powered by AI Assistant'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAiParse}
                    disabled={isAiParsing || !aiRawText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isAiParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    <span>Auto-Fill Form</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clone Previous Entry Quick Bar */}
          {previousEntry && (
            <div className="flex items-center justify-between p-2.5 bg-[var(--paper-dark)] border border-[var(--line-strong)] rounded-lg text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5 truncate">
                    <span>Clone Previous Month</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--line)] text-[var(--primary)] font-bold">
                      {previousEntry.month}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--ink-soft)] font-mono truncate">
                    Rent: {formatINR(previousEntry.rent)}
                    {previousEntry.meter !== undefined ? ` • Meter: ${previousEntry.meter} kWh` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="clone-previous-entry-btn"
                onClick={handleClonePrevious}
                className="px-2.5 py-1.5 bg-[var(--card)] hover:bg-[var(--primary)] hover:text-white text-[var(--primary)] border border-[var(--primary)]/30 rounded-md font-mono text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 active:scale-95"
                title={`Clone from ${previousEntry.month} and auto-increment month`}
              >
                <Copy className="w-3 h-3" />
                <span>Clone Entry</span>
              </button>
            </div>
          )}

          {/* Clone Feedback Banner */}
          {cloneStatus && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-md text-[11px] font-mono flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-medium">{cloneStatus}</span>
            </div>
          )}
          
          {/* Month & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Month Name *
                </label>
                {previousEntry && (
                  <button
                    type="button"
                    onClick={() => setMonth(getNextMonthName(previousEntry.month))}
                    className="text-[10px] font-mono text-[var(--primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
                    title={`Set to next month: ${getNextMonthName(previousEntry.month)}`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>+Next</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. August 2026"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--primary)]"
              />
              <div className="flex gap-1 mt-1 overflow-x-auto pb-0.5 scrollbar-none">
                {monthsList.slice(0, 6).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonth(m)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-dark)] text-[var(--ink-soft)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer"
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Entry Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--primary)] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Due Date
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="text-[10px] font-mono text-[var(--ink-soft)] hover:text-rose-500"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Room Rent */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Room Rent (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="5"
                value={rent}
                onChange={(e) => setRent(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-sm text-[var(--ink)] font-mono font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Electricity Meter Reading Section */}
          <div className="p-3 bg-[var(--paper)] border border-[var(--line-strong)] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Electricity Sub-Meter (₹{rate}/unit)
              </span>
              <span className="text-[10px] font-mono text-[var(--ink-soft)]">
                Prev: {prevMeter} kWh
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[var(--ink-soft)] mb-0.5">
                  Current Reading (kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 150.5"
                  value={currentMeter}
                  onChange={(e) => setCurrentMeter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--line-strong)] rounded text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[var(--ink-soft)] mb-0.5">
                  Previous Reading (kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={prevMeter}
                  onChange={(e) => setPrevMeter(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--line-strong)] rounded text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {hasMeter ? (
              <div className="p-2 rounded bg-[var(--card)] text-[11px] font-mono text-[var(--ink)] flex justify-between items-center border border-[var(--line)]">
                <span>
                  Units: <strong>{unitsConsumed} kWh</strong> × ₹{rate}
                </span>
                <span className="font-bold text-amber-500">
                  Elec: {formatINR(calculatedElec)}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono text-[var(--ink-soft)] mb-0.5">
                  Or Direct Electricity Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={manualElec}
                  onChange={(e) => setManualElec(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--line-strong)] rounded text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            )}
          </div>

          {/* Amount Paid & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Amount Paid (₹)
                </label>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPaid(0)}
                    className="text-[var(--ink-soft)] hover:text-rose-500 cursor-pointer underline"
                  >
                    Clear
                  </button>
                  <span className="text-[var(--line-strong)]">•</span>
                  <button
                    type="button"
                    onClick={() => setPaid(billAmount)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Full (₹{billAmount})
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={paid}
                  onChange={(e) => setPaid(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-sm text-emerald-500 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              {/* Quick Increment / Amount Chips */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setPaid(5)}
                  className="px-1.5 py-0.5 rounded bg-[var(--paper-dark)] text-[var(--ink-soft)] hover:text-[var(--ink)] border border-[var(--line)] font-mono text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  ₹5
                </button>
                <button
                  type="button"
                  onClick={() => setPaid(10)}
                  className="px-1.5 py-0.5 rounded bg-[var(--paper-dark)] text-[var(--ink-soft)] hover:text-[var(--ink)] border border-[var(--line)] font-mono text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  ₹10
                </button>
                <button
                  type="button"
                  onClick={() => setPaid((prev) => Math.max(0, prev + 5))}
                  className="px-1.5 py-0.5 rounded bg-[var(--paper-dark)] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  +₹5
                </button>
                <button
                  type="button"
                  onClick={() => setPaid((prev) => Math.max(0, prev + 10))}
                  className="px-1.5 py-0.5 rounded bg-[var(--paper-dark)] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  +₹10
                </button>
                <button
                  type="button"
                  onClick={() => setPaid(billAmount)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold cursor-pointer shrink-0"
                >
                  Full Bill
                </button>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI / PhonePe / GPay">📱 UPI / PhonePe / GPay</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
                <option value="Cheque">📜 Cheque</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Note / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in full, Security deposit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Bill Calculation Breakdown Card */}
          <div className="p-3 bg-[var(--paper-dark)] border border-[var(--line-strong)] rounded-lg space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[var(--ink-soft)]">
              <span>Rent ({formatINR(rent)}) + Elec ({formatINR(calculatedElec)}):</span>
              <span className="font-semibold text-[var(--ink)]">{formatINR(rawTotal)}</span>
            </div>
            
            <div className="flex justify-between items-baseline pt-1 border-t border-[var(--line)] text-[var(--ink)]">
              <span className="font-bold">Total Bill:</span>
              <span className="font-bold text-sm text-[var(--ink)]">{formatINR(billAmount)}</span>
            </div>

            <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-[var(--line)]">
              <span className="font-bold text-[var(--ink-soft)]">Remaining Balance:</span>
              <span className={`font-bold ${remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {remaining > 0 ? formatINR(remaining) : 'Paid in full ✓'}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--line-strong)] gap-2 shrink-0">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete entry for ${month}?`)) {
                      onDelete(room.id, entry!.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-xs font-mono font-semibold text-[var(--stamp-red)] hover:bg-rose-500/10 rounded-md border border-[var(--stamp-red)]/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-xs cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Save Entry'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
