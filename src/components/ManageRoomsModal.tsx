import React, { useState } from 'react';
import { KirayaRoom, formatINR } from '../types';
import { X, Trash2, Edit3, Plus, Home, User, Zap, AlertTriangle } from 'lucide-react';

interface ManageRoomsModalProps {
  rooms: KirayaRoom[];
  activeRoomId: string;
  onSelectRoom: (id: string) => void;
  onOpenAddRoom: () => void;
  onEditRoom: (room: KirayaRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  onClose: () => void;
}

export const ManageRoomsModal: React.FC<ManageRoomsModalProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  onOpenAddRoom,
  onEditRoom,
  onDeleteRoom,
  onClose,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--line-strong)] rounded-xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--line-strong)] bg-[var(--paper-dark)]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[var(--ink)]">
                Manage Rooms ({rooms.length})
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                Add, edit details, or delete rental rooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-[var(--ink-soft)] text-xs">
              <p className="mb-3">No rooms added yet.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddRoom();
                }}
                className="px-4 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Room</span>
              </button>
            </div>
          ) : (
            rooms.map((room) => {
              const isSelected = room.id === activeRoomId;
              const isDeleting = confirmDeleteId === room.id;

              return (
                <div
                  key={room.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--paper-dark)]/60 shadow-xs'
                      : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--ink)]">
                          {room.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--primary)] text-white font-bold">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-[var(--ink-soft)] font-mono">
                          {room.entries.length} {room.entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-[var(--ink-soft)] mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <strong className="text-[var(--ink)] font-medium">
                            {room.tenant?.name || 'No tenant'}
                          </strong>
                        </span>
                        {room.tenant?.baseRent ? (
                          <span>Rent: <strong>{formatINR(room.tenant.baseRent)}</strong></span>
                        ) : null}
                        {room.lastMeter > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <Zap className="w-3 h-3" />
                            {room.lastMeter} kWh
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onSelectRoom(room.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-[var(--card)] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                        title="View Room Ledger"
                      >
                        Open
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onEditRoom(room);
                        }}
                        className="p-1.5 rounded text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
                        title="Edit Room & Tenant details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setConfirmDeleteId(room.id)}
                        className="p-1.5 rounded text-[var(--stamp-red)] hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Inline Prompt */}
                  {isDeleting && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-rose-500/30 bg-rose-500/5 -mx-3.5 -mb-3.5 p-3 rounded-b-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Delete {room.name} and all records?</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded text-xs font-mono text-[var(--ink-soft)] hover:bg-[var(--card)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onDeleteRoom(room.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--line-strong)] bg-[var(--paper-dark)]/40">
          <button
            onClick={() => {
              onClose();
              onOpenAddRoom();
            }}
            className="px-3.5 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
