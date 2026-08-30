'use client';

import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon = '📭',
  title,
  message,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-gray-500 mb-4 max-w-sm">{message}</p>}
      {actionLabel && actionHref && (
        <button
          onClick={() => router.push(actionHref)}
          className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2c5282] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
