'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Copy, Check, ArrowRight, ArrowLeft } from '@/components/icons';

type Step = 1 | 2 | 3;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participants, setParticipants] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setPart(i: number, v: string) {
    setParticipants(p => p.map((x, idx) => idx === i ? v : x));
  }
  function addPart() {
    if (participants.length >= 10) return;
    setParticipants(p => [...p, '']);
  }
  function removePart(i: number) {
    if (participants.length <= 2) return;
    setParticipants(p => p.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    const cleanParts = participants.map(p => p.trim()).filter(Boolean);
    const r = await fetch('/api/admin/trips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        trip: {
          name,
          location: location || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
        participants: cleanParts.map(name => ({ name })),
      }),
    });
    setSubmitting(false);
    const body = await r.json();
    if (!r.ok || !body.success) {
      setErr(body.error?.message ?? 'Gagal membuat trip');
      return;
    }
    setTripId(body.data.tripId);
    setShareToken(body.data.shareToken);
    setStep(3);
  }

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${shareToken}`
    : '';

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex items-center gap-2 ${s === step ? 'text-text-1' : 'text-text-3'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${s <= step ? 'bg-primary text-white' : 'bg-bg-2'}`}>{s}</div>
            <span className="text-sm">{s === 1 ? 'Detail' : s === 2 ? 'Peserta' : 'Bagikan'}</span>
            {s < 3 && <span className="mx-2 text-text-4">›</span>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama trip</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Camping Sentul" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Lokasi (opsional)</Label>
            <Input id="loc" value={location} onChange={e => setLocation(e.target.value)} placeholder="Camp Geulis Sentul" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sd">Mulai</Label>
              <Input id="sd" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed">Selesai</Label>
              <Input id="ed" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button disabled={!name.trim()} onClick={() => setStep(2)}>Lanjut <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-3">
          <div className="text-sm font-medium">Peserta ({participants.length})</div>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p} onChange={e => setPart(i, e.target.value)} placeholder={`Peserta ${i + 1}`} />
                {participants.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePart(i)}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addPart} disabled={participants.length >= 10}>
            <Plus size={14} /> Tambah peserta
          </Button>
          {err && <div className="text-sm text-danger">{err}</div>}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={14} /> Kembali</Button>
            <Button onClick={submit}
              disabled={submitting || participants.filter(p => p.trim()).length < 2}>
              {submitting ? 'Membuat…' : 'Buat Trip'}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && tripId && shareToken && (
        <div className="bg-bg-1 border border-border rounded-lg p-5 space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Trip dibuat ✓</div>
            <div className="text-xs">Bagikan link ini ke grup peserta.</div>
          </div>
          <div className="bg-bg-input border border-border rounded p-3 font-mono text-sm break-all">{shareUrl}</div>
          <div className="flex gap-2">
            <Button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Tersalin' : 'Salin Link'}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}`)}>Ke Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
