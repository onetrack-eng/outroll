import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  // ink is a light color in this theme, so the primary fill pairs it with text-paper (dark),
  // not text-white — see tailwind.config.ts.
  primary: 'bg-ink text-paper hover:opacity-90 disabled:opacity-40',
  secondary: 'bg-mist text-ink border border-line hover:border-ink disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-mist disabled:opacity-50',
  danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 disabled:opacity-50',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        styles[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
