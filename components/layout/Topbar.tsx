type Props = { crumb?: string; title: string; actions?: React.ReactNode };

export function Topbar({ crumb, title, actions }: Props) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-bg-0">
      <div>
        {crumb && <div className="text-xs">{crumb}</div>}
        <h1 className="text-base md:text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
