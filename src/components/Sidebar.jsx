import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="1.5" width="6" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="7.5" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="9.5" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  pipeline: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="3" r="1.6" fill="currentColor" />
      <circle cx="10" cy="8" r="1.6" fill="currentColor" />
      <circle cx="6" cy="13" r="1.6" fill="currentColor" />
    </svg>
  ),
  followups: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8l2.6 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  analytics: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14V2M2 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.5 11.5V8M8 11.5V5M11.5 11.5V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.8v1.5M8 12.7v1.5M14.2 8h-1.5M3.3 8H1.8M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1M12.2 12.2l-1.1-1.1M4.9 4.9L3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings' }
];

const AVATAR_COLORS = ['#6D5DFB', '#F59E0B', '#22C55E', '#EC4899', '#06B6D4', '#EF4444'];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function Sidebar({ page, onNavigate, followUpCount }) {
  const { profile, isAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={
        'flex flex-col bg-bg border-r border-border h-screen sticky top-0 flex-shrink-0 transition-all ' +
        (collapsed ? 'w-[68px]' : 'w-[248px]')
      }
    >
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-display font-bold text-white flex-shrink-0">
          F
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm leading-tight truncate">FAR Tech &amp; Developers</div>
            <div className="text-[10.5px] text-muted truncate">Upwork Bid Pipeline</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1 mt-2">
        {NAV_ITEMS.map((item) => {
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              title={item.label}
              className={
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ' +
                (active ? 'bg-accent text-white' : 'text-muted hover:text-white hover:bg-surface2')
              }
            >
              <span className="flex-shrink-0">{NAV_ICONS[item.key]}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {item.key === 'followups' && followUpCount > 0 && !collapsed && (
                <span className="ml-auto text-[10px] font-bold bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {followUpCount > 99 ? '99+' : followUpCount}
                </span>
              )}
              {item.key === 'followups' && followUpCount > 0 && collapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-border pt-3">
        {profile && (
          <div className={'flex items-center gap-2.5 px-2 py-2 rounded-xl ' + (collapsed ? 'justify-center' : '')}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor(profile.full_name || profile.id) }}
            >
              {initials(profile.full_name)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate">{profile.full_name}</div>
                <div className="text-[10.5px] text-muted truncate">{isAdmin ? 'Admin' : profile.position || profile.role}</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={signOut}
          className={
            'w-full mt-1 text-left px-2 py-2 rounded-xl text-xs font-medium text-muted hover:text-danger hover:bg-danger/10 transition-colors ' +
            (collapsed ? 'text-center' : '')
          }
        >
          {collapsed ? '⏻' : 'Sign Out'}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full mt-1 text-left px-2 py-2 rounded-xl text-xs font-medium text-muted hover:text-white hover:bg-surface2 transition-colors"
        >
          {collapsed ? '»' : '« Collapse'}
        </button>
      </div>
    </aside>
  );
}
