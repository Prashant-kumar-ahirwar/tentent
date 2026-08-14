import React, { useState } from 'react';
import { KirayaRoom, KirayaEntry, getBillAmount, formatINR } from '../types';
import { X, MessageCircle, Copy, Printer, Check, ShieldCheck } from 'lucide-react';

interface BillReceiptModalProps {
  room: KirayaRoom;
  entry: KirayaEntry;
  rate: number;
  onClose: () => void;
}

export const BillReceiptModal: React.FC<BillReceiptModalProps> = ({
  room,
  entry,
  rate,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const bAmt = getBillAmount(entry);
  const paid = Number(entry.paid) || 0;
  const rem = Math.max(bAmt - paid, 0);
  const tenant = room.tenant;
  const tenantName = tenant?.name || 'Tenant';

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

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
  const roundNote = isRounded ? `Raw total ₹${Number(entry.total || 0).toFixed(2)} rounded up to nearest ₹10` : '';

  // Extract phone digits for WhatsApp
  const rawMobile = room.tenant?.mobile || '';
  const firstPhoneMatch = rawMobile.match(/\d{10}/);
  const phoneDigits = firstPhoneMatch ? firstPhoneMatch[0] : '';

  // Tenant-safe receipt message
  const buildBillText = (): string => {
    const lines: string[] = [];
    lines.push(`📜 *RENT & UTILITY RECEIPT* 📜`);
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
  };

  const handleShareWhatsApp = () => {
    const text = buildBillText();
    const phone = phoneDigits ? `91${phoneDigits}` : '';
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const text = buildBillText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--line-strong)] rounded-xl shadow-2xl p-4 sm:p-5 overflow-hidden my-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1 rounded-md text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tenant View Guarantee */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Tenant-Safe View: unit rate & private formulas hidden</span>
        </div>

        {/* Printable Receipt Area */}
        <div 
          id="bill-print-area" 
          className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 relative overflow-hidden shadow-2xs"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--primary)] font-semibold mb-0.5">
            Rent & Utility Receipt
          </p>
          <h3 className="font-bold text-xl text-[var(--ink)] tracking-tight">
            {room.name}
          </h3>
          <p className="text-[11px] text-[var(--ink-soft)] mb-3">
            Generated {todayFormatted}
          </p>

          {/* Meta */}
          <div className={`grid ${entry.dueDate ? 'grid-cols-4' : 'grid-cols-3'} gap-2 py-2 border-y border-dashed border-[var(--line-strong)] mb-3 text-xs`}>
            <div>
              <span className="block text-[9.5px] uppercase font-mono text-[var(--ink-soft)]">
                Tenant
              </span>
              <strong className="text-[var(--ink)] font-semibold truncate block" title={tenantName}>
                {tenantName}
              </strong>
            </div>

            <div>
              <span className="block text-[9.5px] uppercase font-mono text-[var(--ink-soft)]">
                Month
              </span>
              <strong className="text-[var(--ink)] font-semibold truncate block">
                {entry.month}
              </strong>
            </div>

            <div>
              <span className="block text-[9.5px] uppercase font-mono text-[var(--ink-soft)]">
                Date
              </span>
              <strong className="text-[var(--ink)] font-semibold font-mono truncate block">
                {dateStr}
              </strong>
            </div>

            {entry.dueDate && (
              <div>
                <span className="block text-[9.5px] uppercase font-mono text-[var(--primary)] font-bold">
                  Due Date
                </span>
                <strong className="text-[var(--primary)] font-semibold font-mono truncate block">
                  {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(entry.dueDate + 'T00:00:00'))}
                </strong>
              </div>
            )}
          </div>

          {/* Itemized Lines */}
          <div className="space-y-1.5 mb-3 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--ink)]">Room Rent</span>
              <span className="font-mono font-bold text-[var(--ink)]">{formatINR(entry.rent)}</span>
            </div>

            {Number(entry.elec) > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--ink)]">
                  Electricity Charges{' '}
                  {entry.units !== undefined && entry.units > 0 && (
                    <span className="text-[10px] text-[var(--ink-soft)] font-mono">
                      ({entry.units} units)
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-[var(--ink)]">{formatINR(entry.elec)}</span>
              </div>
            )}

            {paid > 0 && (
              <div className="flex justify-between items-baseline text-emerald-500">
                <span>Already Paid</span>
                <span className="font-mono font-bold">−{formatINR(paid)}</span>
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="pt-2.5 mt-1 border-t border-[var(--ink)] flex justify-between items-baseline">
            <span className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider">
              {rem > 0 ? 'Amount Payable' : 'Status: Paid in Full'}
            </span>
            <span className={`font-bold text-2xl ${rem > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {formatINR(Math.max(rem, 0))}
            </span>
          </div>

          {roundNote && (
            <div className="text-[10px] text-[var(--ink-soft)] font-mono text-right mt-1">
              {roundNote}
            </div>
          )}

          <div className="text-[11px] text-[var(--ink-soft)] text-center mt-3 pt-2 border-t border-dashed border-[var(--line-strong)]">
            Please clear dues via UPI or cash. Thank you!
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 space-y-2">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
            id="share-whatsapp-btn"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share via WhatsApp {phoneDigits ? `(+91 ${phoneDigits})` : ''}</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopyText}
              className="flex-1 py-2 px-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-dark)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--line)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 py-2 px-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-dark)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--line)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
