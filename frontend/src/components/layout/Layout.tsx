import React, { useState } from 'react';
import { Navigate, Outlet, useLocation, NavLink } from 'react-router-dom';
import { Menu, House, ClipboardList, PackageSearch, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { APP_NAME } from '../../lib/constants';

const getPageTitle = (pathname: string) => {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/work-orders')) return 'İş Emirleri';
  if (pathname.startsWith('/products')) return 'Ürünler';
  if (pathname.startsWith('/stock')) return 'Stok Hareketleri';
  if (pathname.startsWith('/users')) return 'Personel';
  if (pathname.startsWith('/reports')) return 'Raporlar';
  if (pathname.startsWith('/profile')) return 'Profil';
  if (pathname.startsWith('/settings')) return 'Ayarlar';
  return APP_NAME;
};

export const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const title = getPageTitle(location.pathname);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar for desktop & mobile drawer */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      
      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2 text-white">
            <img src="/izbeton-logo.png" alt="İzbeton" className="h-23 w-auto shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            title="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop Top Header */}
        <div className="hidden md:block">
          <Header title={title} setMobileMenuOpen={setMobileMenuOpen} />
        </div>
        
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Mobil alt tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-800 bg-slate-900 md:hidden" aria-label="Ana navigasyon">
        {[
          { path: '/', icon: House, label: 'Ana Sayfa' },
          { path: '/work-orders', icon: ClipboardList, label: 'İş Emirleri' },
          { path: '/products', icon: PackageSearch, label: 'Malzeme' },
          { path: '/stock-movements', icon: ArrowLeftRight, label: 'Stok' },
        ].map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${isActive ? 'text-blue-400' : 'text-slate-400'}`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Diğer menü seçeneklerini aç"
          aria-expanded={mobileMenuOpen}
          className="flex flex-col items-center gap-1 py-2 text-[11px] text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          Menü
        </button>
      </nav>
    </div>
  );
};
