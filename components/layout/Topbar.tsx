import Link from 'next/link';
import { ArrowLeft } from '@/components/icons';
import { UserMenu } from './UserMenu';

type Props = {
  crumb?: string;
  /** When set, the crumb becomes a back-link to this href. */
  backHref?: string;
  title: string;
  actions?: React.ReactNode;
};

export function Topbar({ crumb, backHref, title, actions }: Props) {
  const crumbContent = crumb ? (
    backHref ? (
      <Link
        href={backHref}
        className="text-xs text-text-3 hover:text-text-1 inline-flex items-center gap-1 transition"
      >
        <ArrowLeft size={12} /> {crumb}
      </Link>
    ) : (
      <div className="text-xs text-text-3">{crumb}</div>
    )
  ) : null;

  return (
    <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border bg-bg-0">
      <div className="min-w-0 flex-1">
        {crumbContent}
        <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <UserMenu />
      </div>
    </header>
  );
}
