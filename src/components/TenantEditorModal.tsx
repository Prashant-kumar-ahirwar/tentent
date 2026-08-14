import React, { useState } from 'react';
import { KirayaRoom, KirayaTenant, formatINR } from '../types';
import { X, Trash2, UserPlus, Phone, MapPin, CreditCard, User, Home, Zap } from 'lucide-react';

interface TenantEditorModalProps {
  room?: KirayaRoom | null;
  onSave: (room: KirayaRoom) => void;
  onDeleteRoom?: (roomId: string) => void;
  onClose: () => void;
}

export const TenantEditorModal: React.FC<TenantEditorModalProps> = ({
  room,
  onSave,
  onDeleteRoom,
  onClose,
}) => {
  const isEditing = !!room;

  // Form states
  const [roomName, setRoomName] = useState(room?.name || 'Room 1');
  const [lastMeter, setLastMeter] = useState<number>(room?.lastMeter || 0);
  
  const [name, setName] = useState(room?.tenant?.name || '');
  const [relationship, setRelationship] = useState(room?.tenant?.relationship || '');
  const [mobile, setMobile] = useState(room?.tenant?.mobile || '');
  const [aadhar, setAadhar] = useState(room?.tenant?.aadhar || '');
  const [voterId, setVoterId] = useState(room?.tenant?.voterId || '');
  const [address, setAddress] = useState(room?.tenant?.address || '');
  const [baseRent, setBaseRent] = useState<number>(room?.tenant?.baseRent || 2000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('Please enter a room name.');
      return;
    }

    const updatedTenant: KirayaTenant = {
      name: name.trim(),
      relationship: relationship.trim() || undefined,
      mobile: mobile.trim(),
      aadhar: aadhar.trim(),
      voterId: voterId.trim() || undefined,
      address: address.trim(),
      baseRent: Number(baseRent) || 0,
    };

    const updatedRoom: KirayaRoom = {
      id: room?.id || `room-${Date.now()}`,
      name: roomName.trim(),
      lastMeter: Number(lastMeter) || 0,
      tenant: updatedTenant,
      entries: room?.entries || [],
    };

    onSave(updatedRoom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--line-strong)] rounded-xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-strong)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[var(--ink)]">
                {isEditing ? 'Room & Tenant Details' : 'Add New Room'}
              </h3>
              <p className="text-xs text-[var(--ink-soft)]">
                Set room name, rent, and tenant information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-xs overflow-y-auto pr-1 flex-1">
          
          {/* Room Name & Base Rent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Room / Flat Name *
              </label>
              <div className="relative">
                <Home className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 1, Flat 101, Shop 2"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-sm text-[var(--ink)] font-semibold focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Base Monthly Rent (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={baseRent}
                  onChange={(e) => setBaseRent(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-sm text-[var(--ink)] font-mono font-bold focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Tenant Full Name & Parentage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Tenant Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Relationship / Guardian (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. s/o Ramesh Sharma"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Contact Numbers */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Mobile Number(s)
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Government IDs: Aadhar & Voter ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Aadhar Number (Optional)
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  placeholder="e.g. 1234 5678 9012"
                  value={aadhar}
                  onChange={(e) => setAadhar(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                Gov / Voter ID (Optional)
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  placeholder="e.g. ABC1234567"
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Permanent Hometown Address */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Permanent / Native Address (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--ink-soft)]" />
              <textarea
                rows={2}
                placeholder="e.g. House No. 12, Village/City, District, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>
          </div>

          {/* Last Recorded Sub-meter Reading */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
              Sub-Meter Baseline / Initial Reading (kWh)
            </label>
            <div className="relative">
              <Zap className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 0 or previous meter reading"
                value={lastMeter}
                onChange={(e) => setLastMeter(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--paper)] border border-[var(--line-strong)] rounded-md text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--line-strong)] gap-2 shrink-0">
            <div>
              {isEditing && onDeleteRoom && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete ${roomName} and all records? This cannot be undone.`)) {
                      onDeleteRoom(room!.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-xs font-mono font-semibold text-[var(--stamp-red)] hover:bg-rose-500/10 rounded-md border border-[var(--stamp-red)]/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Room</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-xs cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
