type Props = { name: string; color?: string | null; size?: number };

export function Avatar({ name, color, size = 28 }: Props) {
  const initial = name.trim().slice(0, 1).toUpperCase();
  const bg = color ?? 'oklch(0.6 0.04 250)';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium text-white shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {initial}
    </span>
  );
}
