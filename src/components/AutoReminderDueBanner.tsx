import React, { useState, useEffect, useMemo } from 'react';
import { KirayaData, KirayaRoom, KirayaEntry, getBillAmount, formatINR } from '../types';
import { getWhatsAppReminderUrl, generateWhatsAppReminderText } from '../lib/ledgerUtils';
import { 
  Bell, 
  Clock, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  X, 
  Volume2, 
  Sparkles,
  Send,
  Calendar
} from 'lucide-react';

interface AutoReminderDueBannerProps {
  data: KirayaData;
  onSelectRoom?: (roomId: string) => void;
  onOpenAddEntry?: (roomId: string, entryId?: string) => void;
}

export interface DueReminderItem {
  room: KirayaRoom;
  entry: KirayaEntry;
  dueDate: string;
  totalBill: number;
  paid: number;
  balanceDue: number;
  isToday: boolean;
  isOverdue: boolean;
}

export const AutoReminderDueBanner: React.FC<AutoReminderDueBannerProps> = ({
  data,
  onSelectRoom,
  onOpenAddEntry,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [remindedEntryIds, setRemindedEntryIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kirayabahi_reminded_entries');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Today formatted as YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Compute all unpaid entries due today or overdue
  const dueItems = useMemo<DueReminderItem[]>(() => {
    const list: DueReminderItem[] = [];

    data.rooms.forEach((room) => {
      room.entries.forEach((entry) => {
        if (!entry.dueDate) return;

        const bAmt = getBillAmount(entry);
        const paid = Number(entry.paid) || 0;
        const balance = Math.max(0, bAmt - paid);

        if (balance <= 0) return; // Already cleared

        const isToday = entry.dueDate === todayStr;
        const isOverdue = entry.dueDate < todayStr;

        if (isToday || isOverdue) {
          list.push({
            room,
            entry,
            dueDate: entry.dueDate,
            totalBill: bAmt,
            paid,
            balanceDue: balance,
            isToday,
            isOverdue,
          });
        }
      });
    });

    // Sort: Due today first, then most overdue
    return list.sort((a, b) => {
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [data, todayStr]);

  // Automated 8:00 AM Trigger Logic
  useEffect(() => {
    if (dueItems.length === 0) return;

    // Check if auto-notification was already sent today
    const lastNotifiedDate = localStorage.getItem('kirayabahi_last_auto_8am_notified');
    const now = new Date();
    const currentHour = now.getHours(); // 0 to 23
    const currentMinute = now.getMinutes();

    // Trigger auto-reminder if time is >= 8:00 AM and haven't notified today yet
    if (currentHour >= 8 && lastNotifiedDate !== todayStr) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const firstDue = dueItems[0];
          const count = dueItems.length;
          const tenantName = firstDue.room.tenant?.name || firstDue.room.name;
          
          new Notification('⏰ 8:00 AM Rent Due Reminder — Kiraya Bahi', {
            body: count === 1
              ? `${tenantName} has rent of ₹${firstDue.balanceDue.toLocaleString('en-IN')} due today! Click to send WhatsApp reminder.`
              : `${count} rooms have rent & electric bills due today (₹${dueItems.reduce((s, i) => s + i.balanceDue, 0).toLocaleString('en-IN')} pending)!`,
            icon: '/icon.png',
            tag: `kirayabahi-due-${todayStr}`,
          });

          localStorage.setItem('kirayabahi_last_auto_8am_notified', todayStr);
        } catch (err) {
          console.log('Notification trigger error:', err);
        }
      }
    }
  }, [dueItems, todayStr]);

  // Request browser notification permission
  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        if (res === 'granted') {
          setToastMessage('✅ 8:00 AM Due Date Notifications enabled!');
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }
  };

  const handleSendWhatsAppReminder = (item: DueReminderItem) => {
    const url = getWhatsAppReminderUrl(item.room, item.entry);
    window.open(url, '_blank');

    // Mark as reminded
    const updated = { ...remindedEntryIds, [item.entry.id]: true };
    setRemindedEntryIds(updated);
    try {
      localStorage.setItem('kirayabahi_reminded_entries', JSON.stringify(updated));
    } catch {}

    const tName = item.room.tenant?.name || item.room.name;
    setToastMessage(`WhatsApp reminder draft opened for ${tName} (Due: ${formatINR(item.balanceDue)})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (dueItems.length === 0 || isDismissed) {
    return null;
  }

  const todayCount = dueItems.filter(i => i.isToday).length;
  const overdueCount = dueItems.filter(i => i.isOverdue).length;
  const totalDueSum = dueItems.reduce((acc, i) => acc + i.balanceDue, 0);

  return (
    <div className="mx-3 sm:mx-6 mb-5">
      <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 shadow-sm relative overflow-hidden">
        
        {/* Decorative Top Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight">
                  ⏰ 8:00 AM Due Date Auto-Reminder
                </span>
                {todayCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[11px] font-bold">
                    {todayCount} Due Today
                  </span>
                )}
                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[11px] font-bold">
                    {overdueCount} Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                Total outstanding for due dates: <strong className="text-[var(--ink)] font-mono">{formatINR(totalDueSum)}</strong>. Clean WhatsApp reminders ready (Rent + Electric Bill + Amount to Pay).
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {notificationPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--card)] hover:bg-[var(--paper-dark)] border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Enable 8:00 AM browser push notifications"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Enable 8 AM Alerts</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
              title="Dismiss reminder banner for now"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Due Rooms List */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {dueItems.map((item) => {
            const isReminded = !!remindedEntryIds[item.entry.id];
            const tenantName = item.room.tenant?.name?.trim() || 'Tenant';

            let formattedDueDate = item.dueDate;
            try {
              formattedDueDate = new Intl.DateTimeFormat('en-IN', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(item.dueDate + 'T00:00:00'));
            } catch {}

            return (
              <div 
                key={item.entry.id}
                className="p-3 rounded-xl bg-[var(--card)] border border-amber-500/30 shadow-2xs flex flex-col justify-between gap-2.5 hover:border-amber-500/60 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white text-[10.5px] font-mono font-bold">
                        {item.room.name}
                      </span>
                      <span className="font-bold text-xs text-[var(--ink)] truncate">
                        {tenantName}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      item.isToday 
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.isToday ? 'Today' : `Due ${formattedDueDate}`}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between font-mono text-xs">
                    <span className="text-[var(--ink-soft)] text-[11px]">
                      Rent: ₹{item.entry.rent} {item.entry.elec ? `+ Elec: ₹${item.entry.elec}` : ''}
                    </span>
                    <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                      Due: {formatINR(item.balanceDue)}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Reminder Action Button */}
                <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectRoom && onSelectRoom(item.room.id)}
                    className="text-[11px] font-mono text-[var(--ink-soft)] hover:text-[var(--ink)] underline cursor-pointer"
                  >
                    View Room
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isReminded
                        ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title="Send WhatsApp payment reminder directly to tenant"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{isReminded ? 'Sent ✓ (Resend)' : 'Send WhatsApp'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback Toast in Banner */}
        {toastMessage && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
