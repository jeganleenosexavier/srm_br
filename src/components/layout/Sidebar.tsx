'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { NAV_ITEMS } from '@/lib/constants';
import type { NavItem } from '@/lib/constants';
import { useState } from 'react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  role?: string;
  personId?: string | null;
}

export default function Sidebar({ collapsed = false, onToggle, role = 'admin', personId }: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Skills', 'Compliance']));

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Filter nav items based on role
  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.hideForRoles?.includes(role)) return false;
    return true;
  }).map((item): NavItem => {
    if ('children' in item && item.children) {
      const filteredChildren = item.children.filter(
        (child) => !child.hideForRoles?.includes(role)
      );
      if (filteredChildren.length === 0) return { ...item, children: undefined, href: '/' } as unknown as NavItem;
      return { ...item, children: filteredChildren };
    }
    return item;
  });

  // Build dynamic items: My Profile (for intern/mentor), My Interns (for mentor)
  const dynamicItems: { label: string; href: string; position: 'after-dashboard' }[] = [];

  if ((role === 'intern' || role === 'mentor') && personId) {
    dynamicItems.push({ label: 'My Profile', href: `/people/${personId}`, position: 'after-dashboard' });
  }
  if (role === 'mentor') {
    dynamicItems.push({ label: 'My Interns', href: '/people', position: 'after-dashboard' });
  }

  const renderLink = (href: string, label: string, key: string) => {
    if (collapsed) {
      return (
        <Link
          key={key}
          href={href}
          title={label}
          className={clsx(
            'flex items-center justify-center p-2.5 rounded-lg mb-0.5 transition-colors',
            isActive(href)
              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
          )}
        >
          <span className="text-xs font-bold">{label.slice(0, 2)}</span>
        </Link>
      );
    }

    return (
      <Link
        key={key}
        href={href}
        className={clsx(
          'flex items-center px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
          isActive(href)
            ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-medium'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <aside className={clsx(
      'fixed left-0 top-0 z-40 h-screen bg-[var(--primary)] text-white flex flex-col transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--primary)] font-bold text-sm flex-shrink-0">
          BR
        </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-sm leading-tight">Beau Roi</div>
            <div className="text-[10px] text-white/60 leading-tight">Talent Hub</div>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto text-white/50 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={clsx('w-4 h-4 transition-transform', collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {filteredItems.map((item, idx) => {
          // After Dashboard, insert dynamic items
          const insertDynamic = idx === 0;

          const elements: React.ReactNode[] = [];

          if ('children' in item && item.children) {
            const isExpanded = expandedGroups.has(item.label);
            const childActive = item.children.some((c) => isActive(c.href));

            if (collapsed) {
              const firstChild = item.children[0];
              elements.push(
                <Link
                  key={item.label}
                  href={firstChild.href}
                  title={item.label}
                  className={clsx(
                    'flex items-center justify-center p-2.5 rounded-lg mb-0.5 transition-colors',
                    childActive
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span className="text-xs font-bold">{item.label.slice(0, 2)}</span>
                </Link>
              );
            } else {
              elements.push(
                <div key={item.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      childActive ? 'bg-white/10 text-[var(--accent)]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{item.label}</span>
                    <svg
                      className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            'block px-3 py-1.5 rounded-md text-sm transition-colors',
                            isActive(child.href)
                              ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-medium'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          } else {
            const href = 'href' in item ? item.href! : '/';
            // For mentor, rename "People" to "My Interns" — but People is hidden for mentor via dynamicItems
            elements.push(renderLink(href, item.label, href));
          }

          if (insertDynamic) {
            return [
              ...elements,
              ...dynamicItems.map((d) => renderLink(d.href, d.label, `dynamic-${d.label}`)),
            ];
          }

          return elements;
        })}
      </nav>

      {/* Footer */}
      <div className={clsx(
        'px-3 py-3 border-t border-white/10 text-[10px] text-white/40',
        collapsed && 'text-center'
      )}>
        {collapsed ? 'v1' : 'Beau Roi Talent Hub · v1.0'}
      </div>
    </aside>
  );
}
