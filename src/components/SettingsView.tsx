import React, { useRef, useState, useEffect } from 'react';
import { KirayaData, formatINR, AppTheme, KirayaRoom } from '../types';
import { 
  Zap, 
  Download, 
  Upload, 
  Trash2, 
  Home, 
  Plus, 
  Sun, 
  Sparkles, 
  Check, 
  Database,
  FileSpreadsheet,
  Edit3,
  Bell,
  Clock,
  MessageCircle,
  CheckCircle2
} from 'lucide-react';

interface SettingsViewProps {
  data: KirayaData;
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onOpenRateEditor: () => void;
  onOpenAddRoom: () => void;
  onEditRoom: (room: KirayaRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  onResetToClean: () => void;
  onImportData: (imported: KirayaData) => void;
  onExportCSV: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  theme,
  onSelectTheme,
  onOpenRateEditor,
  onOpenAddRoom,
  onEditRoom,
  onDeleteRoom,
  onResetToClean,
  onImportData,
  onExportCSV,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto 8:00 AM Reminder Setting State
  const [autoReminderEnabled, setAutoReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem('kirayabahi_auto_remind_8am') !== 'false';
  });

  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem('kirayabahi_reminder_time') || '08:00';
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [testSent, setTestSent] = useState(false);

  const handleToggleAutoReminder = (enabled: boolean) => {
    setAutoReminderEnabled(enabled);
    localStorage.setItem('kirayabahi_auto_remind_8am', enabled ? 'true' : 'false');
  };

