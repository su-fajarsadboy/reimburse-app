'use client';
import { useState } from 'react';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { ArrowRight } from '@/components/icons';

type Participant = { id: string; name: string; color: string | null };

export function ParticipantEntry({ tripName, dates, participants, onPick }: {
  tripName: string;
  dates: string;
  participants: Participant[];
  onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-bg-1 border border-border rounded-lg p-6">
        <div className="text-xs flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>{tripName}</span>
          <span className="text-text-3">·</span>
          <span className="text-text-3">{dates}</span>
        </div>
        <h1 className="text-xl font-semibold mb-1">Halo, kamu yang mana?</h1>
        <p className="text-xs mb-5">Pilih nama untuk masuk. Tidak perlu password — pilihan disimpan di HP ini.</p>
        <div className="space-y-2 mb-5">
          {participants.map(p => (
            <button key={p.id} onClick={() => setPicked(p.id)}
              className={`w-full flex items-center gap-3 p-3 rounded border transition ${picked === p.id ? 'bg-primary-soft border-primary' : 'bg-bg-2 border-border hover:border-text-3'}`}>
              <Avatar name={p.name} color={p.color} size={32} />
              <span className="text-sm font-medium flex-1 text-left">{p.name}</span>
            </button>
          ))}
        </div>
        <Button className="w-full" disabled={!picked} onClick={() => picked && onPick(picked)}>
          {picked ? `Masuk sebagai ${participants.find(p => p.id === picked)?.name}` : 'Pilih nama dulu'}
          <ArrowRight size={14} />
        </Button>
        <div className="text-xs text-center mt-4 text-text-4">🔒 Hanya orang dengan link ini yang bisa akses</div>
      </div>
    </div>
  );
}
