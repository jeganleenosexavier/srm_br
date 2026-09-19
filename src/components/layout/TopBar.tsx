'use client';

import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/lib/types';

interface TopBarProps {
  user: AuthUser | null;
  sidebarCollapsed?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--accent)] text-[var(--primary)]',
  mentor: 'bg-blue-100 text-blue-800',
  intern: 'bg-green-100 text-green-800',
};

export default function TopBar({ user, sidebarCollapsed }: TopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className={`fixed top-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-200 ${
      sidebarCollapsed ? 'left-16' : 'left-60'
    }`}>
      <h1 className="text-lg font-semibold text-[var(--primary)]">
        Beau Roi Talent Hub
      </h1>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              ROLE_COLORS[user.role] || ROLE_COLORS.intern
            }`}
          >
            {user.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