  const handleChangeReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('kirayabahi_reminder_time', time);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ 8:00 AM Rent Due Reminder Test', {
        body: 'Namaste Landlord ji! This is a test reminder for Kiraya Bahi auto-reminders at 8:00 AM.',
        icon: '/icon.png',
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } else {
      handleRequestNotificationPermission();
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KirayaBahi_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && Array.isArray(parsed.rooms)) {
          onImportData(parsed);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mx-3 sm:mx-6 mb-12 space-y-6">
      
      {/* ---------- 1. Design Theme (2 Themes: Light vs Purple/Blue) ---------- */}
      <section className="bg-[var(--card)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="font-bold text-base text-[var(--ink)]">
              Design Theme
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--paper-dark)] text-[var(--ink)] border border-[var(--line-strong)]">
            Active: {theme === 'purple-blue' ? 'Purple / Blue' : 'Light'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => onSelectTheme('light')}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
              theme === 'light'
                ? 'border-[var(--primary)] bg-white text-slate-900 shadow-xs ring-2 ring-[var(--primary)]/30'
                : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm">Light Theme</span>
              </div>
              {theme === 'light' && (
                <span className="w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-soft)] leading-snug">
              Clean, crisp modern neutral white layout with high contrast slate typography
            </p>
          </button>

          {/* Purple / Blue Theme Card */}
          <button
            type="button"
            onClick={() => onSelectTheme('purple-blue')}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
              theme === 'purple-blue'
                ? 'border-purple-500 bg-[#12182E] text-white shadow-xs ring-2 ring-purple-500/40'
                : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm">Purple / Blue Theme</span>
              </div>
              {theme === 'purple-blue' && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-soft)] leading-snug">
              Deep cosmic dark navy canvas with vibrant neon indigo, purple & electric blue highlights
            </p>
          </button>
        </div>
      </section>

      {/* ---------- 2. Room Management (Add & Delete Multiple Rooms) ---------- */}
      <section className="bg-[var(--card)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="font-bold text-base text-[var(--ink)]">
              Rooms & Tenants ({data.rooms.length})
            </h3>
          </div>
          <button
            onClick={onOpenAddRoom}
            className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room</span>
          </button>
        </div>

        {data.rooms.length === 0 ? (
          <p className="text-xs text-[var(--ink-soft)] py-2">No rooms configured. Click "Add Room" to create one.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {data.rooms.map((room) => (
              <div key={room.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-xs sm:text-sm text-[var(--ink)]">
                    {room.name}
                  </div>
                  <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-2 mt-0.5">
                    <span>Tenant: <strong className="text-[var(--ink)] font-medium">{room.tenant?.name || 'Vacant'}</strong></span>
                    {room.tenant?.baseRent ? <span>• Rent: {formatINR(room.tenant.baseRent)}</span> : null}
                    <span>• {room.entries.length} {room.entries.length === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditRoom(room)}
                    className="p-1.5 rounded-md border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
                    title="Edit Room Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${room.name} and all its entries? This cannot be undone.`)) {
                        onDeleteRoom(room.id);
                      }
                    }}
                    className="p-1.5 rounded-md border border-[var(--line-strong)] text-[var(--stamp-red)] hover:bg-rose-500/10 cursor-pointer"
                    title="Delete Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- 3. Electricity Rate Setting ---------- */}
      <section className="bg-[var(--card)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--ink)]">
                Electricity Sub-Meter Rate
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                Current default calculation rate: <strong className="text-[var(--ink)]">₹{data.rate}/kWh (unit)</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onOpenRateEditor}
            className="px-3.5 py-2 rounded-md border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--primary)] transition-colors cursor-pointer shadow-2xs"
          >
            Change Rate
          </button>
        </div>
      </section>

      {/* ---------- 4. Automated 8:00 AM Due Date Reminders ---------- */}
      <section className="bg-[var(--card)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--ink)]">
                ⏰ Auto-Reminder on Due Date (8:00 AM)
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                Automatically alerts and formats WhatsApp payment drafts on due dates at 8:00 AM
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoReminderEnabled}
              onChange={(e) => handleToggleAutoReminder(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--line-strong)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="pt-3 border-t border-[var(--line)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Preferred Schedule Time */}
            <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
              <span className="font-bold text-[var(--ink)] block mb-1">Reminder Trigger Time</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleChangeReminderTime(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--card)] font-mono text-xs font-semibold text-[var(--ink)] focus:outline-hidden focus:border-[var(--primary)]"
                />
                <span className="text-[11px] text-[var(--ink-soft)]">(Default: 08:00 AM)</span>
              </div>
            </div>

            {/* Browser Alert Permission */}
            <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between">
              <div>
                <span className="font-bold text-[var(--ink)] block mb-1">Push / Web Notifications</span>
                <span className="text-[11px] text-[var(--ink-soft)]">
                  Status: {notificationPermission === 'granted' ? '✅ Enabled' : notificationPermission === 'denied' ? '❌ Blocked in browser' : '⚠️ Permission needed'}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className="px-2.5 py-1 rounded-md bg-[var(--primary)] text-white text-[11px] font-semibold hover:bg-[var(--primary-hover)] cursor-pointer"
                  >
                    Enable Notifications
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="px-2.5 py-1 rounded-md border border-[var(--line-strong)] bg-[var(--card)] text-[var(--ink)] text-[11px] font-semibold hover:bg-[var(--paper-dark)] cursor-pointer"
                  >
                    {testSent ? '✓ Sent Test Alert' : 'Send Test 8 AM Alert'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Format Note */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <strong className="font-semibold block text-emerald-900 dark:text-emerald-200">Simplified WhatsApp Bill & Reminder Format</strong>
              <p className="text-[11px] opacity-90 mt-0.5">
                WhatsApp messages omit technical meter readings and directly specify: <strong>Room Rent + Electric Bill + Total Amount to Pay</strong> with simple UPI/Cash payment instructions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 5. Data Backup, Export & Clean Reset ---------- */}
      <section className="bg-[var(--card)] border border-[var(--line-strong)] rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="font-bold text-base text-[var(--ink)]">
            Data Backup & Reset
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Export JSON Backup */}
          <button
            onClick={handleExportJSON}
            className="p-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-dark)] text-left transition-colors flex items-center gap-2.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <div>
              <div className="font-bold text-xs text-[var(--ink)]">Backup JSON</div>
              <div className="text-[10px] text-[var(--ink-soft)]">Save all data locally</div>
            </div>
          </button>

          {/* Export CSV Ledger */}
          <button
            onClick={onExportCSV}
            className="p-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-dark)] text-left transition-colors flex items-center gap-2.5 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-bold text-xs text-[var(--ink)]">Export CSV</div>
              <div className="text-[10px] text-[var(--ink-soft)]">Open in Excel / Sheets</div>
            </div>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-dark)] text-left transition-colors flex items-center gap-2.5 cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="font-bold text-xs text-[var(--ink)]">Restore Data</div>
              <div className="text-[10px] text-[var(--ink-soft)]">Import backup file</div>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Clean Blank Reset Action */}
        <div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="font-bold text-xs text-rose-600 dark:text-rose-400">
              Clear All Data (Clean Slate)
            </div>
            <div className="text-[11px] text-[var(--ink-soft)]">
              Erase all current rooms & entries and start fresh
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset and start clean? This will erase all local entries.')) {
                onResetToClean();
              }
            }}
            className="px-3 py-1.5 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Reset to Clean Ledger
          </button>
        </div>
      </section>

    </div>
  );
};
