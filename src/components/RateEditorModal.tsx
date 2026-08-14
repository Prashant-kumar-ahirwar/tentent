import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';

interface RateEditorModalProps {
  currentRate: number;
  onSave: (newRate: number) => void;
  onClose: () => void;
}

export const RateEditorModal: React.FC<RateEditorModalProps> = ({
  currentRate,
  onSave,
  onClose,
}) => {
  const [rate, setRate] = useState<number>(currentRate || 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rate <= 0) {
      alert('Please enter a valid rate per unit.');
      return;
    }
    onSave(rate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
      <div className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--line-strong)] rounded-xl shadow-2xl p-5 overflow-hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-strong)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[var(--ink)]">
              Electricity Tariff Rate
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Rate Per Unit (₹ / kWh)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] font-bold">₹</span>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-sm text-[var(--ink)] font-mono font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <p className="text-[11px] text-[var(--ink-soft)] mt-1.5">
              Default rate automatically multiplied with electricity sub-meter units.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line-strong)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold text-[var(--ink-soft)] hover:bg-[var(--paper-dark)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-xs cursor-pointer"
            >
              Save Rate
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
