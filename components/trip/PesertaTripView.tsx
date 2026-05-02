'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ParticipantEntry } from './ParticipantEntry';
import { TransactionList } from './TransactionList';
import { TripStatsGrid } from './TripStatsGrid';
import { NewTransactionModal } from './NewTransactionModal';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';

type Participant = { id: string; name: string; color: string | null };
type Tx = { id: string; date: string; time: string | null; description: string; amount: number; category: string; payer_id: string; is_reimbursable: boolean; receipt_url: string | null };

export function PesertaTripView({ trip, participants, transactions }: {
  trip: { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: 'active' | 'closed'; share_token: string };
  participants: Participant[];
  transactions: Tx[];
}) {
  const storageKey = `trip:${trip.share_token}:participantId`;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSelectedId(localStorage.getItem(storageKey));
  }, [storageKey]);

  function pickPart(id: string) {
    localStorage.setItem(storageKey, id);
    document.cookie = `participant_id_${trip.share_token}=${id}; SameSite=Strict; Max-Age=2592000; path=/`;
    setSelectedId(id);
  }
  function changeName() {
    localStorage.removeItem(storageKey);
    setSelectedId(null);
  }

  if (trip.status === 'closed') {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
        <div className="bg-bg-1 border border-border rounded-lg p-5 mb-4">
          <div className="text-sm text-text-3">Trip · {trip.name}</div>
          <div className="text-base font-semibold">Trip sudah ditutup (read-only)</div>
        </div>
        <TripStatsGrid transactions={transactions} participantsCount={participants.length} />
        <div className="mt-4">
          <TransactionList transactions={transactions} participants={participants} />
        </div>
      </div>
    );
  }

  if (!selectedId) {
    const dates = trip.start_date && trip.end_date ? `${trip.start_date} → ${trip.end_date}` : '';
    return <ParticipantEntry tripName={trip.name} dates={dates} participants={participants} onPick={pickPart} />;
  }

  const me = participants.find(p => p.id === selectedId);

  return (
    <div className="min-h-screen pb-20">
      <div className="border-b border-border bg-bg-0 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-text-3">{trip.name}</div>
          <div className="text-sm font-semibold">Halo, {me?.name ?? '…'}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={changeName}>Ganti nama</Button>
      </div>
      <div className="p-4 space-y-4">
        <TripStatsGrid transactions={transactions} participantsCount={participants.length} />
        <TransactionList transactions={transactions} participants={participants} />
      </div>
      <button onClick={() => setShowNew(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg z-30">
        <Plus size={22} />
      </button>
      <NewTransactionModal
        open={showNew}
        onClose={() => setShowNew(false)}
        participants={participants}
        postUrl={`/api/web/trip/${trip.share_token}/transactions`}
        uploadUrl={`/api/upload?token=${trip.share_token}`}
        participantId={selectedId}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
