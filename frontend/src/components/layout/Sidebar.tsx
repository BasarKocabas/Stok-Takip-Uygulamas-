import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  House, 
  ClipboardList, 
  PackageSearch, 
  ArrowLeftRight, 
  Users, 
  ChartColumn, 
  LogOut, 
  PanelLeftClose, 
  PanelLeftOpen, 
  CircleUserRound, 
  Settings,
  X,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, APP_NAME, APP_COMPANY } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useThemeCustom } from '../../context/ThemeContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const navItems = [
  { name: 'Ana Sayfa', path: '/', icon: House },
  { name: 'İş Emirleri', path: '/work-orders', icon: ClipboardList },
  { name: 'Malzeme Takip', path: '/products', icon: PackageSearch },
  { name: 'Stok Hareketleri', path: '/stock-movements', icon: ArrowLeftRight },
  { name: 'Ekipmanlar', path: '/equipment', icon: Wrench },
  { name: 'Personel', path: '/users', icon: Users, role: ['admin', 'manager'] },
  { name: 'İstatistikler & Raporlar', path: '/reports', icon: ChartColumn, role: ['admin', 'manager'] },
  { name: 'Profil', path: '/profile', icon: CircleUserRound },
  { name: 'Ayarlar', path: '/settings', icon: Settings },
];

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../lib/api';

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { data: summary } = useQuery({ queryKey: ['dashboardSummary'], queryFn: dashboardApi.summary });
  const { theme, toggle } = useThemeCustom();

  const renderNav = () => (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
      {navItems.map((item) => {
        if (item.role && !item.role.includes(user?.role || '')) return null;
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                isActive
                  ? 'bg-blue-600 text-white shadow shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.name}</span>}
            {item.path === '/stock-movements' && user?.role === 'admin' && (summary?.pending_approvals || 0) > 0 && (
              <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {summary?.pending_approvals}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-slate-900 text-white shadow-2xl">
            <div className="mb-0 flex items-center justify-between px-4 pt-5">
              <div className="flex items-center gap-3 pl-1 text-white">
                <img src="/ansava.png" alt={APP_NAME} className="h-8 w-8 shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="font-display text-xl font-bold tracking-[0.14em]">{APP_NAME}</span>
              </div>
              <button
                type="button"
                className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 px-4">
              <div className="flex items-center justify-start pl-1 -mt-3">
                <img 
                  src="/izbeton-logo.png"
                  alt="İzbeton"
                  className="h-14 w-auto object-left object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                STOK SİSTEMİ
              </div>
            </div>

            {renderNav()}

            <div className="mt-auto p-3">
              <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-slate-200">
                    <CircleUserRound className="h-[18px] w-[18px] shrink-0 text-blue-400" />
                    <span className="truncate text-sm font-medium">{user?.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Çıkış
                  </button>
                </div>
              </div>
              <div className="px-2 pt-3 text-[11px] text-slate-500">v1.0.0 — {APP_COMPANY}</div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex md:sticky md:top-0 md:h-screen flex-col bg-slate-900 text-white transition-[width] duration-200 ease-in-out border-r border-slate-800 py-5 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.25)] motion-reduce:transition-none",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Top Header */}
        <div className="mb-0 flex items-center justify-between px-3">
          <div className="flex items-center gap-3 pl-1 text-white">
            <img src="/ansava.png" alt={APP_NAME} className="h-8 w-8 shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            {!collapsed && <span className="font-display text-xl font-bold tracking-[0.14em]">{APP_NAME}</span>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        {/* Brand Logo Card */}
        {!collapsed && (
          <div className="mb-8 px-4">
            <div className="flex items-center justify-start pl-1 -mt-4">
              <img 
                src="/izbeton-logo.png"
                alt="İzbeton"
                className="h-20 w-auto object-left object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              İZBAN Monitor
            </div>
          </div>
        )}

        {/* Navigation Items */}
        {renderNav()}

        {/* User Profile / Footer Panel */}
        <div className="mt-auto px-3">
          {!collapsed ? (
            <div className="rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-slate-200">
                  <CircleUserRound className="h-[18px] w-[18px] shrink-0 text-blue-400" />
                  <span className="truncate text-sm font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  title="Çıkış yap"
                >
                  <LogOut className="h-3.5 w-3.5" /> Çıkış
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {user?.role ? USER_ROLES[user.role] : 'Personel'}
                </span>
                <div className="flex gap-2 items-center">
                  <button onClick={toggle} title="Temayı Değiştir" className="rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    {theme === 'dark' ? '☀️' : '🌙'}
                  </button>
                  <span className="text-slate-500">v1.0.0</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={logout}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                title="Çıkış yap"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
