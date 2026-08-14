import React from 'react';
import { KirayaData, getBillAmount, formatINR } from '../types';
import { IndianRupee, AlertCircle, CheckCircle2, Home, ArrowUpRight, Zap } from 'lucide-react';

interface SummaryCoverProps {
  data: KirayaData;
}

export const SummaryCover: React.FC<SummaryCoverProps> = ({ data }) => {
  let totalCollected = 0;
  let totalDue = 0;
  let totalAdvance = 0;
  let totalRooms = data.rooms.length;
  let occupiedRooms = 0;
  let totalEntriesCount = 0;

  data.rooms.forEach((room) => {
    if (room.tenant && room.tenant.name && !room.tenant.name.toLowerCase().includes('vacant')) {
      occupiedRooms++;
    }
    totalEntriesCount += room.entries.length;
    room.entries.forEach((entry) => {
      const paid = Number(entry.paid) || 0;
      const bAmt = getBillAmount(entry);
      totalCollected += paid;
      
      if (bAmt > paid) {
        totalDue += (bAmt - paid);
      } else if (paid > bAmt && entry.month.toLowerCase().includes('advance')) {
        totalAdvance += (paid - bAmt);
      }
    });
  });

  const totalBilled = totalCollected + totalDue;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* 1. Total Collected Card */}
      <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-[var(--stamp-green)] transition-all">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          <span>Collected</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono font-bold text-xl sm:text-2xl lg:text-3xl text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
          {formatINR(totalCollected)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] font-mono mt-2 pt-2 border-t border-[var(--line)]">
          <span>Rate: {collectionRate}%</span>
          <span className="text-[10px] text-[var(--ink-faint)]">{totalEntriesCount} bills</span>
        </div>
      </div>

      {/* 2. Total Pending Due Card */}
      <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-[var(--stamp-red)] transition-all">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          <span>Pending Dues</span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono font-bold text-xl sm:text-2xl lg:text-3xl text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
          {formatINR(totalDue)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-2 pt-2 border-t border-[var(--line)]">
          <span>{totalDue > 0 ? 'Action required' : 'All clear'}</span>
          <span className="text-[10px] text-[var(--ink-faint)]">{totalDue > 0 ? 'Unpaid balance' : 'Zero dues'}</span>
        </div>
      </div>

      {/* 3. Security Deposits / Advance Held */}
      <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-500 transition-all">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          <span>Advance Held</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono font-bold text-xl sm:text-2xl lg:text-3xl text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
          {formatINR(totalAdvance)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] font-mono mt-2 pt-2 border-t border-[var(--line)]">
          <span>Security deposit</span>
          <span className="text-[10px] text-[var(--ink-faint)]">Refundable</span>
        </div>
      </div>

      {/* 4. Occupancy Rate Card */}
      <div className="bg-[var(--card)] border border-[var(--line-strong)] rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-[var(--primary)] transition-all">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          <span>Occupancy</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono font-bold text-xl sm:text-2xl lg:text-3xl text-[var(--ink)] mt-2 tracking-tight">
          {occupiedRooms} / {totalRooms}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] font-mono mt-2 pt-2 border-t border-[var(--line)]">
          <span>{totalRooms > 0 ? `${Math.round((occupiedRooms / totalRooms) * 100)}% occupied` : 'No rooms'}</span>
          <span className="text-[10px] text-[var(--ink-faint)]">{totalRooms - occupiedRooms} vacant</span>
        </div>
      </div>

    </div>
  );
};
