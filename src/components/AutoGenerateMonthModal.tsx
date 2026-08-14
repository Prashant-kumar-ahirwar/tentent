import React, { useState, useMemo } from 'react';
import { KirayaRoom, KirayaEntry, formatINR } from '../types';
import { 
  getNextMonthName, 
  getDefaultDueDate, 
  getDefaultEntryDate, 
  MONTH_NAMES, 
  parseMonthString 
} from '../lib/ledgerUtils';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Home, 
  Zap, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface AutoGenerateMonthModalProps {
  rooms: KirayaRoom[];
  activeRoomId?: string;
  defaultRate: number;
  onGenerate: (generatedEntries: { roomId: string; entry: KirayaEntry }[]) => void;
  onClose: () => void;
}

export const AutoGenerateMonthModal: React.FC<AutoGenerateMonthModalProps> = ({
  rooms,
  activeRoomId,
  defaultRate,
  onGenerate,
  onClose,
}) => {
  // Determine the default target month: look across all rooms to find the most recent month
  const suggestedNextMonth = useMemo(() => {
    let latestMonthStr = '';
    let maxVal = 0;

    rooms.forEach((r) => {
      r.entries.forEach((e) => {
        const p = parseMonthString(e.month);
        const val = p.year * 100 + p.monthIndex;
        if (val > maxVal) {
          maxVal = val;
          latestMonthStr = e.month;
        }
      });
    });

    return getNextMonthName(latestMonthStr || undefined);
  }, [rooms]);

  const [targetMonth, setTargetMonth] = useState<string>(suggestedNextMonth);
  const [dueDateDay, setDueDateDay] = useState<number>(5);
  const [customDueDate, setCustomDueDate] = useState<string>(() => getDefaultDueDate(suggestedNextMonth, 5));
  
  // Selection: 'all' or room IDs
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(() => {
    return new Set(rooms.map(r => r.id));
  });

  // Keep custom due date in sync when month or day changes
  const handleMonthChange = (newMonth: string) => {
    setTargetMonth(newMonth);
    setCustomDueDate(getDefaultDueDate(newMonth, dueDateDay));
  };

  const handleDayChange = (day: number) => {
    setDueDateDay(day);
    setCustomDueDate(getDefaultDueDate(targetMonth, day));
  };

  // Check which rooms already have an entry for this month
  const roomStatusList = useMemo(() => {
    const targetNorm = targetMonth.trim().toLowerCase();

    return rooms.map((room) => {
      const existingEntry = room.entries.find(
        (e) => e.month.trim().toLowerCase() === targetNorm
      );
      const isSelected = selectedRoomIds.has(room.id);
      const baseRent = room.tenant?.baseRent || 0;
      const lastMeter = room.lastMeter || 0;

      return {
        room,
        existingEntry,
        hasDuplicate: !!existingEntry,
        isSelected,
        baseRent,
        lastMeter,
      };
    });
  }, [rooms, targetMonth, selectedRoomIds]);

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRoomIds.size === rooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(rooms.map(r => r.id)));
    }
  };

  const eligibleCount = roomStatusList.filter(r => r.isSelected && !r.hasDuplicate).length;
  const duplicateCount = roomStatusList.filter(r => r.isSelected && r.hasDuplicate).length;

  const handleGenerate = () => {
    const generated: { roomId: string; entry: KirayaEntry }[] = [];
    const entryDate = getDefaultEntryDate(targetMonth);

    roomStatusList.forEach(({ room, isSelected, hasDuplicate, baseRent, lastMeter }) => {
      if (!isSelected || hasDuplicate) return;

      const newEntry: KirayaEntry = {
        id: `auto-${Date.now()}-${room.id.slice(-4)}-${Math.random().toString(36).slice(2, 6)}`,
        month: targetMonth,
        date: entryDate,
        dueDate: customDueDate,
        rent: baseRent,
        prevMeter: lastMeter > 0 ? lastMeter : undefined,
        elec: 0,
        rate: defaultRate,
        total: baseRent,
        paid: 0,
        note: `Auto-generated monthly bill`,
        paymentMethod: 'Cash',
      };

      generated.push({ roomId: room.id, entry: newEntry });
    });

    if (generated.length === 0) {
      alert('No eligible rooms selected to generate bills. Uncheck already existing months or pick another month.');
      return;
    }

    onGenerate(generated);
    onClose();
  };

  // Quick month navigators
  const { monthIndex, year } = parseMonthString(targetMonth);
  const prevMonthName = `${MONTH_NAMES[(monthIndex + 11) % 12]} ${monthIndex === 0 ? year - 1 : year}`;
  const nextMonthName = `${MONTH_NAMES[(monthIndex + 1) % 12]} ${monthIndex === 11 ? year + 1 : year}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-strong)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[var(--ink)] flex items-center gap-1.5">
                <span>Auto-Generate Monthly Bills</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  1-CLICK
                </span>
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                Pre-fills base rent, previous meter baseline, and sets payment due dates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
          
          {/* Month & Due Date Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Target Month */}
            <div className="p-3 bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--primary)] font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Target Month
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMonthChange(prevMonthName)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] border border-[var(--line)] cursor-pointer"
                    title={`Switch to ${prevMonthName}`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMonthChange(nextMonthName)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] border border-[var(--line)] cursor-pointer"
                    title={`Switch to ${nextMonthName}`}
                  >
                    →
                  </button>
                </div>
              </div>

              <input
                type="text"
                required
                value={targetMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                placeholder="e.g. September 2026"
                className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--ink)] font-bold focus:outline-none focus:border-[var(--primary)]"
              />

              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {MONTH_NAMES.map((m) => {
                  const mYear = `${m} ${year}`;
                  const isCurrent = targetMonth.toLowerCase().includes(m.toLowerCase());
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMonthChange(mYear)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[var(--primary)] text-white font-bold'
                          : 'bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] border border-[var(--line)]'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Due Date */}
            <div className="p-3 bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--primary)] font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Payment Due Date
              </label>

              <div className="flex gap-1.5 items-center">
                {[5, 7, 10, 15].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayChange(day)}
                    className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                      dueDateDay === day
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs'
                        : 'bg-[var(--card)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {day}th
                  </button>
                ))}
              </div>

              <input
                type="date"
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--card)] border border-[var(--line-strong)] rounded-lg text-xs text-[var(--ink)] font-mono font-semibold focus:outline-none focus:border-[var(--primary)]"
              />
              <p className="text-[10px] text-[var(--ink-soft)] leading-tight">
                Sets default deadline for rent collection & WhatsApp receipt alerts.
              </p>
            </div>

          </div>

          {/* Rooms Preview Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-bold">
                Select Rooms to Generate ({eligibleCount} ready, {duplicateCount} already exist)
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-mono text-[var(--primary)] hover:underline cursor-pointer font-semibold"
              >
                {selectedRoomIds.size === rooms.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-[var(--line-strong)] rounded-xl divide-y divide-[var(--line)] bg-[var(--card)] overflow-hidden shadow-xs">
              {roomStatusList.map(({ room, hasDuplicate, isSelected, baseRent, lastMeter }) => {
                return (
                  <div
                    key={room.id}
                    onClick={() => !hasDuplicate && toggleSelectRoom(room.id)}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      hasDuplicate 
                        ? 'opacity-60 bg-[var(--paper-dark)]/40 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 cursor-pointer' 
                          : 'hover:bg-[var(--paper-dark)]/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected && !hasDuplicate}
                        disabled={hasDuplicate}
                        onChange={() => toggleSelectRoom(room.id)}
                        className="w-4 h-4 rounded text-[var(--primary)] focus:ring-0 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--ink)]">
                            {room.name}
                          </span>
                          <span className="text-[11px] text-[var(--ink-soft)] truncate">
                            • {room.tenant?.name || 'Vacant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] font-mono text-[var(--ink-soft)] mt-0.5">
                          <span>Base: <strong className="text-[var(--ink)]">{formatINR(baseRent)}</strong></span>
                          {lastMeter > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Zap className="w-3 h-3" />
                              Prev Meter: {lastMeter} kWh
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {hasDuplicate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          Already Exists
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-2.5 rounded-lg bg-[var(--paper-dark)] border border-[var(--line)] flex items-start gap-2 text-[11px] text-[var(--ink-soft)]">
            <Sparkles className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
            <span>
              All newly generated bills are placed on <strong>top of the ledger</strong>. You can enter final meter readings or record payments anytime.
            </span>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--line-strong)] gap-2 shrink-0 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={eligibleCount === 0}
            onClick={handleGenerate}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              eligibleCount > 0
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]'
                : 'opacity-50 bg-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate {eligibleCount} {eligibleCount === 1 ? 'Monthly Bill' : 'Monthly Bills'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
