import clsx from 'clsx';

interface StatusBadgeProps {
  level: 'green' | 'amber' | 'red' | 'grey';
  label?: string;
  size?: 'sm' | 'md';
}

const COLORS = {
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  grey: 'bg-gray-100 text-gray-500 border-gray-200',
};

const DOT_COLORS = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  grey: 'bg-gray-400',
};

export default function StatusBadge({ level, label, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium capitalize',
        COLORS[level],
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', DOT_COLORS[level])} />
      {label || level}
    </span>
  );
}
