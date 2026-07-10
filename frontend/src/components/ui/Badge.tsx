import clsx from 'clsx';

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'brand' | 'green' | 'red' | 'amber' | 'violet';
  className?: string;
}) {
  const map: Record<string, string> = {
    default: 'bg-slate-800 text-slate-300',
    brand: 'bg-brand-900/40 text-brand-300 border-brand-700/40',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
    red: 'bg-rose-900/40 text-rose-300 border-rose-700/40',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
    violet: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-transparent',
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
