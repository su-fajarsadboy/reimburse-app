'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Copy, Check, X } from '@/components/icons';

type Key = { id: string; key_prefix: string; label: string | null; last_used_at: string | null; revoked_at: string | null; created_at: string };

export function ApiKeyManager({ tripId, initialKeys }: { tripId: string; initialKeys: Key[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [showGen, setShowGen] = useState(false);
  const [label, setLabel] = useState('');
  const [generated, setGenerated] = useState<{ id: string; plain: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function generate() {
    const r = await fetch(`/api/admin/trips/${tripId}/api-keys`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: label || undefined }),
    });
    const body = await r.json();
    if (body.success) {
      setGenerated({ id: body.data.id, plain: body.data.plain });
      setKeys(k => [{ id: body.data.id, key_prefix: body.data.key_prefix, label: body.data.label, last_used_at: null, revoked_at: null, created_at: new Date().toISOString() }, ...k]);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke key ini? Tidak bisa di-undo.')) return;
    await fetch(`/api/admin/trips/${tripId}/api-keys/${id}/revoke`, { method: 'POST' });
    setKeys(k => k.map(x => x.id === id ? { ...x, revoked_at: new Date().toISOString() } : x));
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm">{keys.filter(k => !k.revoked_at).length} key aktif</div>
        <Button onClick={() => { setLabel(''); setGenerated(null); setShowGen(true); }}>
          <Plus size={14} /> Generate Key
        </Button>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-sm">Belum ada API key.</div>
        ) : keys.map(k => (
          <div key={k.id} className="p-4 border-b border-border last:border-b-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="mono text-sm">{k.key_prefix}<span className="text-text-3">...</span></div>
              <div className="text-xs flex items-center gap-2 mt-1">
                {k.label && <span>{k.label}</span>}
                {k.label && <span>·</span>}
                <span>Dibuat {new Date(k.created_at).toLocaleDateString('id-ID')}</span>
                {k.last_used_at && <><span>·</span><span>Last used {new Date(k.last_used_at).toLocaleDateString('id-ID')}</span></>}
              </div>
            </div>
            {k.revoked_at ? (
              <span className="text-xs px-2 py-1 rounded bg-bg-3 text-text-3">Revoked</span>
            ) : (
              <>
                <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">Aktif</span>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => revoke(k.id)}>Revoke</Button>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showGen} onOpenChange={v => !v && setShowGen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate API Key</DialogTitle></DialogHeader>
          {!generated ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Label (opsional)</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="OpenCLAW prod" />
              </div>
              <Button onClick={generate} className="w-full">Generate</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-warm">⚠️ Simpan sekarang — tidak akan ditampilkan lagi</div>
              <div className="bg-bg-input border border-border rounded p-3 mono text-xs break-all">{generated.plain}</div>
              <div className="flex gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(generated.plain); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Tersalin' : 'Salin'}
                </Button>
                <Button variant="outline" onClick={() => { setShowGen(false); setGenerated(null); }}>Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
