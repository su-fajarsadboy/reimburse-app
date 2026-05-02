import { notFound } from 'next/navigation';
import { loadPesertaTrip } from '@/lib/services/peserta-loader';
import { PesertaTripView } from '@/components/trip/PesertaTripView';

export default async function PesertaPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const data = await loadPesertaTrip(shareToken);
  if (!data) notFound();
  return <PesertaTripView trip={data.trip as never} participants={data.participants} transactions={data.transactions as never} />;
}
