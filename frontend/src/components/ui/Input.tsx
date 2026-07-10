import clsx from 'clsx';
import { InputHTMLAttributes } from 'react';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'h-9 w-full px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'h-9 w-full px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
