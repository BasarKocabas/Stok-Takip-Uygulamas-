import React from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../lib/constants';

interface HeaderProps {
  title: string;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, setMobileMenuOpen }) => {
  const { user } = useAuth();

  return (
    <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-border bg-background shadow-sm">
      <button
        type="button"
        className="border-r border-border px-4 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <span className="sr-only">Menüyü aç</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex flex-1 justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <Link to="/profile" className="flex cursor-pointer items-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <div className="mr-3 flex flex-col text-right">
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
              <span className="text-xs text-muted-foreground">{user?.role ? USER_ROLES[user.role] : ''}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
