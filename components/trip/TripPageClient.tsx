'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';
import { NewTransactionModal } from './NewTransactionModal';

export function NewTxnButton({ tripId, participants }: {
  tripId: string;
  participants: Array<{ id: string; name: string; color: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={14} /> Catat Transaksi</Button>
      <NewTransactionModal
        open={open}
        onClose={() => setOpen(false)}
        participants={participants}
        postUrl={`/api/admin/trips/${tripId}/transactions`}
        uploadUrl={`/api/upload?trip_id=${tripId}`}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
