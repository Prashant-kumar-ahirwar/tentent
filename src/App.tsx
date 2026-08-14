import React, { useState, useEffect } from 'react';
import { KirayaData, KirayaRoom, KirayaEntry, AppTheme, formatINR } from './types';
import { getStoredKirayaData, saveStoredKirayaData, resetToCleanLedger } from './lib/storage';
import { Masthead } from './components/Masthead';
import { SummaryCover } from './components/SummaryCover';
import { MonthlyEarningsSummary } from './components/MonthlyEarningsSummary';
import { RoomTabs } from './components/RoomTabs';
import { PassbookPage } from './components/PassbookPage';
import { EntryModal } from './components/EntryModal';
import { TenantEditorModal } from './components/TenantEditorModal';
import { ManageRoomsModal } from './components/ManageRoomsModal';
import { BillReceiptModal } from './components/BillReceiptModal';
import { RateEditorModal } from './components/RateEditorModal';
import { AutoReminderDueBanner } from './components/AutoReminderDueBanner';
import { SettingsView } from './components/SettingsView';
import { BottomNav } from './components/BottomNav';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Application Data State
  const [data, setData] = useState<KirayaData>(() => getStoredKirayaData());
  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    const initial = getStoredKirayaData();
    return initial.activeRoom || (initial.rooms[0] ? initial.rooms[0].id : '');
  });

  // UI View state: 'dashboard' | 'settings' | 'analytics'
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'analytics'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ roomId: string; entry?: KirayaEntry | null } | null>(null);

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<KirayaRoom | null>(null);

  const [isManageRoomsModalOpen, setIsManageRoomsModalOpen] = useState(false);

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billTarget, setBillTarget] = useState<{ room: KirayaRoom; entry: KirayaEntry } | null>(null);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  // 2 Themes: 'light' | 'purple-blue'
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('kirayabahi_theme');
    if (saved === 'purple-blue' || saved === 'light') {
      return saved as AppTheme;
    }
    return 'light';
  });

  // Sync theme attribute to document
  useEffect(() => {
    localStorage.setItem('kirayabahi_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: AppTheme = theme === 'light' ? 'purple-blue' : 'light';
    setTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'purple-blue' ? 'Purple / Blue Night' : 'Clean Light'} theme`);
  };

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2500);
  };

  // Save data to localStorage whenever updated
  useEffect(() => {
    saveStoredKirayaData(data);
  }, [data]);

  // Ensure activeRoomId remains valid when rooms list changes
  useEffect(() => {
    if (data.rooms.length > 0) {
      const exists = data.rooms.some(r => r.id === activeRoomId);
      if (!exists) {
        setActiveRoomId(data.rooms[0].id);
      }
    } else {
      setActiveRoomId('');
    }
  }, [data.rooms, activeRoomId]);

  // Current active room
  const activeRoom = data.rooms.find(r => r.id === activeRoomId) || data.rooms[0] || null;

  // Handler: Select Room
  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setData(prev => ({ ...prev, activeRoom: roomId }));
  };

  // Handler: Open Add/Edit Entry
  const handleOpenAddEntry = (roomId?: string, entryId?: string) => {
    if (data.rooms.length === 0) {
      handleOpenAddRoom();
      showToast('Please add a room first.');
      return;
    }
    const targetRoomId = roomId || activeRoomId || data.rooms[0]?.id;
    const room = data.rooms.find(r => r.id === targetRoomId);
    if (!room) return;

    const entry = entryId ? room.entries.find(e => e.id === entryId) : null;
    setEditingEntry({ roomId: targetRoomId, entry });
    setIsEntryModalOpen(true);
  };

  // Handler: Save Entry
  const handleSaveEntry = (roomId: string, entry: KirayaEntry, newLastMeter?: number) => {
    setData(prev => {
      const nextRooms = prev.rooms.map(room => {
        if (room.id !== roomId) return room;

        const entryIndex = room.entries.findIndex(e => e.id === entry.id);
        let updatedEntries = [...room.entries];

        if (entryIndex >= 0) {
          updatedEntries[entryIndex] = entry;
        } else {
          updatedEntries.push(entry);
        }

        return {
          ...room,
          lastMeter: newLastMeter !== undefined ? newLastMeter : room.lastMeter,
          entries: updatedEntries,
        };
      });

      return { ...prev, rooms: nextRooms };
    });

    showToast(`Saved entry for ${entry.month}.`);
  };

  // Handler: Delete Entry
  const handleDeleteEntry = (roomId: string, entryId: string) => {
    setData(prev => {
      const nextRooms = prev.rooms.map(room => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          entries: room.entries.filter(e => e.id !== entryId),
        };
      });
      return { ...prev, rooms: nextRooms };
    });

    showToast('Entry removed.');
  };

  // Handler: Open Room Editor
  const handleOpenEditTenant = (room: KirayaRoom) => {
    setEditingRoom(room);
    setIsTenantModalOpen(true);
  };

  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setIsTenantModalOpen(true);
  };

  // Handler: Save Room (Add or Update)
  const handleSaveRoom = (updatedRoom: KirayaRoom) => {
    setData(prev => {
      const exists = prev.rooms.some(r => r.id === updatedRoom.id);
      let nextRooms: KirayaRoom[];

      if (exists) {
        nextRooms = prev.rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r);
      } else {
        nextRooms = [...prev.rooms, updatedRoom];
      }

      return {
        ...prev,
        rooms: nextRooms,
        activeRoom: updatedRoom.id,
      };
    });

    setActiveRoomId(updatedRoom.id);
    showToast(`Saved ${updatedRoom.name}.`);
  };

  // Handler: Delete Room
  const handleDeleteRoom = (roomId: string) => {
    setData(prev => {
      const nextRooms = prev.rooms.filter(r => r.id !== roomId);
      const nextActive = nextRooms[0]?.id || '';
      setActiveRoomId(nextActive);
      return {
        ...prev,
        rooms: nextRooms,
        activeRoom: nextActive,
      };
    });

    showToast('Room deleted.');
  };

  // Handler: Open Bill Receipt
  const handleOpenBillReceipt = (roomId: string, entryId: string) => {
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) return;
    const entry = room.entries.find(e => e.id === entryId);
    if (!entry) return;

    setBillTarget({ room, entry });
    setIsBillModalOpen(true);
  };

  // Handler: Save Electricity Rate
  const handleSaveRate = (newRate: number) => {
    setData(prev => ({ ...prev, rate: newRate }));
    showToast(`Electricity tariff updated to ₹${newRate}/unit.`);
  };

  // Handler: Clean Reset (Empty slate for a fresh start)
  const handleResetToClean = () => {
    const clean = resetToCleanLedger();
    setData(clean);
    setActiveRoomId(clean.rooms[0]?.id || '');
    showToast('Reset to a clean empty ledger.');
  };

  // Handler: Import Data (JSON)
  const handleImportData = (imported: KirayaData) => {
    setData(imported);
    setActiveRoomId(imported.rooms[0]?.id || '');
    showToast('Data restored successfully.');
  };

  // Handler: Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Room', 'Tenant Name', 'Mobile', 'Month', 'Date', 'Due Date', 'Rent', 'Prev Meter', 'Curr Meter', 'Units', 'Elec Bill', 'Total Bill', 'Paid', 'Balance', 'Method', 'Note']
    ];

    data.rooms.forEach(room => {
      room.entries.forEach(entry => {
        const rawTotal = (entry.rent || 0) + (entry.elec || 0);
        const billAmt = rawTotal > 0 ? Math.ceil(rawTotal / 10) * 10 : 0;
        const balance = Math.max(0, billAmt - (entry.paid || 0));
        rows.push([
          `"${room.name.replace(/"/g, '""')}"`,
          `"${(room.tenant?.name || '').replace(/"/g, '""')}"`,
          `"${(room.tenant?.mobile || '').replace(/"/g, '""')}"`,
          `"${entry.month.replace(/"/g, '""')}"`,
          `"${entry.date || ''}"`,
          `"${entry.dueDate || ''}"`,
          String(entry.rent || 0),
          String(entry.prevMeter || ''),
          String(entry.meter || ''),
          String(entry.units || ''),
          String(entry.elec || 0),
          String(billAmt),
          String(entry.paid || 0),
          String(balance),
          `"${(entry.paymentMethod || '').replace(/"/g, '""')}"`,
          `"${(entry.note || '').replace(/"/g, '""')}"`
        ]);
      });
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KirayaBahi_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported ledger CSV.');
  };

  return (
    <div className="min-h-screen pb-20 md:pb-12 font-sans bg-[var(--paper)] text-[var(--ink)] antialiased transition-colors duration-200">
      
      {/* Top Sticky Header */}
      <Masthead
        data={data}
        theme={theme}
        activeView={activeView}
        onChangeView={setActiveView}
        onToggleTheme={toggleTheme}
        onOpenRateEditor={() => setIsRateModalOpen(true)}
        onOpenAddRoom={handleOpenAddRoom}
        onOpenAddEntry={() => handleOpenAddEntry()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Responsive Canvas (Fluid max-w-7xl on Desktop, Tablet & Mobile) */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        
        {/* Main Dashboard View */}
        {activeView === 'dashboard' && (
          <div>
            {/* ⏰ 8:00 AM Due Date Auto-Reminder Banner */}
            <AutoReminderDueBanner
              data={data}
              onSelectRoom={handleSelectRoom}
              onOpenAddEntry={handleOpenAddEntry}
            />

            {/* Quick Metrics Cards */}
            <SummaryCover data={data} />

            {/* Monthly Revenue & Collection Analytics */}
            <MonthlyEarningsSummary 
              data={data} 
              onSelectRoom={handleSelectRoom} 
            />

            {/* Room Selector Navigation */}
            <RoomTabs
              rooms={data.rooms}
              activeRoomId={activeRoomId}
              onSelectRoom={handleSelectRoom}
              onOpenAddRoom={handleOpenAddRoom}
              onOpenManageRooms={() => setIsManageRoomsModalOpen(true)}
            />

            {/* Active Room Passbook Card & Entries Table */}
            {activeRoom ? (
              <PassbookPage
                room={activeRoom}
                defaultRate={data.rate}
                onEditTenant={handleOpenEditTenant}
                onOpenAddEntry={handleOpenAddEntry}
                onOpenBillReceipt={handleOpenBillReceipt}
                onDeleteEntry={handleDeleteEntry}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="p-12 text-center text-xs text-[var(--ink-soft)] bg-[var(--card)] rounded-2xl border border-[var(--line-strong)]">
                <p className="mb-3 text-sm font-semibold text-[var(--ink)]">No rooms created yet.</p>
                <button
                  onClick={handleOpenAddRoom}
                  className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  + Add First Rental Unit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className="pt-2 max-w-4xl mx-auto">
            <SettingsView
              data={data}
              theme={theme}
              onSelectTheme={(t) => {
                setTheme(t);
                showToast(`Switched to ${t === 'purple-blue' ? 'Purple / Blue Night' : 'Light'} theme`);
              }}
              onOpenRateEditor={() => setIsRateModalOpen(true)}
              onOpenAddRoom={handleOpenAddRoom}
              onEditRoom={handleOpenEditTenant}
              onDeleteRoom={handleDeleteRoom}
              onResetToClean={handleResetToClean}
              onImportData={handleImportData}
              onExportCSV={handleExportCSV}
            />
          </div>
        )}

      </main>

      {/* Bottom Navigation & Mobile Quick Add Button */}
      <BottomNav
        activeView={activeView === 'settings' ? 'settings' : 'dashboard'}
        onChangeView={(v) => setActiveView(v)}
        onOpenAddEntry={() => handleOpenAddEntry()}
      />

      {/* Modals */}
      {isEntryModalOpen && editingEntry && (
        <EntryModal
          room={data.rooms.find(r => r.id === editingEntry.roomId) || activeRoom!}
          entry={editingEntry.entry}
          currentRate={data.rate}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onClose={() => {
            setIsEntryModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {isTenantModalOpen && (
        <TenantEditorModal
          room={editingRoom}
          onSave={handleSaveRoom}
          onDeleteRoom={handleDeleteRoom}
          onClose={() => {
            setIsTenantModalOpen(false);
            setEditingRoom(null);
          }}
        />
      )}

      {isManageRoomsModalOpen && (
        <ManageRoomsModal
          rooms={data.rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onOpenAddRoom={handleOpenAddRoom}
          onEditRoom={handleOpenEditTenant}
          onDeleteRoom={handleDeleteRoom}
          onClose={() => setIsManageRoomsModalOpen(false)}
        />
      )}

      {isBillModalOpen && billTarget && (
        <BillReceiptModal
          room={billTarget.room}
          entry={billTarget.entry}
          rate={data.rate}
          onClose={() => {
            setIsBillModalOpen(false);
            setBillTarget(null);
          }}
        />
      )}

      {isRateModalOpen && (
        <RateEditorModal
          currentRate={data.rate}
          onSave={handleSaveRate}
          onClose={() => setIsRateModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-[var(--card)] text-[var(--ink)] text-xs font-semibold rounded-full shadow-2xl border border-[var(--line-strong)] animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
