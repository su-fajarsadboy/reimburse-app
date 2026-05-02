'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from './Avatar';
import { Copy, Check, Plus, X } from '@/components/icons';

type Trip = { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: 'active' | 'closed'; share_token: string };
type Participant = { id: string; name: string; color: string | null };
type Role = 'manager' | 'approver';

export function TripSetupClient({ trip, participants, role = 'manager' }: { trip: Trip; participants: Participant[]; role?: Role }) {
  const [name, setName] = useState(trip.name);
  const [location, setLocation] = useState(trip.location ?? '');
  const [start, setStart] = useState(trip.start_date ?? '');
  const [end, setEnd] = useState(trip.end_date ?? '');
  const [savingDetail, setSavingDetail] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const router = useRouter();
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trip/${trip.share_token}` : '';

  async function saveDetail() {
    setSavingDetail(true);
    await fetch(`/api/admin/trips/${trip.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, location: location || undefined, start_date: start || undefined, end_date: end || undefined }),
    });
    setSavingDetail(false);
    router.refresh();
  }

  async function addPart() {
    if (!newPartName.trim()) return;
    await fetch(`/api/admin/trips/${trip.id}/participants`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newPartName.trim() }),
    });
    setNewPartName('');
    router.refresh();
  }

  async function removePart(pid: string) {
    if (!confirm('Hapus peserta ini?')) return;
    await fetch(`/api/admin/trips/${trip.id}/participants/${pid}`, { method: 'DELETE' });
    router.refresh();
  }

  async function closeTrip() {
    if (!confirm('Tutup trip? Semua API key akan otomatis di-revoke. Aksi ini tidak bisa di-undo.')) return;
    setClosing(true);
    await fetch(`/api/admin/trips/${trip.id}/close`, { method: 'POST' });
    setClosing(false);
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-4">
        <div className="text-sm font-medium">Detail Trip</div>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Nama</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Lokasi</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Mulai</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Selesai</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <Button onClick={saveDetail} disabled={savingDetail}>{savingDetail ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-3">
        <div className="text-sm font-medium">Peserta ({participants.length})</div>
        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2 bg-bg-2 rounded">
              <Avatar name={p.name} color={p.color} size={28} />
              <span className="flex-1 text-sm">{p.name}</span>
              <Button variant="ghost" size="icon" onClick={() => removePart(p.id)}><X size={14} /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Input value={newPartName} onChange={e => setNewPartName(e.target.value)} placeholder="Nama peserta baru" />
          <Button onClick={addPart}><Plus size={14} /></Button>
        </div>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-3">
        <div className="text-sm font-medium">Share Link</div>
        <div className="bg-bg-input border border-border rounded p-3 mono text-xs break-all">{shareUrl}</div>
        <Button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Tersalin' : 'Salin Link'}
        </Button>
      </div>

      {trip.status === 'active' && role === 'approver' && (
        <div className="bg-danger-soft border border-danger rounded-lg p-5 space-y-2">
          <div className="text-sm font-medium text-danger">Tutup Trip</div>
          <div className="text-xs">Setelah ditutup: trip jadi read-only, semua API key di-revoke, share link tampilkan halaman closed.</div>
          <Button variant="outline" className="text-danger border-danger" onClick={closeTrip} disabled={closing}>
            {closing ? 'Menutup…' : 'Tutup Trip'}
          </Button>
        </div>
      )}
      {trip.status === 'active' && role !== 'approver' && (
        <div className="bg-bg-1 border border-border rounded-lg p-5 text-xs text-text-3">
          Tutup Trip hanya bisa dilakukan oleh role <strong className="text-text-1">approver</strong>.
        </div>
      )}
    </div>
  );
}
