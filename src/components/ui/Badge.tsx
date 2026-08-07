import clsx from 'clsx';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'danger' | 'warning' }) {
  const tones = {
    neutral: 'bg-mist text-ink',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-amber-500/15 text-amber-300',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
