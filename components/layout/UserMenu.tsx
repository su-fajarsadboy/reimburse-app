'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, ChevronDown } from '@/components/icons';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (status === 'loading') {
    return <div className="h-8 w-24 rounded-md bg-bg-2 animate-pulse" />;
  }
  if (!session?.user) return null;

  const email = session.user.email ?? '';
  const role = (session.user as typeof session.user & { role?: 'manager' | 'approver' }).role ?? 'manager';
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-2 transition text-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-soft text-primary font-medium text-xs">
          {initial}
        </span>
        <span className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-xs text-text-1 truncate max-w-[140px]">{email}</span>
          <span className="text-[10px] uppercase tracking-wider text-text-3">{role}</span>
        </span>
        <ChevronDown size={14} className="text-text-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-bg-1 border border-border rounded-md shadow-lg py-1 z-50"
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="text-xs text-text-3">Login sebagai</div>
            <div className="text-sm text-text-1 truncate">{email}</div>
            <div className="text-[10px] uppercase tracking-wider text-text-3 mt-0.5">
              Role: {role}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-2 hover:bg-bg-2 hover:text-text-1 transition"
            role="menuitem"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
