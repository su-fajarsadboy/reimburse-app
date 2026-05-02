'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from './Avatar';
import { CATEGORIES } from '@/lib/validation/transaction';
import { formatRupiah, todayISO } from '@/lib/utils';
import { Camera, FileIcon, X, ArrowRight, ArrowLeft } from '@/components/icons';

const CATEGORY_LABEL: Record<string, string> = {
  transport: 'Transport', makan: 'Makan', logistik: 'Logistik',
  sewa_alat: 'Sewa Alat', tiket: 'Tiket', lain: 'Lain-lain',
};

type Participant = { id: string; name: string; color: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  participants: Participant[];
  postUrl: string;            // /api/web/trip/[token]/transactions OR /api/admin/...
  uploadUrl: string;          // /api/upload?token=... OR /api/upload?trip_id=...
  participantId?: string;     // pre-selected payer for peserta context
  extraHeaders?: Record<string, string>;
  onSuccess?: () => void;
};

export function NewTransactionModal({ open, onClose, participants, postUrl, uploadUrl, participantId, extraHeaders, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('makan');
  const [payer, setPayer] = useState<string>(participantId ?? participants[0]?.id ?? '');
  const [splitWith, setSplitWith] = useState<string[]>(participants.map(p => p.id));
  const [reimbursable, setReimbursable] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDescription(''); setAmount(''); setCategory('makan');
      setPayer(participantId ?? participants[0]?.id ?? '');
      setSplitWith(participants.map(p => p.id));
      setReimbursable(false); setReceiptUrl(null); setNotes(''); setErr(null);
    }
  }, [open, participantId, participants]);

  const amountNum = parseInt(amount || '0', 10);
  const share = splitWith.length > 0 ? Math.round(amountNum / splitWith.length) : 0;

  async function uploadFile(f: File) {
    setUploading(true);
    setErr(null);
    try {
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(f, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true });
      const fd = new FormData();
      fd.append('file', compressed, f.name);
      const r = await fetch(uploadUrl, { method: 'POST', body: fd });
      const body = await r.json();
      if (!r.ok || !body.success) throw new Error(body.error?.message ?? 'Upload gagal');
      setReceiptUrl(body.data.receipt_url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    const r = await fetch(postUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(extraHeaders ?? {}) },
      body: JSON.stringify({
        date: todayISO(),
        description, amount: amountNum, category,
        payer_id: payer, participant_ids: splitWith,
        is_reimbursable: reimbursable,
        receipt_url: receiptUrl ?? undefined,
        notes: notes || undefined,
      }),
    });
    setSubmitting(false);
    const body = await r.json();
    if (!r.ok || !body.success) {
      setErr(body.error?.message ?? 'Gagal menyimpan');
      return;
    }
    onSuccess?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pengeluaran</DialogTitle>
          <div className="text-xs text-text-3">Step {step} dari 2</div>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Cth. Bensin + tol" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah</Label>
              <div className="flex">
                <span className="px-3 flex items-center bg-bg-2 border border-r-0 border-border rounded-l text-text-3 mono">Rp</span>
                <Input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} className="rounded-l-none mono" placeholder="0" inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`p-2 text-xs rounded border transition ${category === c ? 'bg-primary-soft border-primary text-text-1' : 'bg-bg-2 border-border text-text-3 hover:text-text-1'}`}>
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto Struk <span className="text-text-3 text-xs ml-1">opsional</span></Label>
              {receiptUrl ? (
                <div className="flex items-center gap-2 p-2 bg-bg-2 border border-border rounded">
                  <span className="text-sm flex-1">Tersimpan ✓</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setReceiptUrl(null)}><X size={14} /></Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Camera size={14} /> {uploading ? '…' : 'Foto/File'}
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
                    onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </div>
              )}
            </div>
            {err && <div className="text-sm text-danger">{err}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Batal</Button>
              <Button disabled={!description || !amount} onClick={() => setStep(2)}>Lanjut <ArrowRight size={14} /></Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Yang bayar</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {participants.map(p => (
                  <button key={p.id} type="button" onClick={() => setPayer(p.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded border transition ${payer === p.id ? 'bg-primary-soft border-primary' : 'bg-bg-2 border-border'}`}>
                    <Avatar name={p.name} color={p.color} size={26} />
                    <span className="text-[10px] truncate w-full text-center">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dibagi dengan <span className="text-xs text-text-3">{splitWith.length} orang · per orang ≈ Rp {formatRupiah(share)}</span></Label>
              <div className="bg-bg-input border border-border rounded p-1.5 space-y-1">
                {participants.map(p => {
                  const checked = splitWith.includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer ${checked ? 'bg-bg-2' : ''}`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setSplitWith(s => s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id])} />
                      <Avatar name={p.name} color={p.color} size={22} />
                      <span className="text-sm flex-1">{p.name}</span>
                      {checked && <span className="text-xs mono text-text-3">Rp {formatRupiah(share)}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
            <label className={`block p-3 rounded border cursor-pointer ${reimbursable ? 'bg-warm-soft border-warm' : 'bg-bg-2 border-border'}`}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={reimbursable} onChange={e => setReimbursable(e.target.checked)} />
                <div>
                  <div className="text-sm font-medium">Tandai untuk reimburse kantor</div>
                  <div className="text-xs">Akan masuk ke laporan export.</div>
                </div>
              </div>
            </label>
            <div className="space-y-1.5">
              <Label>Catatan <span className="text-xs text-text-3">opsional</span></Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detail tambahan…" />
            </div>
            {err && <div className="text-sm text-danger">{err}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={14} /> Kembali</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan'}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
