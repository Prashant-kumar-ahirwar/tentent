import React, { useState, useMemo } from 'react';
import { KirayaData, KirayaRoom, KirayaEntry, getBillAmount, formatINR } from '../types';
import { 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight,
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  Lightbulb,
  ShieldAlert,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface MonthlyEarningsSummaryProps {
  data: KirayaData;
  onSelectRoom?: (roomId: string) => void;
}

interface AiInsightsResult {
  headline?: string;
  healthScore?: number;
  keyObservations?: string[];
  actionableRecommendations?: string[];
  rawText?: string;
}

export const MonthlyEarningsSummary: React.FC<MonthlyEarningsSummaryProps> = ({
  data,
  onSelectRoom,
}) => {
  const currentCalendarMonth = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date());

  // Extract all distinct months available across all room entries ONLY
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    
    data.rooms.forEach((room) => {
      room.entries.forEach((entry) => {
        const m = entry.month?.trim();
        if (m && !m.toLowerCase().includes('advance') && !m.toLowerCase().includes('deposit')) {
          monthSet.add(m);
        }
      });
    });

    const monthsArray = Array.from(monthSet);

    if (monthsArray.length === 0) {
      monthsArray.push(currentCalendarMonth);
    } else {
      const standardOrder = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      monthsArray.sort((a, b) => {
        const idxA = standardOrder.findIndex(m => m.toLowerCase() === a.toLowerCase());
        const idxB = standardOrder.findIndex(m => m.toLowerCase() === b.toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });
    }

    return monthsArray;
  }, [data, currentCalendarMonth]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const match = availableMonths.find(m => m.toLowerCase() === currentCalendarMonth.toLowerCase());
    return match || availableMonths[availableMonths.length - 1] || currentCalendarMonth;
  });

  // Calculate monthly earnings STRICTLY based on entries available on rooms only
  const earnings = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let paidRoomsCount = 0;
    let partialRoomsCount = 0;
    let dueRoomsCount = 0;

    const billedRoomsList: Array<{
      room: KirayaRoom;
      entry: KirayaEntry;
      expected: number;
      collected: number;
      balance: number;
      status: 'paid' | 'partial' | 'due';
    }> = [];

    const unbilledRoomsList: KirayaRoom[] = [];

    data.rooms.forEach((room) => {
      const entry = room.entries.find(
        (e) => e.month.trim().toLowerCase() === selectedMonth.trim().toLowerCase()
      );

      if (entry) {
        const billAmount = getBillAmount(entry);
        const expected = billAmount;
        const collected = Number(entry.paid) || 0;
        const balance = Math.max(0, expected - collected);

        totalExpected += expected;
        totalCollected += collected;

        let status: 'paid' | 'partial' | 'due' = 'due';
        if (expected > 0 && collected >= expected) {
          status = 'paid';
          paidRoomsCount++;
        } else if (collected > 0 && collected < expected) {
          status = 'partial';
          partialRoomsCount++;
        } else {
          status = 'due';
          dueRoomsCount++;
        }

        billedRoomsList.push({
          room,
          entry,
          expected,
          collected,
          balance,
          status,
        });
      } else {
        unbilledRoomsList.push(room);
      }
    });

    const pending = Math.max(0, totalExpected - totalCollected);
    const collectionPercentage = totalExpected > 0 
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
      : (totalCollected > 0 ? 100 : 0);

    return {
      totalExpected,
      totalCollected,
      pending,
      collectionPercentage,
      paidRoomsCount,
      partialRoomsCount,
      dueRoomsCount,
      billedRoomsList,
      unbilledRoomsList,
      totalBilledUnits: billedRoomsList.length,
    };
  }, [data, selectedMonth]);

  // AI Insights State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<AiInsightsResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const handleFetchAiInsights = async () => {
    if (earnings.billedRoomsList.length === 0) {
      setAiError(`No billing entries available for ${selectedMonth} to analyze.`);
      setIsAiOpen(true);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setIsAiOpen(true);

    try {
      const response = await fetch('/api/ai/monthly-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          expected: earnings.totalExpected,
          collected: earnings.totalCollected,
          pending: earnings.pending,
          collectionPercentage: earnings.collectionPercentage,
          unitBreakdown: earnings.billedRoomsList.map((b) => ({
            room: b.room.name,
            tenant: b.room.tenant?.name || 'Tenant',
            billAmount: b.expected,
            paid: b.collected,
            balance: b.balance,
            status: b.status,
            electricityUnits: b.entry.units || 0,
          })),
        }),
      });

      const responseText = await response.text();
      let resData: any = null;

      try {
        resData = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText.includes('<!DOCTYPE') || responseText.includes('<html')
            ? 'AI service endpoint returned an HTML page. Please ensure GROQ_API_KEY is configured in Settings.'
            : responseText.slice(0, 200) || 'Invalid response from server'
        );
      }

      if (resData.success && resData.insights) {
        setAiInsights(resData.insights);
      } else {
        setAiError(resData.error || 'Failed to generate AI insights. Check your Groq API key.');
      }
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      setAiError(err.message || 'Could not connect to AI service.');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (data.rooms.length === 0) return null;

  return (
    <div className="mb-6 bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-6 shadow-sm">
      
      {/* Header with Month Pills & AI Insights Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line-strong)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-[var(--primary)] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--ink)] tracking-tight flex items-center gap-2 flex-wrap">
              <span>Monthly Revenue Overview</span>
              <span className="text-xs font-mono font-bold text-[var(--primary)] px-2 py-0.5 rounded-lg bg-[var(--primary-light)]">
                {selectedMonth}
              </span>
              <span className="text-[11px] font-mono text-[var(--ink-soft)] bg-[var(--paper-dark)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                {earnings.totalBilledUnits} {earnings.totalBilledUnits === 1 ? 'room entry' : 'room entries'}
              </span>
            </h3>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              Strictly calculated from recorded entries for {selectedMonth}
            </p>
          </div>
        </div>

        {/* Right side controls: Month Selector & AI Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* AI Insights Button */}
          <button
            id="ai-insights-btn"
            type="button"
            onClick={handleFetchAiInsights}
            disabled={isAiLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Generate AI Landlord Analysis & Financial Insights"
          >
            {isAiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>AI Insights</span>
          </button>

          {/* Month Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            <Calendar className="w-4 h-4 text-[var(--ink-soft)] shrink-0 mr-0.5" />
            {availableMonths.map((month) => {
              const isSelected = month.toLowerCase() === selectedMonth.toLowerCase();
              return (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setAiInsights(null);
                    setAiError(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--paper-dark)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-darker)]'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Insights Expandable Panel */}
      {isAiOpen && (
        <div className="my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/10 via-purple-950/10 to-transparent border border-indigo-500/30 relative">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--primary)]">
                AI Financial Audit • {selectedMonth}
              </span>
              {aiInsights?.healthScore && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                  Health: {aiInsights.healthScore}/10
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFetchAiInsights}
                disabled={isAiLoading}
                className="p-1 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
                title="Regenerate AI Analysis"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="p-1 rounded-lg text-[var(--ink-soft)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                title="Close AI Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isAiLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-[var(--ink-soft)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
              <p className="text-xs font-mono">Auditing revenue, pending dues, and sub-meter consumption...</p>
            </div>
          ) : aiError ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          ) : aiInsights ? (
            <div className="space-y-3 text-xs">
              {aiInsights.headline && (
                <div className="font-semibold text-sm text-[var(--ink)] bg-[var(--card)] p-3 rounded-xl border border-[var(--line)] shadow-2xs">
                  {aiInsights.headline}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Key Observations */}
                {aiInsights.keyObservations && aiInsights.keyObservations.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] shadow-2xs">
                    <div className="font-mono text-[11px] uppercase font-bold text-[var(--ink-soft)] flex items-center gap-1.5 mb-2">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Ledger Observations</span>
                    </div>
                    <ul className="space-y-1.5 text-[var(--ink-soft)] text-[11.5px]">
                      {aiInsights.keyObservations.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span className="text-[var(--ink)]">{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {aiInsights.actionableRecommendations && aiInsights.actionableRecommendations.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] shadow-2xs">
                    <div className="font-mono text-[11px] uppercase font-bold text-[var(--ink-soft)] flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Actionable Next Steps</span>
                    </div>
                    <ul className="space-y-1.5 text-[var(--ink-soft)] text-[11.5px]">
                      {aiInsights.actionableRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[var(--ink)]">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 3 Metric Summary Tiles - Derived ONLY from existing room entries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Collected */}
        <div className="bg-[var(--paper-dark)]/50 border border-emerald-500/25 rounded-xl p-3.5 sm:p-4">
          <div className="font-mono text-[10.5px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-mono font-bold text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
            {formatINR(earnings.totalCollected)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] font-mono mt-1">
            {earnings.paidRoomsCount} of {earnings.totalBilledUnits} recorded {earnings.totalBilledUnits === 1 ? 'bill' : 'bills'} cleared
          </div>
        </div>

        {/* Expected */}
        <div className="bg-[var(--paper-dark)]/50 border border-[var(--line)] rounded-xl p-3.5 sm:p-4">
          <div className="font-mono text-[10.5px] uppercase font-bold text-[var(--ink-soft)] flex items-center justify-between">
            <span>Expected Revenue</span>
            <IndianRupee className="w-4 h-4 text-[var(--ink-soft)]" />
          </div>
          <div className="font-mono font-bold text-xl sm:text-2xl text-[var(--ink)] mt-1.5 tracking-tight">
            {formatINR(earnings.totalExpected)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] font-mono mt-1">
            Sum of {earnings.totalBilledUnits} room bill {earnings.totalBilledUnits === 1 ? 'entry' : 'entries'} in {selectedMonth}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[var(--paper-dark)]/50 border border-rose-500/25 rounded-xl p-3.5 sm:p-4">
          <div className="font-mono text-[10.5px] uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>Remaining Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="font-mono font-bold text-xl sm:text-2xl text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
            {formatINR(earnings.pending)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-1 font-semibold">
            {earnings.dueRoomsCount + earnings.partialRoomsCount} {earnings.dueRoomsCount + earnings.partialRoomsCount === 1 ? 'bill has' : 'bills have'} pending balance
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 bg-[var(--paper-dark)]/40 p-3 rounded-xl border border-[var(--line)]">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[var(--ink-soft)] font-medium">
            Collection Progress: <strong className="text-[var(--ink)]">{earnings.collectionPercentage}%</strong>
          </span>
          <span className="text-[11px] text-[var(--ink-soft)]">
            {formatINR(earnings.totalCollected)} collected of {formatINR(earnings.totalExpected)} billed
          </span>
        </div>

        <div className="h-2.5 w-full bg-[var(--paper-darker)] border border-[var(--line)] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500"
            style={{ width: `${earnings.collectionPercentage}%` }}
          />
        </div>
      </div>

      {/* Room Status Matrix - Strictly for rooms with entries in this month */}
      <div className="mt-4 pt-3 border-t border-[var(--line)]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">
            Recorded Bills for {selectedMonth} ({earnings.billedRoomsList.length})
          </div>
          {earnings.unbilledRoomsList.length > 0 && (
            <div className="text-[10px] font-mono text-[var(--ink-faint)]">
              {earnings.unbilledRoomsList.length} {earnings.unbilledRoomsList.length === 1 ? 'unit' : 'units'} not billed this month
            </div>
          )}
        </div>

        {earnings.billedRoomsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--ink-soft)] bg-[var(--paper-dark)]/40 rounded-xl border border-[var(--line)]">
            <p className="font-mono">No entries found for {selectedMonth}. Add an entry in the room passbook to see monthly revenue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {earnings.billedRoomsList.map(({ room, expected, collected, status }) => {
              const statusBg = 
                status === 'paid' 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' 
                  : status === 'partial' 
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400' 
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400';

              const statusLabel = 
                status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Due';

              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom && onSelectRoom(room.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer bg-[var(--card)] shadow-2xs ${statusBg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-[var(--ink)] truncate">
                      {room.name}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md border border-current">
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between font-mono text-[11px]">
                    <span className="text-[var(--ink-soft)]">
                      {collected > 0 ? `₹${collected}` : '₹0'}
                    </span>
                    <span className="font-bold text-[var(--ink)]">
                      / ₹{expected}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
