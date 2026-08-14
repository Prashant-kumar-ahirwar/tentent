import React from 'react';
import { KirayaRoom, getRoomStatus, formatINR } from '../types';
import { Plus, Settings2, Home, User, Zap } from 'lucide-react';

interface RoomTabsProps {
  rooms: KirayaRoom[];
  activeRoomId: string;
  onSelectRoom: (id: string) => void;
  onOpenAddRoom: () => void;
  onOpenManageRooms?: () => void;
}

export const RoomTabs: React.FC<RoomTabsProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  onOpenAddRoom,
  onOpenManageRooms,
}) => {
  if (rooms.length === 0) {
    return (
      <div className="mb-6 p-6 rounded-2xl bg-[var(--card)] border border-dashed border-[var(--line-strong)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-[var(--primary)]">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--ink)]">No Rooms Created Yet</h3>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">Add your first rental room to start tracking rent, electricity meters, and dues.</p>
          </div>
        </div>
        <button
          onClick={onOpenAddRoom}
          className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add First Room</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Header bar with count & manage link */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold">
            Select Unit / Room
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--paper-dark)] text-[var(--ink-soft)] border border-[var(--line)]">
            {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenManageRooms && (
            <button
              onClick={onOpenManageRooms}
              className="text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[var(--paper-dark)]"
              title="Manage and reorder rooms"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Manage Units</span>
            </button>
          )}
          <button
            onClick={onOpenAddRoom}
            className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:opacity-80 cursor-pointer px-2.5 py-1 rounded-lg bg-[var(--primary-light)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Room Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x">
        {rooms.map((room) => {
          const isActive = room.id === activeRoomId;
          const status = getRoomStatus(room);
          
          let dotColor = 'bg-rose-500';
          let statusText = 'Pending';
          if (status === 'paid') {
            dotColor = 'bg-emerald-500';
            statusText = 'Paid';
          } else if (status === 'partial') {
            dotColor = 'bg-amber-500';
            statusText = 'Partial';
          }

          const tenantName = room.tenant && room.tenant.name.trim() 
            ? room.tenant.name.trim()
            : 'Vacant';

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`flex-shrink-0 snap-start px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 min-h-[46px] group ${
                isActive
                  ? 'bg-[var(--card)] text-[var(--ink)] font-bold border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/20'
                  : 'bg-[var(--card)]/60 text-[var(--ink-soft)] border-[var(--line-strong)] hover:text-[var(--ink)] hover:bg-[var(--card)] hover:border-[var(--line-strong)] shadow-2xs'
              }`}
            >
              {/* Status Indicator Dot */}
              <div className="relative flex items-center justify-center shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                {isActive && (
                  <span className={`absolute -inset-1 rounded-full ${dotColor} opacity-30 animate-ping`} />
                )}
              </div>

              {/* Room details */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--ink)] truncate max-w-[130px]">
                    {room.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--ink-soft)] truncate max-w-[140px]">
                  <span className="truncate">{tenantName}</span>
                  {room.tenant?.baseRent ? (
                    <span className="opacity-75">• {formatINR(room.tenant.baseRent)}</span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
